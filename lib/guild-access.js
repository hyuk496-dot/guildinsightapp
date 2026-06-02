/**
 * 길드 소유권·멤버 소속 검증 (사용자 세션 / RLS 컨텍스트).
 */

export async function requireGuildOwner(supabase, guildId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "인증 필요", user: null };
  }

  const gid = Number(guildId);
  if (!Number.isFinite(gid)) {
    return { ok: false, status: 400, error: "길드 ID 형식 오류", user: null };
  }

  const { data: guild, error } = await supabase
    .from("guilds")
    .select("id, owner_id")
    .eq("id", gid)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: error.message, user: null };
  }
  if (!guild) {
    return {
      ok: false,
      status: 403,
      error: "접근 권한이 없거나 존재하지 않는 길드입니다.",
      user: null,
    };
  }
  if (guild.owner_id !== user.id) {
    return { ok: false, status: 403, error: "접근 권한이 없습니다.", user: null };
  }

  return { ok: true, user, guild };
}

export async function requireMemberInGuild(supabase, guildId, memberId) {
  const mid = Number(memberId);
  const gid = Number(guildId);
  if (!Number.isFinite(mid)) {
    return { ok: false, error: "멤버 ID 형식 오류" };
  }

  const { data: member, error } = await supabase
    .from("members")
    .select("id, guild_id, nick")
    .eq("id", mid)
    .eq("guild_id", gid)
    .maybeSingle();

  if (error) throw error;
  if (!member) {
    return { ok: false, error: "해당 길드에 속한 멤버를 찾을 수 없습니다." };
  }
  return { ok: true, member };
}
