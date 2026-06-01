export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  recentWeekMondays,
  weekMondayKey,
  weekMondayUtcIso,
  formatWeekDisplay,
  weekMondayKeyFromTimestamp,
} from "@/lib/week-utils";

/** GPTReport LIVE Q&A 프리미엄 안내와 동일 문구 */
const PREMIUM_UPSELL =
  "자유로운 AI 질의응답 및 상세 전략 추천은 Premium 요금제에서 제공됩니다. 🚀";

/** 무료 조회 가능: 이번 주(0) ~ 3주 전까지. 4주 전 이상은 Premium */
const FREE_WEEK_LOOKBACK_MAX = 3;

function clampStr(v, max = 400) {
  const s = String(v ?? "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function stripSpacesLower(s) {
  return String(s || "").replace(/\s+/g, "").toLowerCase();
}

function getMemberNameFromRow(row) {
  if (!row || typeof row !== "object") return "";
  // 흔한 컬럼 후보 우선
  const candidates = [
    row.nick,
    row.name,
    row.nickname,
    row.member_name,
    row.username,
    row.display_name,
    row.ign,
  ]
    .map((v) => (v == null ? "" : String(v).trim()))
    .filter(Boolean);
  if (candidates[0]) return candidates[0];

  // 그래도 없으면: string 필드 중 "name/nick" 포함 키 우선
  const keys = Object.keys(row);
  const preferredKeys = keys.filter((k) => /nick|name|user/i.test(k));
  for (const k of preferredKeys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  // 마지막 fallback: string 필드 아무거나(과매칭 방지 위해 짧은 값 우선)
  const stringVals = keys
    .map((k) => row[k])
    .filter((v) => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .sort((a, b) => a.length - b.length);
  return stringVals[0] || "";
}

function extractDateFromQuestion(question) {
  const q = String(question || "");
  const defaultYear = new Date().getFullYear();

  // 2026-05-12 / 2026.05.12 / 2026/05/12
  const mIso = q.match(
    /(?:^|[^\d])(20\d{2})[-./](\d{1,2})[-./](\d{1,2})(?:$|[^\d])/
  );
  if (mIso) {
    const y = Number(mIso[1]);
    const mm = Number(mIso[2]);
    const dd = Number(mIso[3]);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      const d = new Date(y, mm - 1, dd);
      if (!Number.isNaN(d.getTime())) {
        return { date: d, label: `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}` };
      }
    }
  }

  // 5월 25일 / 05월25일
  const mKorean = q.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (mKorean) {
    const mm = Number(mKorean[1]);
    const dd = Number(mKorean[2]);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      const d = new Date(defaultYear, mm - 1, dd);
      if (!Number.isNaN(d.getTime())) {
        return { date: d, label: `${mm}월 ${dd}일` };
      }
    }
  }

  // 05.25 / 5.25 / 05/25 (연도 생략 — 올해 기준)
  const mShort = q.match(/(?:^|[^\d])(\d{1,2})[./](\d{1,2})(?:$|[^\d])/);
  if (mShort) {
    const mm = Number(mShort[1]);
    const dd = Number(mShort[2]);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      const d = new Date(defaultYear, mm - 1, dd);
      if (!Number.isNaN(d.getTime())) {
        return { date: d, label: `${mm}월 ${dd}일` };
      }
    }
  }

  return null;
}

function shiftWeekMondayFromCurrent(weeksBack) {
  const current = recentWeekMondays(1)?.[0] || weekMondayKey();
  const d = new Date(`${current}T12:00:00`);
  d.setDate(d.getDate() - weeksBack * 7);
  return weekMondayKey(d);
}

/** targetWeek(월요일)가 이번 주 월요일보다 몇 주 이전인지 (0=이번 주) */
function weeksAgoFromCurrentWeek(targetWeek) {
  const current = recentWeekMondays(1)?.[0] || weekMondayKey();
  const t = new Date(`${targetWeek}T12:00:00`).getTime();
  const c = new Date(`${current}T12:00:00`).getTime();
  const diffDays = Math.round((c - t) / (24 * 60 * 60 * 1000));
  return Math.max(0, Math.round(diffDays / 7));
}

