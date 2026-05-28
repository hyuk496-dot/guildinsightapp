import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { GuildInsightProvider } from "@/context/GuildInsightProvider";
import { AppShell } from "@/components/layout/AppShell";
import { requireAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/**
 * 인증 + 길드 소속 게이트.
 *
 * - 비로그인 → /?auth=required (랜딩)
 * - 로그인했는데 소유 길드가 0개 → /guild/new?welcome=1
 *   (단, 이미 /guild/new 에 있으면 통과 — 무한 리다이렉트 방지)
 *
 * URL 직접 입력으로 타 길드 데이터 접근을 시도하더라도, 모든 API 라우트가
 * getServerSupabase() 의 RLS 컨텍스트로 동작하므로 데이터 자체가 차단된다.
 * 페이지 단에서 fetch 결과가 비어있거나 에러일 경우 /unauthorized 로 폴백한다.
 */
export default async function MainLayout({ children }) {
  const { user, supabase } = await requireAuthUser();

  const h = await headers();
  const pathname = h.get("x-pathname") || "";
  const isOnGuildNew = pathname.startsWith("/guild/new");

  const { data: myGuilds } = await supabase
    .from("guilds")
    .select("id, name, game_name, owner_id")
    .order("id", { ascending: true });

  const guildCount = myGuilds?.length ?? 0;

  if (guildCount === 0 && !isOnGuildNew) {
    redirect("/guild/new?welcome=1");
  }

  // 마지막으로 관리하던 길드 id (로그인 직후 dashboard 초기 선택용)
  const { data: profile } = await supabase
    .from("profiles")
    .select("last_managed_guild_id, display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  // OAuth 제공자 식별 (google / discord / email)
  const providerRaw =
    user.app_metadata?.provider ||
    user.identities?.[0]?.provider ||
    "email";

  // user_metadata 의 full_name / name 우선 적용
  const metaName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.user_name ||
    null;

  return (
    <GuildInsightProvider
      initialGuilds={myGuilds || []}
      initialUser={{
        id: user.id,
        email: user.email,
        displayName: profile?.display_name || metaName || user.email,
        provider: providerRaw,
        avatarUrl:
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null,
        lastManagedGuildId: profile?.last_managed_guild_id || null,
      }}
    >
      <AppShell>{children}</AppShell>
    </GuildInsightProvider>
  );
}
