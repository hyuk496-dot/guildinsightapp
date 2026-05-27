'use client';

import { RankingGoals } from "@/components/simulation/RankingGoals";
import { useGuildInsight } from "@/context/GuildInsightProvider";

export default function SimulationPage() {
  const { t, guilds, activeGuild } = useGuildInsight();
  return <RankingGoals t={t} guilds={guilds} activeGuild={activeGuild} />;
}
