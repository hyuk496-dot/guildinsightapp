/** 탈퇴일(left_at)이 있으면 탈퇴 멤버 */
export function hasMemberLeft(member) {
  const raw = member?.left_at ?? member?.left;
  if (raw == null) return false;
  if (typeof raw === "string" && raw.trim() === "") return false;
  return true;
}

/** 활동 중(탈퇴하지 않은) 길드원만 */
export function filterActiveMembers(members) {
  return (members || []).filter((m) => !hasMemberLeft(m));
}
