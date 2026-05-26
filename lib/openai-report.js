import OpenAI from "openai";

const MODEL = process.env.OPENAI_REPORT_MODEL || "gpt-4o-mini";

export class OpenAIReportError extends Error {
  constructor(message, { code, status, cause } = {}) {
    super(message);
    this.name = "OpenAIReportError";
    this.code = code || "OPENAI_ERROR";
    this.status = status;
    if (cause) this.cause = cause;
  }
}

function classifyOpenAIError(err) {
  const status = err?.status || err?.response?.status;
  const innerCode = err?.code || err?.error?.code || err?.response?.data?.error?.code;
  const message = err?.message || err?.error?.message || "OpenAI 호출 실패";

  if (status === 401 || innerCode === "invalid_api_key") {
    return new OpenAIReportError(
      "OpenAI API Key가 유효하지 않습니다. .env.local의 OPENAI_API_KEY를 확인하세요.",
      { code: "INVALID_KEY", status: 401, cause: err }
    );
  }
  if (status === 429 && innerCode === "insufficient_quota") {
    return new OpenAIReportError(
      "OpenAI 사용량 한도(quota)를 초과했습니다. https://platform.openai.com/account/billing 에서 결제/크레딧 충전 후 다시 시도하세요.",
      { code: "QUOTA_EXCEEDED", status: 429, cause: err }
    );
  }
  if (status === 429) {
    return new OpenAIReportError(
      "OpenAI 요청이 일시적으로 한도(rate limit)에 도달했습니다. 잠시 후 다시 시도하세요.",
      { code: "RATE_LIMITED", status: 429, cause: err }
    );
  }
  if (status >= 500) {
    return new OpenAIReportError(
      "OpenAI 서버 오류로 리포트를 생성하지 못했습니다. 잠시 후 다시 시도하세요.",
      { code: "UPSTREAM_ERROR", status, cause: err }
    );
  }
  return new OpenAIReportError(message, { code: "OPENAI_ERROR", status, cause: err });
}

let client;
function getClient() {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIReportError(
      "OPENAI_API_KEY 환경변수가 설정되지 않았습니다. .env.local 확인 후 dev 서버 재시작.",
      { code: "MISSING_KEY", status: 500 }
    );
  }
  client = new OpenAI({ apiKey });
  return client;
}

const SYSTEM_PROMPT = `당신은 한국어 게임 길드 운영 분석가입니다.
주어진 길드 데이터(주간 점수 합계, 멤버별 기여도, 컨텐츠별 트렌드, 참여율)를 바탕으로
운영자가 즉시 활용할 수 있는 주간 리포트를 JSON으로 생성하세요.

중요:
- 사실(데이터)에 근거해서만 작성. 데이터에 없는 멤버 이름/숫자를 지어내지 마세요.
- 친근하고 명료한 한국어. 게임 운영 톤. 이모지 적절히 사용.
- 응답은 반드시 valid JSON. 다른 텍스트 금지.`;

const RESPONSE_SCHEMA_HINT = `{
  "title": "string — '4주차 주간 리포트' 같은 형식 + 길드명/컨텐츠 포함",
  "summary": "string — 2~4문장. 핵심 성과/이슈 요약",
  "sections": [
    { "title": "📊 성과 요약", "content": "..." },
    { "title": "🔥 MVP 분석", "content": "..." },
    { "title": "⚠️ 개선 필요", "content": "..." },
    { "title": "🎯 다음 주 전략", "content": "..." }
  ],
  "chips": ["짧은 키워드 4~6개. 예: 'MVP: 닉네임', '참여율 90%'"]
}`;

