import { GuildInsightProvider } from "@/context/GuildInsightProvider";
import { AppShell } from "@/components/layout/AppShell";
import { GuestBillingShell } from "@/components/layout/GuestBillingShell";
import { getServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function BillingLayout({ children }) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <GuestBillingShell>{children}</GuestBillingShell>;
  }

  const { data: myGuilds } = await supabase
    .from("guilds")
    .select("id, name, game_name, owner_id")
    .order("id", { ascending: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("last_managed_guild_id, display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const providerRaw =
    user.app_metadata?.provider || user.identities?.[0]?.provider || "email";
  const metaName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.user_name ||
    null;

  if ((myGuilds?.length ?? 0) === 0) {
    return (
      <GuildInsightProvider
        initialGuilds={[]}
        initialUser={{
          id: user.id,
          email: user.email,
          displayName: profile?.display_name || metaName || user.email,
          provider: providerRaw,
          avatarUrl:
            user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          lastManagedGuildId: profile?.last_managed_guild_id || null,
        }}
      >
        <AppShell>{children}</AppShell>
      </GuildInsightProvider>
    );
  }

  return (
    <GuildInsightProvider
      initialGuilds={myGuilds || []}
      initialUser={{
        id: user.id,
        email: user.email,
        displayName: profile?.display_name || metaName || user.email,
        provider: providerRaw,
        avatarUrl:
          user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        lastManagedGuildId: profile?.last_managed_guild_id || null,
      }}
    >
      <AppShell>{children}</AppShell>
    </GuildInsightProvider>
  );
}
