'use client';

import { GuildManagement } from "@/components/guild/GuildManagement";
import { useGuildInsight } from "@/context/GuildInsightProvider";

export default function GuildPage() {
  const { t, guilds, setGuilds, selectGuild, contribsData } = useGuildInsight();
  return (
    <GuildManagement
      t={t}
      guilds={guilds}
      setGuilds={setGuilds}
      onSelectGuild={(g) => selectGuild(g)}
      contribsData={contribsData}
    />
  );
}
