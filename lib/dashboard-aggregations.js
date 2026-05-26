import { CONTENT_MAX_SCORES, RADAR_LABELS } from "@/lib/constants";
import { contentNameForRadarLabel, getContentMaxScore } from "@/lib/radar-utils";

/**
 * 길드 단위 가공 — 기존 members / scores DB 구조를 변경하지 않고
 * Provider 가 이미 보유한 membersData / scoresData 만 사용해 차트용 데이터를 만든다.
 */

/**
 * 한 길드의 멤버별 합계/참여수 집계 → 산점도용
 *
 * scoresData[guildId] 는 { [contentName]: [{ memberId, score, ... }] } 형태 (최신 주차 1건씩).
 *
 * 반환: 멤버별 객체 배열
 *  - x: 참여 콘텐츠 수 (활동 폭)
 *  - y: 총 점수 (활동 강도)
 *  - z: 평균 점수 (점 크기 매핑용)
 *  - nick, job, color, grade
 */
export function buildContribScatter({ members = [], scoresByContent = {}, theme }) {
  const dColors = theme?.dColors || ["#00c8ff", "#EF9F27", "#4cff91", "#ff6fa8", "#a89df5", "#5f7a94"];

  // 직업별 색 매핑(일관성을 위해 정렬 후 인덱스)
  const jobs = [...new Set(members.map((m) => m.job || "미정"))].sort();
  const colorFor = (job) =>
    dColors[(jobs.indexOf(job) >= 0 ? jobs.indexOf(job) : 0) % dColors.length];

  // member.id → { totalScore, contentsCount }
  const agg = new Map();
  members.forEach((m) => agg.set(String(m.id), { total: 0, count: 0 }));

  Object.entries(scoresByContent).forEach(([contentName, rows]) => {
    (rows || []).forEach((row) => {
      const key = String(row.memberId ?? row.member_id);
      if (!agg.has(key)) return;
      const s = Number(row.score || 0);
      if (s <= 0) return;
      const cur = agg.get(key);
      cur.total += s;
      cur.count += 1;
    });
  });

  return members.map((m) => {
    const a = agg.get(String(m.id)) || { total: 0, count: 0 };
    const avg = a.count > 0 ? Math.round(a.total / a.count) : 0;
    const grade =
      avg >= 4000 ? "S" : avg >= 2500 ? "A" : avg >= 1200 ? "B" : avg > 0 ? "C" : "—";
    return {
      x: a.count,
      y: a.total,
      z: Math.max(60, avg / 8), // 점 크기 (recharts ZAxis range 와 함께 클램핑)
      nick: m.nick || `member ${m.id}`,
      job: m.job || "미정",
      color: colorFor(m.job || "미정"),
      contentsCount: a.count,
      totalScore: a.total,
      avgScore: avg,
      grade,
    };
  });
}

/**
 * 길드 능력치 레이더 데이터.
 *
 * 6개 축(RADAR_LABELS) 각각에 대해:
 *  - 해당 콘텐츠에 점수가 있는 멤버들의 평균 점수 / 만점 × 100
 *  - 0~100 스케일
 *
 * 반환: [{ axis, value, participants, avgScore, maxScore }]
 */
export function buildGuildRadar({ members = [], scoresByContent = {}, contents = [] }) {
  const memberIds = new Set((members || []).map((m) => String(m.id)));

  return RADAR_LABELS.map((label) => {
    const contentName = contentNameForRadarLabel(label, contents);
    const rows = scoresByContent[contentName] || [];
    const maxScore =
      getContentMaxScore(contentName, contents) || CONTENT_MAX_SCORES[contentName] || 0;

    const validRows = (rows || []).filter(
      (r) =>
        memberIds.has(String(r.memberId ?? r.member_id)) && Number(r.score || 0) > 0
    );

    const sum = validRows.reduce((acc, r) => acc + Number(r.score || 0), 0);
    const avg = validRows.length > 0 ? sum / validRows.length : 0;
    const pct = maxScore > 0 ? Math.min(100, Math.round((avg / maxScore) * 100)) : 0;

    return {
      axis: label,
      value: pct,
      participants: validRows.length,
      avgScore: Math.round(avg),
      maxScore,
    };
  });
}
