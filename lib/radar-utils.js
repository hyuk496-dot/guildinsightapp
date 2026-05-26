import { RADAR_LABELS, CONTENT_MAX_SCORES } from "@/lib/constants";
import {
  pickLatestScoresPerMemberContent,
  formatWeekDisplay,
  weekMondayKeyFromTimestamp,
} from "@/lib/week-utils";

/** 레이더 축 라벨 → scoresData / contents 키 */
export function contentNameForRadarLabel(label, contents = []) {
  if (label === "개인") {
    return contents.find((c) => c.includes("개인")) || "개인 컨텐츠";
  }
  return contents.find((c) => c === label) || label;
}

/** 컨텐츠명(또는 이름 변경된 항목)에 대한 만점 조회 */
export function getContentMaxScore(contentName, contents = []) {
  if (contentName && CONTENT_MAX_SCORES[contentName] != null) {
    return CONTENT_MAX_SCORES[contentName];
  }
  for (const label of RADAR_LABELS) {
    const canonical = contentNameForRadarLabel(label, contents);
    if (canonical === contentName) {
      const key = label === "개인" ? "개인 컨텐츠" : label;
      return CONTENT_MAX_SCORES[key] ?? CONTENT_MAX_SCORES[canonical];
    }
  }
  return 0;
}

function guildScoresBucket(scoresData, guildId) {
  if (!scoresData || guildId == null) return {};
  return scoresData[guildId] ?? scoresData[String(guildId)] ?? scoresData[Number(guildId)] ?? {};
}

/** API scores[] → Provider scoresData 형태 (멤버·컨텐츠당 최신 주차 1건) */
export function formatScoresFromApi(dbScores) {
  const formatted = {};
  const latest = pickLatestScoresPerMemberContent(dbScores);

  latest.forEach((s) => {
    const targetGuildId = s.guild_id != null ? String(s.guild_id) : "";
    const contentKey = s.content_name;
    if (!targetGuildId || !contentKey) return;
    if (!formatted[targetGuildId]) formatted[targetGuildId] = {};
    if (!formatted[targetGuildId][contentKey]) formatted[targetGuildId][contentKey] = [];

    const week =
      s.week_monday?.split?.("T")?.[0] ||
      s._weekMonday ||
      weekMondayKeyFromTimestamp(s.created_at);

    formatted[targetGuildId][contentKey].push({
      id: s.id,
      memberId: s.member_id,
      nick: s.nick,
      score: Number(s.score || 0),
      prev: Number(s.prev_score || 0),
      date: formatWeekDisplay(week),
      weekMonday: week,
    });
  });
  return formatted;
}

/**
 * 점수 관리(scoresData) → 역량 레이더(0~100).
 * 컨텐츠별 고정 만점 대비 백분율: round((입력 점수 / 만점) * 100), 최대 100.
 */
export function buildMemberRadar(memberId, guildId, scoresData, contents = []) {
  const bucket = guildScoresBucket(scoresData, guildId);
  return RADAR_LABELS.map((label) => {
    const contentName = contentNameForRadarLabel(label, contents);
    const rows = bucket[contentName] || [];
    const memberRow = rows.find(
      (s) => s.memberId === memberId || String(s.memberId) === String(memberId)
    );
    const memberScore = memberRow?.score ?? 0;
    if (!memberScore) return 0;

    const maxScore = getContentMaxScore(contentName, contents);
    if (!maxScore) return 0;

    return Math.min(100, Math.round((memberScore / maxScore) * 100));
  });
}

export function hasRadarData(radar) {
  return Array.isArray(radar) && radar.length === RADAR_LABELS.length && radar.some((v) => v > 0);
}
