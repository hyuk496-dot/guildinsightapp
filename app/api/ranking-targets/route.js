export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

async function requireUser() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      supabase: null,
      deny: NextResponse.json({ error: "인증 필요" }, { status: 401 }),
    };
  }
  return { supabase, user, deny: null };
}

function normalizeWeekKey(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  return s.split("T")[0].slice(0, 10);
}

export async function GET(request) {
  const { supabase, deny } = await requireUser();
  if (deny) return deny;

  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get("guild_id");
  const contentName = searchParams.get("content_name");
  const weekMonday = normalizeWeekKey(searchParams.get("week_monday"));

  if (!guildId) {
    return NextResponse.json({ error: "guild_id 필요" }, { status: 400 });
  }

  try {
    let q = supabase
      .from("guild_ranking_targets")
      .select("*")
      .eq("guild_id", Number(guildId))
      .order("week_monday", { ascending: false })
      .limit(30);

    if (contentName) q = q.eq("content_name", contentName);
    if (weekMonday) q = q.eq("week_monday", weekMonday);

    const { data, error } = await q;
    if (error) throw error;

    // 단일 조회(주차 지정)면 1건만 반환
    if (weekMonday) {
      return NextResponse.json(data?.[0] || null, { status: 200 });
    }
    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    console.error("ranking-targets GET 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { supabase, deny } = await requireUser();
  if (deny) return deny;

  try {
    const body = await request.json();
    const guild_id = body?.guild_id;
    const content_name = String(body?.content_name || "").trim();
    const week_monday = normalizeWeekKey(body?.week_monday);
    const target_score = Number(body?.target_score || 0);
    const target_rank =
      body?.target_rank == null || body?.target_rank === ""
        ? null
        : Number(body.target_rank);

    if (!guild_id || !content_name || !week_monday) {
      return NextResponse.json(
        { error: "guild_id, content_name, week_monday가 필요합니다." },
        { status: 400 }
      );
    }

    const payload = {
      guild_id: Number(guild_id),
      content_name,
      week_monday,
      target_score: Math.max(0, Math.round(target_score)),
      target_rank:
        target_rank != null && Number.isFinite(target_rank)
          ? Math.max(1, Math.round(target_rank))
          : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("guild_ranking_targets")
      .upsert(payload, { onConflict: "guild_id,content_name,week_monday" })
      .select()
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json(data || payload, { status: 201 });
  } catch (error) {
    console.error("ranking-targets POST 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { supabase, deny } = await requireUser();
  if (deny) return deny;

  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get("guild_id");
  const contentName = searchParams.get("content_name");
  const weekMonday = normalizeWeekKey(searchParams.get("week_monday"));

  if (!guildId || !contentName || !weekMonday) {
    return NextResponse.json(
      { error: "guild_id, content_name, week_monday가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase
      .from("guild_ranking_targets")
      .delete()
      .eq("guild_id", Number(guildId))
      .eq("content_name", contentName)
      .eq("week_monday", weekMonday);
    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("ranking-targets DELETE 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