function weekWordForOffset(weeksBack) {
  if (weeksBack <= 0) return "이번 주";
  if (weeksBack === 1) return "지난주";
  if (weeksBack === 2) return "지지난주";
  if (weeksBack === 3) return "지지지난주";
  return `${weeksBack}주 전`;
}

/** 질문에서 주차 오프셋 파싱 (null = 키워드 없음) */
function parseWeekOffsetFromQuestion(question) {
  const q = String(question || "");
  const compact = stripSpacesLower(q);

  // 긴 키워드 우선 (4주 → 3주 → …)
  if (/지지지지난주/.test(compact) || /4주전/.test(compact)) return 4;
  if (/지지지난주/.test(compact) || /3주전/.test(compact)) return 3;
  if (/지지난주/.test(compact) || /2주전/.test(compact)) return 2;
  if (/지난주|전주|저번주/.test(compact) || /1주전/.test(compact)) return 1;
  if (/이번주|이번 주|금주/.test(compact)) return 0;

  const nMatch = q.match(/(\d+)\s*주\s*전/);
  if (nMatch) {
    const n = Number(nMatch[1]);
    if (Number.isFinite(n) && n >= 0) return n;
  }

  return null;
}

/**
 * targetWeek·프리미엄 여부·표시 라벨 결정
 * @returns {{ kind: 'premium' } | { kind: 'resolved', targetWeek: string, weeksAgo: number, hasDate: boolean, dateLabel?: string, weekWord: string }}
 */
function resolveTargetWeekFromQuestion(question) {
  const dateHit = extractDateFromQuestion(question);
  const weekKeywordOffset = parseWeekOffsetFromQuestion(question);

  if (dateHit?.date) {
    const targetWeek = weekMondayKey(dateHit.date);
    const weeksAgo = weeksAgoFromCurrentWeek(targetWeek);
    if (weeksAgo > FREE_WEEK_LOOKBACK_MAX) {
      return { kind: "premium" };
    }
    return {
      kind: "resolved",
      targetWeek,
      weeksAgo,
      hasDate: true,
      dateLabel: dateHit.label,
      weekWord: weekWordForOffset(weeksAgo),
    };
  }

  if (weekKeywordOffset !== null) {
    if (weekKeywordOffset > FREE_WEEK_LOOKBACK_MAX) {
      return { kind: "premium" };
    }
    return {
      kind: "resolved",
      targetWeek: shiftWeekMondayFromCurrent(weekKeywordOffset),
      weeksAgo: weekKeywordOffset,
      hasDate: false,
      weekWord: weekWordForOffset(weekKeywordOffset),
    };
  }

  return {
    kind: "resolved",
    targetWeek: recentWeekMondays(1)?.[0] || weekMondayKey(),
    weeksAgo: 0,
    hasDate: false,
    weekWord: "이번 주",
  };
}

function extractContentFromQuestion(question, contentsList = []) {
  const q = stripSpacesLower(question);
  const list = (contentsList || []).filter((c) => c && c !== "전체");
  const sorted = [...list].sort((a, b) => b.length - a.length);
  for (const c of sorted) {
    if (q.includes(stripSpacesLower(c))) return c;
  }
  return null;
}

function pickContent({ question, contentFilter, contentsList = [] }) {
  const mentioned = extractContentFromQuestion(question, contentsList);
  if (mentioned) return { content: mentioned, source: "QUESTION" };
  if (contentFilter && contentFilter !== "전체")
    return { content: contentFilter, source: "FILTER" };
  const primary = contentsList?.[0];
  if (primary) return { content: primary, source: "DEFAULT" };
  return { content: "", source: "DEFAULT" };
}

