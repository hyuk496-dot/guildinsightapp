/** membersData: { [guildId]: Member[] } 형태로 통일 */

export function groupMembersByGuildId(list) {
  if (!list) return {};
  if (!Array.isArray(list)) {
    return typeof list === "object" ? { ...list } : {};
  }
  const map = {};
  for (const m of list) {
    const gid = String(m.guild_id);
    if (!map[gid]) map[gid] = [];
    map[gid].push(m);
  }
  return map;
}

export function upsertMember(map, member) {
  const next = { ...map };
  for (const gid of Object.keys(next)) {
    next[gid] = (next[gid] || []).filter((m) => m.id !== member.id);
  }
  const gid = String(member.guild_id);
  next[gid] = [...(next[gid] || []), member];
  return next;
}

export function removeMember(map, memberId) {
  const next = { ...map };
  for (const gid of Object.keys(next)) {
    next[gid] = (next[gid] || []).filter((m) => m.id !== memberId);
  }
  return next;
}

export function removeGuildFromMembers(map, guildId) {
  const next = { ...map };
  delete next[String(guildId)];
  return next;
}