function buildUserPrompt(ctx) {
  const lines = [];
  lines.push(`## 길드 정보`);
  lines.push(`- 길드명: ${ctx.guild.name}`);
  lines.push(`- 게임: ${ctx.guild.game}`);
  lines.push(`- 등록 멤버 수: ${ctx.guild.memberCount}명`);
  lines.push(`- 분석 기준 컨텐츠: ${ctx.contentFilter}`);
  lines.push(`- 분석 기준 주차: ${ctx.weekLabel} (${ctx.weekMonday})`);
  lines.push("");

  lines.push(`## 주간 점수 추이 (최근 4주)`);
  ctx.weekTotals.forEach((w) => {
    lines.push(`- ${w.label}: ${w.total.toLocaleString()}점`);
  });
  lines.push("");

  lines.push(`## 이번 주 요약`);
  const s = ctx.summary;
  lines.push(`- 총합: ${s.currentTotal.toLocaleString()}점 (전주 ${s.prevTotal.toLocaleString()}, ${s.delta >= 0 ? "+" : ""}${s.delta}, ${s.deltaPct}%)`);
  lines.push(`- 참여율: ${s.participation}% (${s.activeMembers}/${s.totalMembers}명 점수 입력)`);
  lines.push(`- 상위 5명 점수 점유율: ${s.top5Share}%`);
  lines.push("");

  if (ctx.topMembers.length) {
    lines.push(`## 상위 기여자`);
    ctx.topMembers.forEach((m, i) => {
      lines.push(
        `${i + 1}. ${m.nick} (${m.job}) — ${m.currentScore.toLocaleString()}점 (전주 ${m.prevScore.toLocaleString()}, ${m.delta >= 0 ? "+" : ""}${m.delta})`
      );
    });
    lines.push("");
  }

  if (ctx.bottomMembers.length) {
    lines.push(`## 하위 기여자`);
    ctx.bottomMembers.forEach((m) => {
      lines.push(`- ${m.nick} (${m.job}) — ${m.currentScore.toLocaleString()}점`);
    });
    lines.push("");
  }

  if (ctx.lowParticipants.length) {
    lines.push(`## 점수 미입력 멤버 (이번 주)`);
    lines.push(ctx.lowParticipants.join(", "));
    lines.push("");
  }

  if (ctx.contentBreakdown.length) {
    lines.push(`## 컨텐츠별 점수 (이번 주 vs 전주)`);
    ctx.contentBreakdown.forEach((c) => {
      lines.push(
        `- ${c.content}: ${c.currentScore.toLocaleString()} (전주 ${c.prevScore.toLocaleString()}, ${c.delta >= 0 ? "+" : ""}${c.delta}, ${c.deltaPct}%)`
      );
    });
    lines.push("");
  }

  lines.push(`## 응답 형식`);
  lines.push("아래 JSON 스키마에 정확히 맞춰 응답하세요. 추가 텍스트 금지.");
  lines.push(RESPONSE_SCHEMA_HINT);

  return lines.join("\n");
}

function safeParse(text) {
  if (!text) throw new Error("OpenAI 응답이 비어 있습니다.");
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    throw new Error("OpenAI 응답을 JSON으로 파싱할 수 없습니다.");
  }
}

function normalizeReport(parsed, ctx) {
  const sections = Array.isArray(parsed.sections) ? parsed.sections : [];
  const chips = Array.isArray(parsed.chips) ? parsed.chips.slice(0, 8) : [];

  const safeSections = sections
    .filter((s) => s && typeof s.title === "string" && typeof s.content === "string")
    .slice(0, 8);

  return {
    title:
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : `${ctx.guild.name} 주간 리포트 (${ctx.weekLabel})`,
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "이번 주 요약 정보가 충분하지 않습니다.",
    sections: safeSections,
    chips,
  };
}

/**
 * 길드 컨텍스트 → OpenAI 호출 → 정규화된 리포트 객체
 * @returns {{ title, summary, sections, chips, model, usage }}
 */
export async function generateGuildReport(ctx) {
  let openai;
  try {
    openai = getClient();
  } catch (err) {
    if (err instanceof OpenAIReportError) throw err;
    throw classifyOpenAIError(err);
  }

  const userPrompt = buildUserPrompt(ctx);

  let response;
  try {
    response = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      temperature: 0.6,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
  } catch (err) {
    throw classifyOpenAIError(err);
  }

  const text = response.choices?.[0]?.message?.content || "";
  const parsed = safeParse(text);
  const normalized = normalizeReport(parsed, ctx);

  return {
    ...normalized,
    model: response.model || MODEL,
    usage: response.usage || null,
  };
}
