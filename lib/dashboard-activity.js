import { matchesContentName } from "@/lib/content-utils";
import { weekMondayKeyFromTimestamp } from "@/lib/week-utils";
import { resolveRankingWeek } from "@/lib/server-rank-utils";
import { filterActiveMembers } from "@/lib/member-status";

export function scoreRowWeekKey(row) {
  return (
    row.week_monday?.split?.("T")?.[0] ||
    weekMondayKeyFromTimestamp(row.created_at || row.updated_at)
  );
}

/**
 * 컨텐츠·기준 주차별 참여 통계
 * - 기준 주: 랭킹과 동일(resolveRankingWeek) — 이번 주 데이터 없으면 최신 점수 주차
 */
export function computeContentParticipation(
  scores,
  members,
  contentName,
  dbNames = null
) {
  const activeMembers = filterActiveMembers(members);
  const activeIds = new Set(activeMembers.map((m) => String(m.id)));
  const activityWeek = resolveRankingWeek(scores, contentName, dbNames);

  const participated = new Set();
  let weekScoreTotal = 0;

  (scores || []).forEach((row) => {
    if (!matchesContentName(row.content_name, contentName, dbNames)) return;
    if (scoreRowWeekKey(row) !== activityWeek) return;

    const score = Number(row.score || 0);
    weekScoreTotal += score;

    const mid = String(row.member_id);
    if (score > 0 && activeIds.has(mid)) {
      participated.add(mid);
    }
  });

  const totalActive = activeIds.size;
  const activityRate =
    totalActive > 0
      ? Math.round((participated.size / totalActive) * 100)
      : 0;

  return {
    activityWeek,
    activityRate,
    activeMembers: participated.size,
    totalMembers: totalActive,
    weekScoreTotal,
  };
}
