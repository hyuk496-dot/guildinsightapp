export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { collectGuildReportContext } from "@/lib/report-context";
import { generateGuildReport, OpenAIReportError } from "@/lib/openai-report";
import { generateLocalReport } from "@/lib/local-report";
import { weekMondayKey } from "@/lib/week-utils";

const FALLBACK_CODES = new Set(["QUOTA_EXCEEDED", "RATE_LIMITED", "MISSING_KEY", "INVALID_KEY", "UPSTREAM_ERROR"]);

async function getSupabaseOrDeny() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, deny: NextResponse.json({ error: "인증 필요" }, { status: 401 }) };
  return { supabase, deny: null };
}

function reportsTableMissing(error) {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  const details = String(error.details || error.hint || "").toLowerCase();
  if (error.code === "42P01") return true;
  if (error.code === "PGRST205" || error.code === "PGRST204") return true;
  if (msg.includes("gpt_reports") && msg.includes("does not exist")) return true;
  if (msg.includes("relation") && msg.includes("gpt_reports")) return true;
  if (msg.includes("could not find the table") && msg.includes("gpt_reports")) return true;
  if (msg.includes("schema cache") && (msg.includes("gpt_reports") || details.includes("gpt_reports"))) return true;
  return false;
}

export async function GET(request) {
  const { supabase, deny } = await getSupabaseOrDeny();
  if (deny) return deny;

  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get("guild_id");
  const id = searchParams.get("id");

  try {
    if (id) {
      const { data, error } = await supabase
        .from("gpt_reports")
        .select("*")
        .eq("id", Number(id))
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json(data, { status: 200 });
    }

    let q = supabase.from("gpt_reports").select("*").order("created_at", { ascending: false });
    if (guildId) q = q.eq("guild_id", Number(guildId));
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    if (reportsTableMissing(error)) {
      return NextResponse.json(
        {
          error:
            "gpt_reports 테이블이 없습니다. supabase/migrations/004_gpt_reports.sql 실행 후 다시 시도하세요.",
          code: "TABLE_MISSING",
        },
        { status: 503 }
      );
    }
    console.error("리포트 조회 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { supabase, deny } = await getSupabaseOrDeny();
  if (deny) return deny;

  try {
    const body = await request.json();
    const { guild_id, content_filter = "전체", mode = "auto" } = body || {};
    if (!guild_id) {
      return NextResponse.json({ error: "guild_id 필요" }, { status: 400 });
    }

    // 본인 소유 길드인지 RLS 로 자동 검증 (다른 길드면 결과가 null → 404)
    const ctx = await collectGuildReportContext(supabase, guild_id, content_filter);

    let generated;
    let fallback = false;
    let fallbackReason = null;

    if (mode === "local") {
      generated = generateLocalReport(ctx);
      fallback = true;
      fallbackReason = "FORCED_LOCAL";
    } else {
      try {
        generated = await generateGuildReport(ctx);
      } catch (err) {
        if (err instanceof OpenAIReportError && FALLBACK_CODES.has(err.code)) {
          console.warn(`[reports] OpenAI ${err.code} → 로컬 fallback:`, err.message);
          generated = generateLocalReport(ctx);
          fallback = true;
          fallbackReason = err.code;
          generated.fallbackMessage = err.message;
        } else {
          throw err;
        }
      }
    }

    const today = new Date().toLocaleDateString("ko-KR");
    const weekKey = weekMondayKey();
    const weekLabel = ctx.weekLabel;

    const insertRow = {
      guild_id: Number(guild_id),
      guild_name: ctx.guild.name,
      title: generated.title,
      date: today,
      badge: fallback ? "Local" : "최신",
      content_filter,
      summary: generated.summary,
      sections: generated.sections,
      chips: generated.chips,
      metrics: {
        weekMonday: weekKey,
        weekLabel,
        currentTotal: ctx.summary.currentTotal,
        prevTotal: ctx.summary.prevTotal,
        delta: ctx.summary.delta,
        deltaPct: ctx.summary.deltaPct,
        participation: ctx.summary.participation,
        top5Share: ctx.summary.top5Share,
        mvp: ctx.mvp ? { nick: ctx.mvp.nick, score: ctx.mvp.currentScore } : null,
        fallback,
        fallbackReason,
      },
      model: generated.model,
      prompt_tokens: generated.usage?.prompt_tokens ?? null,
      completion_tokens: generated.usage?.completion_tokens ?? null,
    };

    const insertRes = await supabase.from("gpt_reports").insert(insertRow).select().single();
    if (insertRes.error) {
      if (reportsTableMissing(insertRes.error)) {
        return NextResponse.json(
          {
            error:
              "gpt_reports 테이블이 없습니다. supabase/migrations/004_gpt_reports.sql 실행 후 다시 시도하세요.",
            code: "TABLE_MISSING",
          },
          { status: 503 }
        );
      }
      throw insertRes.error;
    }

    if (!fallback) {
      await supabase
        .from("gpt_reports")
        .update({ badge: "" })
        .eq("guild_id", Number(guild_id))
        .neq("id", insertRes.data.id);
    }

    return NextResponse.json(
      {
        ...insertRes.data,
        fallback,
        fallbackReason,
        fallbackMessage: generated.fallbackMessage || null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("리포트 생성 에러:", error);
    if (error instanceof OpenAIReportError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { supabase, deny } = await getSupabaseOrDeny();
  if (deny) return deny;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

    const { error } = await supabase.from("gpt_reports").delete().eq("id", Number(id));
    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("리포트 삭제 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
