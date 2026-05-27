import { scoreRowWeekKey } from "@/lib/dashboard-activity";
import { resolveRankingWeek } from "@/lib/server-rank-utils";
import { filterActiveMembers } from "@/lib/member-status";

// 랭킹 목표 시뮬레이션에서 "추가 점수" 최대치
// 공성전/세나 점수 스케일(수억~)에 맞춰 10억으로 확장
const MAX_BOOST = 1_000_000_000;

export { MAX_BOOST };

/** 길드 총점 기준 서버 순위·상위 격차 계산 */
export function simulateGuildRank(ranks, ourTotal) {
  const simTotal = Math.max(0, Number(ourTotal) || 0);
  const withSim = (ranks || []).map((r) => ({
    ...r,
    simScore: r.ours ? simTotal : Number(r.displayScore || 0),
  }));
  const sorted = [...withSim].sort((a, b) => b.simScore - a.simScore);
  const ourIndex = sorted.findIndex((r) => r.ours);
  const rank = ourIndex >= 0 ? ourIndex + 1 : null;
  const nextAbove = ourIndex > 0 ? sorted[ourIndex - 1] : null;
  const needed =
    nextAbove && ourIndex >= 0
      ? Math.max(0, nextAbove.simScore - simTotal + 1)
      : 0;

  return {
    rank,
    sorted,
    needed,
    nextAboveName: nextAbove?.name ?? null,
    nextAboveScore: nextAbove?.simScore ?? null,
  };
}

function memberWeekScore(scores, guildId, content, activityWeek, memberId) {
  let best = 0;
  for (const row of scores || []) {
    if (String(row.guild_id) !== String(guildId)) continue;
    if (row.content_name !== content) continue;
    if (scoreRowWeekKey(row) !== activityWeek) continue;
    if (String(row.member_id) !== String(memberId)) continue;
    best = Math.max(best, Number(row.score || 0));
  }
  return best;
}

/** 기준 주 제외, 해당 컨텐츠 과거 점수 평균 */
function memberHistoryAvg(scores, guildId, content, memberId, excludeWeek) {
  const vals = [];
  for (const row of scores || []) {
    if (String(row.guild_id) !== String(guildId)) continue;
    if (row.content_name !== content) continue;
    if (String(row.member_id) !== String(memberId)) continue;
    const wk = scoreRowWeekKey(row);
    if (wk === excludeWeek) continue;
    const sc = Number(row.score || 0);
    if (sc > 0) vals.push(sc);
  }
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function guildFillAverage(scores, activeMembers, guildId, content, excludeWeek) {
  const avgs = activeMembers
    .map((m) => memberHistoryAvg(scores, guildId, content, m.id, excludeWeek))
    .filter((v) => v > 0);
  if (avgs.length) {
    return Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length);
  }
  const weekScores = activeMembers
    .map((m) => memberWeekScore(scores, guildId, content, excludeWeek, m.id))
    .filter((v) => v > 0);
  if (weekScores.length) {
    return Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length);
  }
  return 0;
}

/**
 * 미참여(0점) 멤버 보충 · 전원 참여 시나리오
 */
export function buildParticipationScenarios(
  scores,
  members,
  guildId,
  contentName,
  ranks
) {
  const activeMembers = filterActiveMembers(members);
  const activityWeek = resolveRankingWeek(scores || [], contentName);
  const guildAvg = guildFillAverage(
    scores,
    activeMembers,
    guildId,
    contentName,
    activityWeek
  );

  let currentTotal = 0;
  let inactiveFillAdded = 0;
  let inactiveCount = 0;
  let fullTotal = 0;

  const memberLines = [];

  for (const m of activeMembers) {
    const mid = m.id;
    const weekScore = memberWeekScore(
      scores,
      guildId,
      contentName,
      activityWeek,
      mid
    );
    const histAvg = memberHistoryAvg(
      scores,
      guildId,
      contentName,
      mid,
      activityWeek
    );
    const fillUnit = histAvg > 0 ? histAvg : guildAvg;

    currentTotal += weekScore;

    const fillScore = weekScore > 0 ? 0 : fillUnit > 0 ? fillUnit : guildAvg;
    if (weekScore === 0 && fillScore > 0) {
      inactiveFillAdded += fillScore;
      inactiveCount += 1;
    }

    const projected =
      weekScore > 0 ? weekScore : fillUnit > 0 ? fillUnit : guildAvg;
    fullTotal += projected;

    memberLines.push({
      memberId: mid,
      nick: m.nick,
      weekScore,
      fillUnit,
      projected,
    });
  }

  const inactiveFillTotal = currentTotal + inactiveFillAdded;
  const ourBase =
    (ranks || []).find((r) => r.ours)?.displayScore ?? currentTotal;

  return {
    activityWeek,
    guildAvg,
    currentTotal,
    ourBaseFromRanks: ourBase,
    activeCount: activeMembers.length,
    participatedCount: memberLines.filter((l) => l.weekScore > 0).length,
    zeroScoreCount: inactiveCount,
    scenarios: {
      inactive_fill: {
        id: "inactive_fill",
        label: "미참여자 보충",
        description:
          "이번 주 0점인 활동 멤버에게 개인 최근 평균(없으면 길드 평균)을 채운 총점",
        totalScore: inactiveFillTotal,
        addedPoints: inactiveFillAdded,
        filledMemberCount: inactiveCount,
        ...simulateGuildRank(ranks, inactiveFillTotal),
      },
      full_participation: {
        id: "full_participation",
        label: "활동 멤버 전원 참여",
        description:
          "탈퇴 제외 전원이 각자 최근 평균(또는 길드 평균) 수준으로 참여한 최대 예상 총점",
        totalScore: fullTotal,
        ...simulateGuildRank(ranks, fullTotal),
      },
    },
  };
}
