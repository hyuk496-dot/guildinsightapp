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

export function guildForUi(guild) {
  if (!guild) return null;
  return {
    ...guild,
    members: guild.member_count ?? guild.members ?? 0,
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
