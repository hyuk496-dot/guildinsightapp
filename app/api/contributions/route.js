export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { requireGuildOwner, requireMemberInGuild } from "@/lib/guild-access";
import { mergeGuildContribs } from "@/lib/contrib-utils";

async function getSupabaseOrDeny() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase: null, deny: NextResponse.json({ error: "인증 필요" }, { status: 401 }) };
  }
  return { supabase, deny: null };
}

function getWriteClient(userSupabase) {
  try {
    return getAdminSupabase();
  } catch {
    return userSupabase;
  }
}

async function loadScores(supabase) {
  const { data, error } = await supabase.from("scores").select("*");
  if (error) throw error;
  return data || [];
}

async function loadMembers(supabase, guildId) {
  let q = supabase.from("members").select("id,guild_id,nick,job");
  if (guildId) q = q.eq("guild_id", Number(guildId));
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function loadContributionRows(supabase, guildId = null) {
  const { data, error } = await supabase.from("contributions").select("*");
  if (error) {
    if (/contributions/i.test(error.message || "")) return [];
    throw error;
  }
  const rows = data || [];
  if (!guildId) return rows;
  return rows.filter((r) => String(r.guild_id) === String(guildId));
}

async function buildMergedGuildContribs(supabase, guildId) {
  const [scores, members, contribRows] = await Promise.all([
    loadScores(supabase),
    loadMembers(supabase, guildId),
    loadContributionRows(supabase, guildId),
  ]);
  return mergeGuildContribs({ members, scores, contribRows, guildId });
}

async function buildMergedAllGuildContribs(supabase) {
  const [scores, members, allContribs] = await Promise.all([
    loadScores(supabase),
    loadMembers(supabase),
    loadContributionRows(supabase),
  ]);

  const guildIds = [...new Set(members.map((m) => String(m.guild_id)))];
  const grouped = {};
  guildIds.forEach((gid) => {
    grouped[gid] = mergeGuildContribs({
      members: members.filter((m) => String(m.guild_id) === gid),
      scores,
      contribRows: allContribs.filter((r) => String(r.guild_id) === gid),
      guildId: gid,
    });
  });
  return grouped;
}

async function findContributionRow(writeClient, guildId, memberId) {
  const { data, error } = await writeClient
    .from("contributions")
    .select("*")
    .eq("guild_id", Number(guildId))
    .eq("member_id", Number(memberId))
    .maybeSingle();

  if (error?.message?.includes("contributions")) {
    return { row: null, tableMissing: true, error };
  }
  if (error) throw error;
  return { row: data, tableMissing: false, error: null };
}

export async function GET(request) {
  const { supabase, deny } = await getSupabaseOrDeny();
  if (deny) return deny;
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get("guild_id");

  try {
    if (guildId) {
      const list = await buildMergedGuildContribs(supabase, guildId);
      return NextResponse.json(list, { status: 200 });
    }
    const grouped = await buildMergedAllGuildContribs(supabase);
    return NextResponse.json(grouped, { status: 200 });
  } catch (error) {
    console.error("기여도 조회 에러:", error);
    return NextResponse.json(guildId ? [] : {}, { status: 500 });
  }
}

export async function PUT(request) {
  const { supabase, deny } = await getSupabaseOrDeny();
  if (deny) return deny;

  try {
    const { guild_id, member_id, nick, score, note } = await request.json();
    if (!member_id || !guild_id) {
      return NextResponse.json({ error: "필수 값 누락" }, { status: 400 });
    }
    if (!note?.trim()) {
      return NextResponse.json({ error: "수정 비고는 필수입니다." }, { status: 400 });
    }

    const num = parseInt(score, 10);
    if (isNaN(num)) {
      return NextResponse.json({ error: "점수 형식 오류" }, { status: 400 });
    }

    const ownerCheck = await requireGuildOwner(supabase, guild_id);
    if (!ownerCheck.ok) {
      return NextResponse.json(
        { error: ownerCheck.error },
        { status: ownerCheck.status }
      );
    }

    const memberCheck = await requireMemberInGuild(supabase, guild_id, member_id);
    if (!memberCheck.ok) {
      return NextResponse.json({ error: memberCheck.error }, { status: 400 });
    }

    const writeClient = getWriteClient(supabase);
    const { row: existing, tableMissing, error: findErr } = await findContributionRow(
      writeClient,
      guild_id,
      member_id
    );

    if (tableMissing) {
      return NextResponse.json(
        {
          error:
            "contributions 테이블이 없습니다. supabase/migrations/002_contributions.sql 실행 후 다시 시도하세요.",
        },
        { status: 400 }
      );
    }
    if (findErr) throw findErr;

    const prevScore = existing?.score ?? 0;
    const delta = num - prevScore;
    const historyEntry = {
      date: new Date().toLocaleDateString("ko-KR"),
      delta: delta >= 0 ? `+${delta}` : `${delta}`,
      note: note.trim(),
    };
    const history = [historyEntry, ...(existing?.history || [])];

    const payload = {
      guild_id: Number(guild_id),
      member_id: Number(member_id),
      nick: nick || memberCheck.member.nick || existing?.nick,
      score: num,
      history,
      updated_at: new Date().toISOString(),
    };

    const result = await writeClient
      .from("contributions")
      .upsert(payload, { onConflict: "guild_id,member_id" })
      .select()
      .single();

    if (result.error) {
      const msg = result.error.message || "";
      if (/row-level security/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              "기여도 저장 권한이 없습니다. 길드 소유자 계정인지 확인하고, Supabase에 009_contributions_rls_fix.sql 마이그레이션을 적용한 뒤 Vercel에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있는지 확인하세요.",
          },
          { status: 403 }
        );
      }
      throw result.error;
    }

    const list = await buildMergedGuildContribs(supabase, guild_id);

    return NextResponse.json(
      { row: result.data, list },
      { status: 200 }
    );
  } catch (error) {
    console.error("기여도 수정 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { supabase, deny } = await getSupabaseOrDeny();
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id 필요" }, { status: 400 });
    }

    const writeClient = getWriteClient(supabase);
    const { data: row, error: fetchErr } = await writeClient
      .from("contributions")
      .select("id, guild_id")
      .eq("id", Number(id))
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!row) {
      return NextResponse.json({ error: "기여도 행을 찾을 수 없습니다." }, { status: 404 });
    }

    const ownerCheck = await requireGuildOwner(supabase, row.guild_id);
    if (!ownerCheck.ok) {
      return NextResponse.json(
        { error: ownerCheck.error },
        { status: ownerCheck.status }
      );
    }

    const { error } = await writeClient.from("contributions").delete().eq("id", row.id);
    if (error) throw error;

    const list = await buildMergedGuildContribs(supabase, row.guild_id);

    return NextResponse.json({ success: true, list }, { status: 200 });
  } catch (error) {
    console.error("기여도 삭제 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
