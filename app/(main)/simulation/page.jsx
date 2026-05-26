'use client';

import { RankingSimulation } from "@/components/simulation/RankingSimulation";
import { useGuildInsight } from "@/context/GuildInsightProvider";

export default function SimulationPage() {
  const { t, guilds, activeGuild } = useGuildInsight();
  return <RankingSimulation t={t} guilds={guilds} activeGuild={activeGuild} />;
}
