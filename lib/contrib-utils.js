import { pickLatestScoresPerMemberContent } from "@/lib/week-utils";

/** scores DB에서 길드원별 누적(최신 주차·컨텐츠 합) 기여도 산출 */
export function buildContribsFromScores(dbScores, guildId, members = []) {
  const guildKey = String(guildId);
  const latest = pickLatestScoresPerMemberContent(
    (dbScores || []).filter((s) => String(s.guild_id) === guildKey)
  );

  const byMember = new Map();
  latest.forEach((row) => {
    const mid = String(row.member_id);
    byMember.set(mid, (byMember.get(mid) || 0) + Number(row.score || 0));
  });

  const list = members.map((m) => {
    const score = byMember.get(String(m.id)) || 0;
    return {
      id: m.id,
      member_id: m.id,
      nick: m.nick,
      score,
      pct: 0,
      history: [],
    };
  });

  const total = list.reduce((a, c) => a + c.score, 0);
  return list
    .map((c) => ({
      ...c,
      pct: total ? +((c.score / total) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.score - a.score);
}

export function groupContribsByGuildId(rows = []) {
  const out = {};
  rows.forEach((row) => {
    const gid = String(row.guild_id);
    if (!out[gid]) out[gid] = [];
    out[gid].push({
      id: row.id ?? row.member_id,
      member_id: row.member_id,
      nick: row.nick,
      score: Number(row.score || 0),
      pct: Number(row.pct || 0),
      history: Array.isArray(row.history) ? row.history : [],
    });
  });
  return out;
}

export function applyContribPercents(list) {
  const total = list.reduce((a, c) => a + c.score, 0);
  return list.map((c) => ({
    ...c,
    pct: total ? +((c.score / total) * 100).toFixed(1) : 0,
  }));
}
