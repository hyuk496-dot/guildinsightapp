export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  buildContribsFromScores,
  groupContribsByGuildId,
  applyContribPercents,
} from "@/lib/contrib-utils";

async function getSupabaseOrDeny() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, deny: NextResponse.json({ error: "인증 필요" }, { status: 401 }) };
  return { supabase, deny: null };
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

async function loadFromScores(supabase, guildId) {
  const scores = await loadScores(supabase);
  if (guildId) {
    const members = await loadMembers(supabase, guildId);
    return buildContribsFromScores(scores, guildId, members);
  }
  const members = await loadMembers(supabase);
  const guildIds = [...new Set(members.map((m) => String(m.guild_id)))];
  const grouped = {};
  guildIds.forEach((gid) => {
    grouped[gid] = buildContribsFromScores(
      scores,
      gid,
      members.filter((m) => String(m.guild_id) === gid)
    );
  });
  return grouped;
}

export async function GET(request) {
  const { supabase, deny } = await getSupabaseOrDeny();
  if (deny) return deny;
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get("guild_id");

  try {
    const { data: contribRows, error: contribErr } = await supabase
      .from("contributions")
      .select("*");

    if (!contribErr && contribRows?.length > 0) {
      if (guildId) {
        const filtered = contribRows.filter(
          (r) => String(r.guild_id) === String(guildId)
        );
        return NextResponse.json(applyContribPercents(filtered), { status: 200 });
      }
      return NextResponse.json(groupContribsByGuildId(contribRows), { status: 200 });
    }

    const fromScores = await loadFromScores(supabase, guildId);
    return NextResponse.json(fromScores, { status: 200 });
  } catch (error) {
    console.error("기여도 조회 에러:", error);
    try {
      const fromScores = await loadFromScores(supabase, guildId);
      return NextResponse.json(fromScores, { status: 200 });
    } catch {
      return NextResponse.json(guildId ? [] : {}, { status: 500 });
    }
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

    const { data: existing, error: findErr } = await supabase
      .from("contributions")
      .select("*")
      .eq("guild_id", Number(guild_id))
      .eq("member_id", Number(member_id))
      .maybeSingle();

    if (findErr?.message?.includes("contributions")) {
      return NextResponse.json(
        { error: "contributions 테이블이 없습니다. supabase/migrations/002_contributions.sql 실행 후 다시 시도하세요." },
        { status: 400 }
      );
    }

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
      nick: nick || existing?.nick,
      score: num,
      history,
    };

    let result;
    if (existing?.id) {
      result = await supabase
        .from("contributions")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await supabase.from("contributions").insert([payload]).select().single();
    }

    if (result.error) throw result.error;

    const { data: all } = await supabase
      .from("contributions")
      .select("*")
      .eq("guild_id", Number(guild_id));

    return NextResponse.json(
      { row: result.data, list: applyContribPercents(all || []) },
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
    const { error } = await supabase.from("contributions").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("기여도 삭제 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