function detectMemberFromQuestion(members, question) {
  const qRaw = String(question || "");
  const qTrim = qRaw.trim();
  const qLower = qTrim.toLowerCase();
  const qNoSpaceLower = stripSpacesLower(qTrim);

  const candidates = (members || [])
    .map((m) => getMemberNameFromRow(m))
    .map((s) => String(s || "").trim())
    .filter(Boolean);

  // 질문에서 의미있는 토큰(별칭) 추출: "탱크", "kimtank" 등
  // - 2글자 이상만 사용(과매칭 방지)
  // - 공백/기호 기준으로 분리 + 한글/영문/숫자 토큰만
  const tokens =
    qTrim.match(/[A-Za-z0-9가-힣_]{2,24}/g)?.map((t) => t.trim()).filter(Boolean) ||
    [];

  let best = null;
  let bestScore = -1;

  for (const nameRaw of candidates) {
    const name = String(nameRaw || "").trim();
    if (!name) continue;

    const nLower = name.toLowerCase();
    const nNoSpaceLower = stripSpacesLower(name);

    // 1) 가장 확실한 전체 포함 매칭 (question.includes(name))
    if (
      qTrim.includes(name) ||
      (nLower && qLower.includes(nLower)) ||
      (nNoSpaceLower && qNoSpaceLower.includes(nNoSpaceLower))
    ) {
      // 전체닉 매칭은 즉시 최고 우선
      return name;
    }

    // 2) 별칭/부분 매칭: token이 nick에 포함되는지(예: "탱크" ∈ "킴탱크")
    let tokenHitLen = 0;
    for (const tok of tokens) {
      const tLower = tok.toLowerCase();
      const tNoSpaceLower = stripSpacesLower(tok);
      if (!tLower) continue;
      if (
        (nLower && nLower.includes(tLower)) ||
        (nNoSpaceLower && nNoSpaceLower.includes(tNoSpaceLower))
      ) {
        tokenHitLen = Math.max(tokenHitLen, tok.length);
      }
    }

    if (tokenHitLen <= 0) continue;

    // 점수: (가장 긴 토큰 매칭) 우선, 동률이면 이름이 더 짧은 쪽(구체적인 별칭)에 가중
    const score = tokenHitLen * 100 - name.length;
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }

  return best;
}

async function sumMemberScoreForWeek({
  supabase,
  guildId,
  memberId,
  content,
  contentNames = null,
  weekMonday,
  includeGuildFilter = true,
  strictWeekQuery = false,
}) {
  const names = (
    Array.isArray(contentNames) && contentNames.length
      ? contentNames
      : content
        ? [String(content)]
        : []
  ).map((n) => String(n).trim()).filter(Boolean);

  // 1) week_monday 컬럼이 있는 경우(정상)
  let q = supabase
    .from("scores")
    // ⚠️ 일부 데모/레거시 스키마에는 created_at/updated_at 컬럼이 없을 수 있어 제외한다.
    .select("score, week_monday")
    .eq("member_id", Number(memberId))
    .eq("week_monday", weekMonday);
  if (names.length === 1) q = q.eq("content_name", names[0]);
  else if (names.length > 1) q = q.in("content_name", names);
  if (includeGuildFilter) q = q.eq("guild_id", Number(guildId));

  const res = await q;

  if (!res.error) {
    const rows = Array.isArray(res.data) ? res.data : [];
    const total = rows.reduce((s, r) => s + Number(r.score || 0), 0);
    // 과거 주차·특정 날짜 주차: row 없으면 레거시 limit(30)으로 이번 주 점수를 끌어오지 않음
    if (strictWeekQuery && rows.length === 0) {
      return { total: 0, rows: [], used: "week_empty" };
    }
    return { total, rows, used: "week_monday" };
  }

  // 2) 레거시(week_monday 누락 등): created_at 기반 range는 스키마에 없을 수 있으므로 사용하지 않는다.
  const msg = String(res.error?.message || "");
  const maybeMissingWeekMonday =
    res.error?.code === "42703" || msg.toLowerCase().includes("week_monday");
  if (!maybeMissingWeekMonday) throw res.error;

  if (strictWeekQuery) {
    return { total: 0, rows: [], used: "week_no_data" };
  }

  // week_monday 컬럼이 없으면 "주차 한정"을 DB에서 할 수 없으므로,
  // 해당 멤버+컨텐츠의 "일부" 레코드를 합산(근사치)한다.
  // (정확한 주차 범위 필터링은 불가하므로 limit 을 작게 유지)
  let legacyQuery = supabase
    .from("scores")
    .select("score")
    .eq("member_id", Number(memberId))
    .limit(30);
  if (names.length === 1) legacyQuery = legacyQuery.eq("content_name", names[0]);
  else if (names.length > 1) legacyQuery = legacyQuery.in("content_name", names);
  if (includeGuildFilter) legacyQuery = legacyQuery.eq("guild_id", Number(guildId));

  const legacy = await legacyQuery;
  if (legacy.error) throw legacy.error;
  const rows = Array.isArray(legacy.data) ? legacy.data : [];
  const total = rows.reduce((s, r) => s + Number(r.score || 0), 0);
  return { total, rows, used: "no_week_column_sum_recent" };
}

