export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

async function getSupabaseOrDeny() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, deny: NextResponse.json({ error: "인증 필요" }, { status: 401 }) };
  return { supabase, deny: null };
}

import {
  weekMondayKey,
  weekMondayUtcIso,
  aggregateWeeklyHistory,
} from "@/lib/week-utils";
import {
  isMissingColumnError,
  isMissingUniqueConstraint,
  markWeekMondayMissing,
  markWeekMondaySupported,
  getWeekMondaySupport,
} from "@/lib/scores-schema";

export async function GET(request) {
  const { supabase, deny } = await getSupabaseOrDeny();
  if (deny) return deny;
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("member_id");
  const contentName = searchParams.get("content_name");

  try {
    let query = supabase.from("scores").select("*");
    if (memberId && contentName) {
      query = query
        .eq("member_id", Number(memberId))
        .eq("content_name", contentName);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (memberId && contentName) {
      return NextResponse.json(aggregateWeeklyHistory(data || []), { status: 200 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("점수 데이터 조회 에러:", error);
    return NextResponse.json([], { status: 500 });
  }
}

async function manualUpsertLegacy(supabase, baseRow) {
  const { data: existing, error: findErr } = await supabase
    .from("scores")
    .select("id")
    .eq("member_id", baseRow.member_id)
    .eq("content_name", baseRow.content_name)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) throw findErr;

  if (existing?.id) {
    const upd = await supabase
      .from("scores")
      .update(baseRow)
      .eq("id", existing.id)
      .select()
      .single();
    if (upd.error) throw upd.error;
    return upd.data;
  }

  const ins = await supabase.from("scores").insert(baseRow).select().single();
  if (ins.error) throw ins.error;
  return ins.data;
}

export async function POST(request) {
  const { supabase, deny } = await getSupabaseOrDeny();
  if (deny) return deny;
  try {
    const body = await request.json();
    const {
      member_id,
      guild_id,
      nick,
      job,
      content_name,
      score,
      prev_score,
      created_at,
      recorded_at,
    } = body;

    if (!member_id || !guild_id) {
      return NextResponse.json({ error: "필수 데이터가 누락되었습니다." }, { status: 400 });
    }

    const recordDate = created_at || recorded_at;
    const week_monday = weekMondayKey(recordDate ? new Date(recordDate) : new Date());
    const createdAtIso = recordDate
      ? new Date(recordDate).toISOString()
      : weekMondayUtcIso(week_monday);

    const baseRow = {
      member_id: Number(member_id),
      guild_id: Number(guild_id),
      nick,
      job,
      content_name,
      score: Number(score),
      prev_score: Number(prev_score || 0),
    };

    if (getWeekMondaySupport() !== false) {
      const fullRow = { ...baseRow, week_monday, created_at: createdAtIso };
      const upsertRes = await supabase
        .from("scores")
        .upsert(fullRow, { onConflict: "member_id,content_name,week_monday" })
        .select()
        .maybeSingle();

      if (!upsertRes.error) {
        markWeekMondaySupported();
        return NextResponse.json(
          { ...upsertRes.data, week_monday, created_at: createdAtIso },
          { status: 201 }
        );
      }

      if (isMissingColumnError(upsertRes.error)) {
        console.warn(
          `[scores] 누락 컬럼 감지 → 레거시 스키마로 저장 (${upsertRes.error.message}). ` +
            "권장 마이그레이션: supabase/migrations/003_scores_full_schema.sql"
        );
        markWeekMondayMissing();
      } else if (isMissingUniqueConstraint(upsertRes.error)) {
        console.warn(
          "[scores] (member_id, content_name, week_monday) 유니크 인덱스 없음 → 수동 upsert"
        );
      } else {
        throw upsertRes.error;
      }
    }

    try {
      const saved = await manualUpsertLegacy(supabase, baseRow);
      return NextResponse.json({ ...saved, week_monday, created_at: createdAtIso }, { status: 201 });
    } catch (legacyErr) {
      if (isMissingColumnError(legacyErr)) {
        const stripped = { ...baseRow };
        if (isMissingColumnError(legacyErr) && /job/i.test(legacyErr.message || "")) {
          delete stripped.job;
        }
        if (isMissingColumnError(legacyErr) && /prev_score/i.test(legacyErr.message || "")) {
          delete stripped.prev_score;
        }
        const saved = await manualUpsertLegacy(supabase, stripped);
        return NextResponse.json(
          { ...saved, week_monday, created_at: createdAtIso },
          { status: 201 }
        );
      }
      throw legacyErr;
    }
  } catch (error) {
    console.error("서버 점수 처리 에러:", error);
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
      return NextResponse.json({ error: "id가 누락되었습니다." }, { status: 400 });
    }

    const { error } = await supabase.from("scores").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("점수 삭제 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
