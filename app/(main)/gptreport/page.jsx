'use client';

import { GPTReport } from "@/components/gpt/GPTReport";
import { useGuildInsight } from "@/context/GuildInsightProvider";

export default function GptReportPage() {
  const { t, guilds, activeGuild } = useGuildInsight();
  return <GPTReport t={t} guilds={guilds} activeGuild={activeGuild} />;
}