export async function POST(request) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    // guildId, actualGuildId 중 존재하는 값을 가용
    const targetGuildIdRaw = body?.guildId ?? body?.actualGuildId ?? null;
    const targetGuildId =
      targetGuildIdRaw != null && targetGuildIdRaw !== ""
        ? Number(targetGuildIdRaw)
        : null;
    const question = clampStr(body?.question || "", 400);
    const contentFilter = clampStr(body?.contentFilter || "전체", 40) || "전체";
    const contentsList = (Array.isArray(body?.contents) ? body.contents : [])
      .map((c) => String(c || "").trim())
      .filter((c) => c && c !== "전체");
    const contentDbNames = (Array.isArray(body?.contentDbNames) ? body.contentDbNames : [])
      .map((c) => String(c || "").trim())
      .filter(Boolean);

    if (!targetGuildId || !Number.isFinite(targetGuildId)) {
      return NextResponse.json({ error: "guildId 필요" }, { status: 400 });
    }
    if (!question) {
      return NextResponse.json({ error: "question 필요" }, { status: 400 });
    }

    // [보안] 운영자가 접근 가능한 길드인지 RLS로 검증 (타 길드면 null)
    const { data: guildRow, error: guildErr } = await supabase
      .from("guilds")
      .select("id")
      .eq("id", Number(targetGuildId))
      .maybeSingle();
    if (guildErr) throw guildErr;
    if (!guildRow?.id) {
      return NextResponse.json(
        { error: "접근 권한이 없거나 존재하지 않는 길드입니다." },
        { status: 403 }
      );
    }

    // 멤버 목록 확보(질문에서 nick 감지용)
    // 1차: guild_id 필터로 멤버 목록 확보
    const { data: members, error: memErr } = await supabase
      .from("members")
      .select("*")
      .eq("guild_id", Number(targetGuildId))
      .limit(5000);
    if (memErr) {
      console.error("[member-score] members query error:", memErr);
      throw memErr;
    }
    const memberList = Array.isArray(members) ? members : [];
    if (memberList.length === 0) {
      console.warn("[member-score] members is empty for guildId =", targetGuildId);
    }

    // 이름 매칭 1차 (정상: guild_id 필터된 목록)
    let nick = detectMemberFromQuestion(memberList, question);

    // [데모 운영 임시 조치] members.guild_id 데이터가 꼬여 0명 조회되는 경우:
    // guild_id 필터를 풀고 전체 members에서 이름만 매칭하여 member_id를 찾는다.
    // 점수 조회는 여전히 요청 guildId로만 제한(보안 유지).
    let member = null;
    let usedMemberFallback = false;
    if (!nick && memberList.length === 0) {
      console.warn("[member-score] fallback: searching all members by name.");
      const { data: allMembers, error: allErr } = await supabase
        .from("members")
        .select("*")
        .limit(5000);
      if (allErr) {
        console.error("[member-score] fallback all-members query error:", allErr);
      } else {
        const allList = Array.isArray(allMembers) ? allMembers : [];
        nick = detectMemberFromQuestion(allList, question);
        if (nick) {
          member = allList.find((m) => getMemberNameFromRow(m) === nick) || null;
          usedMemberFallback = !!member;
        }
      }
    }

    if (!member && nick) {
      member = memberList.find((m) => getMemberNameFromRow(m) === nick) || null;
    }
    if (!nick) {
      return NextResponse.json(
        { ok: false, reason: "NO_MEMBER", answer: null },
        { status: 200 }
      );
    }
    if (!member?.id) {
      return NextResponse.json(
        { ok: false, reason: "MEMBER_NOT_FOUND", answer: null },
        { status: 200 }
      );
    }

    const weekResolved = resolveTargetWeekFromQuestion(question);

    if (weekResolved.kind === "premium") {
      return NextResponse.json(
        {
          ok: true,
          reason: "PREMIUM_REQUIRED",
          answer: PREMIUM_UPSELL,
          stage: 0,
          guildId: targetGuildId,
          contentFilter,
          member: { id: member.id, nick },
        },
        { status: 200 }
      );
    }

    const {
      targetWeek,
      weeksAgo,
      hasDate,
      dateLabel,
      weekWord,
    } = weekResolved;

    const { content, source: contentSource } = pickContent({ question, contentFilter });

    // 이번 주가 아니거나 특정 날짜 주차 → 레거시 폴백 차단
    const strictWeekQuery = weeksAgo > 0 || hasDate;

    const scoreRes = await sumMemberScoreForWeek({
      supabase,
      guildId: targetGuildId,
      memberId: member.id,
      content,
      weekMonday: targetWeek,
      includeGuildFilter: !usedMemberFallback,
      strictWeekQuery,
    });

    const rawTotal = Number(scoreRes.total || 0);
    const emptyWeek =
      strictWeekQuery &&
      (scoreRes.used === "week_empty" ||
        scoreRes.used === "week_no_data" ||
        rawTotal === 0);

    const totalScore = emptyWeek ? 0 : rawTotal;
    const weekLabel = formatWeekDisplay(targetWeek);

    const mentionedContent = extractContentFromQuestion(question, contentsList);
    const stage =
      hasDate && mentionedContent && mentionedContent !== contentFilter
        ? 3
        : hasDate
          ? 2
          : 1;

    const prettyContent =
      contentFilter === "전체" && contentSource === "DEFAULT" ? content : content;

    const noDataAnswer = hasDate
      ? `DB 확인 결과, ${dateLabel} 해당 주 ${nick} 님의 ${prettyContent} 데이터가 입력되지 않았거나 0점입니다.`
      : `DB 확인 결과, ${weekWord} ${nick} 님의 ${prettyContent} 데이터가 입력되지 않았거나 0점입니다.`;

    const answer = emptyWeek
      ? noDataAnswer
      : stage === 3
        ? `${dateLabel || weekLabel} 주차 ${mentionedContent} 확인 결과, ${nick} 님의 점수는 ${totalScore.toLocaleString()}점입니다.`
        : stage === 2
          ? `${dateLabel || weekLabel} 주차 확인 결과, ${nick} 님의 ${prettyContent} 점수는 ${totalScore.toLocaleString()}점입니다.`
          : `DB 확인 결과, ${weekWord} ${nick} 님의 ${prettyContent} 점수는 ${totalScore.toLocaleString()}점입니다.`;

    return NextResponse.json(
      {
        ok: true,
        stage,
        guildId: targetGuildId,
        contentFilter,
        member: { id: member.id, nick },
        content,
        weekMonday: targetWeek,
        weekLabel,
        weeksAgo,
        totalScore,
        answer,
        debug: {
          contentSource,
          usedQuery: scoreRes.used,
          usedMemberFallback,
          strictWeekQuery,
          hasDate,
          dateLabel,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[member-score] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "조회 실패" },
      { status: 500 }
    );
  }
}

