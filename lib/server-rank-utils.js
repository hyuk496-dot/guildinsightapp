import { matchesContentName } from "@/lib/content-utils";
import { weekMondayKey, weekMondayKeyFromTimestamp } from "@/lib/week-utils";

function rowWeekKey(row) {
  return (
    row.week_monday?.split?.("T")?.[0] ||
    weekMondayKeyFromTimestamp(row.created_at || row.updated_at)
  );
}

function guildGame(g) {
  return g.game_name || g.game || "미지정 게임";
}

/** 랭킹 기준 주차: 이번 주 데이터가 있으면 이번 주, 없으면 DB 최신 주차 */
export function resolveRankingWeek(scores, contentName, dbNames = null) {
  const current = weekMondayKey();
  const weeks = new Set();

  (scores || []).forEach((row) => {
    if (!matchesContentName(row.content_name, contentName, dbNames)) return;
    weeks.add(rowWeekKey(row));
  });

  if (weeks.has(current)) return current;
  if (weeks.size === 0) return current;

  return [...weeks].sort().pop();
}

/**
 * 동일 게임 길드별 콘텐츠 점수 합계 → 등수 정렬
 * @returns {{ ranks: Array, currentRank: number|null, weekMonday: string }}
 */
export function buildServerRankings(
  scores,
  guilds,
  { contentName, gameName, currentGuildId, dbNames = null }
) {
  const weekMonday = resolveRankingWeek(scores, contentName, dbNames);
  const guildById = new Map((guilds || []).map((g) => [String(g.id), g]));
  const totals = new Map();

  (guilds || []).forEach((g) => {
    if (gameName && guildGame(g) !== gameName) return;
    totals.set(String(g.id), 0);
  });

  (scores || []).forEach((row) => {
    if (!matchesContentName(row.content_name, contentName, dbNames)) return;
    if (rowWeekKey(row) !== weekMonday) return;

    const gid = String(row.guild_id);
    const guild = guildById.get(gid);
    if (!guild) return;
    if (gameName && guildGame(guild) !== gameName) return;

    totals.set(gid, (totals.get(gid) || 0) + Number(row.score || 0));
  });

  const ranked = [...totals.entries()]
    .map(([gid, displayScore]) => ({
      guildId: Number(gid),
      name: guildById.get(gid)?.name || `길드 #${gid}`,
      displayScore,
      ours: String(gid) === String(currentGuildId),
    }))
    .sort((a, b) => b.displayScore - a.displayScore);

  const idx = ranked.findIndex((r) => r.ours);
  const currentRank = idx >= 0 ? idx + 1 : null;

  return { ranks: ranked, currentRank, weekMonday };
}
