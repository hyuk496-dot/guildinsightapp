import { filterActiveMembers } from "@/lib/member-status";

/** API 길드 객체 → 초기 디자인 UI 필드로 매핑 */
export function formatGuildCreated(guild) {
  if (!guild) return "—";
  if (guild.created && typeof guild.created === "string" && !guild.created.includes("T")) {
    return guild.created;
  }
  if (guild.created_at) {
    try {
      return new Date(guild.created_at).toLocaleDateString("ko-KR");
    } catch {
      return "—";
    }
  }
  return "—";
}

/**
 * 길드원 수 — membersData(실시간) > API 집계 > guild.member_count 순
 */
export function resolveGuildMemberCount(
  guild,
  membersData,
  apiTotal,
  { excludeWithdrawn = true } = {}
) {
  if (guild?.id == null) return 0;
  const key = String(guild.id);
  const fromMap = membersData?.[key] ?? membersData?.[guild.id];
  if (Array.isArray(fromMap) && fromMap.length > 0) {
    const list = excludeWithdrawn ? filterActiveMembers(fromMap) : fromMap;
    return list.length;
  }
  if (typeof apiTotal === "number" && apiTotal > 0) return apiTotal;
  const n = guild.member_count ?? guild.members;
  return typeof n === "number" && n > 0 ? n : 0;
}

export function guildForUi(guild, membersData = null, apiMemberTotal) {
  if (!guild) return null;
  const members = resolveGuildMemberCount(guild, membersData, apiMemberTotal);
  return {
    ...guild,
    members,
    rank: guild.server_rank ?? guild.rank ?? "-",
    prevRank: guild.prev_rank ?? guild.prevRank ?? "-",
    game: guild.game_name ?? guild.game ?? "",
    created: formatGuildCreated(guild),
  };
}

export function formatMemberDate(value) {
  if (!value) return "";
  if (typeof value === "string" && !value.includes("T")) return value;
  try {
    return new Date(value).toLocaleDateString("ko-KR");
  } catch {
    return String(value);
  }
}

export function memberForUi(member, radar = null) {
  if (!member) return null;
  const stored = member.radar || member.radar_data;
  const resolved =
    radar != null ? radar : Array.isArray(stored) ? stored : [];
  return {
    ...member,
    joined: member.joined || formatMemberDate(member.joined_at),
    left: member.left || formatMemberDate(member.left_at),
    radar: resolved,
  };
}
