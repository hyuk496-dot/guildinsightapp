export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { collectGuildReportContext } from "@/lib/report-context";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.");
    err.code = "MISSING_KEY";
    throw err;
  }
  return new OpenAI({ apiKey });
}

function clamp(s, max) {
  const v = String(s ?? "");
  if (v.length <= max) return v;
  return v.slice(0, Math.max(0, max - 1)) + "…";
}

function buildSystemPrompt() {
  return [
    "당신은 한국어 MMORPG 길드 운영 분석가이자 데이터 기반 Q&A 어시스턴트입니다.",
    "아래 컨텍스트(JSON)에 포함된 사실/수치만 근거로 답변하세요. 컨텍스트에 없는 숫자/주차/이름은 절대 지어내지 마세요.",
    "",
    "답변 규칙:",
    "- 질문이 '지난주/전주/저번 주'라면 컨텍스트의 최근 4주 중 마지막에서 2번째 주차를 의미합니다.",
    "- 질문이 '이번 주/이번주/금주'라면 최근 4주 중 마지막 주차를 의미합니다.",
    "- '최근 4주 추이' 질문에는 weekTotals를 표 형태(주차: 점수)로 간결하게 요약하고, 변화 포인트(증가/감소)를 설명하세요.",
    "- 숫자는 가능한 한 천 단위 콤마로 표기하세요.",
    "- 불확실하면 단정하지 말고, 컨텍스트에 없는 정보라고 말하세요.",
    "",
    "출력 형식:",
    "- 마크다운 기반의 짧고 명료한 한국어",
  ].join("\n");
}

function buildUserPrompt({ question, ctx, report }) {
  const payload = {
    guild: ctx.guild,
    contentFilter: ctx.contentFilter,
    weekTotals: ctx.weekTotals,
    summary: ctx.summary,
    // 현재 화면에 보여지는 리포트 본문(성과/MVP/개선/전략)도 참고 가능하게 주입
    report: report
      ? {
          title: report.title,
          date: report.date,
          content_filter: report.content_filter,
          summary: report.summary,
          sections: report.sections,
        }
      : null,
  };

  return [
    "## CONTEXT_JSON",
    JSON.stringify(payload, null, 2),
    "",
    "## QUESTION",
    question,
  ].join("\n");
}

export async function POST(request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const guildId = body?.guildId != null ? Number(body.guildId) : null;
  const reportId = body?.reportId != null ? Number(body.reportId) : null;
  const contentFilter = String(body?.contentFilter || "전체");
  const question = String(body?.question || "").trim();

  if (!guildId || !Number.isFinite(guildId)) {
    return NextResponse.json({ error: "guildId 필요" }, { status: 400 });
  }
  if (!question) {
    return NextResponse.json({ error: "question 필요" }, { status: 400 });
  }

  // RLS로 길드 접근 가능한지 검증 포함
  let ctx;
  try {
    ctx = await collectGuildReportContext(supabase, guildId, contentFilter);
  } catch (e) {
    return NextResponse.json({ error: e?.message || "컨텍스트 수집 실패" }, { status: 403 });
  }

  // 현재 선택된 리포트 본문도 함께 주입(가능하면)
  let report = null;
  if (reportId && Number.isFinite(reportId)) {
    const { data } = await supabase
      .from("gpt_reports")
      .select("id, guild_id, title, date, content_filter, summary, sections")
      .eq("id", reportId)
      .eq("guild_id", guildId)
      .maybeSingle();
    report = data || null;
  }

  const openai = getClient();
  const system = buildSystemPrompt();
  const userPrompt = buildUserPrompt({ question, ctx, report });

  // Streaming 응답 (text/plain)
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const resp = await openai.chat.completions.create({
          model: process.env.OPENAI_REPORT_MODEL || "gpt-4o-mini",
          temperature: 0.2,
          stream: true,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
        });

        for await (const chunk of resp) {
          const delta = chunk?.choices?.[0]?.delta?.content || "";
          if (delta) controller.enqueue(encoder.encode(delta));
        }

        controller.close();
      } catch (e) {
        const msg = clamp(e?.message || "답변 생성 실패", 300);
        controller.enqueue(encoder.encode(`\n\n[오류] ${msg}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

