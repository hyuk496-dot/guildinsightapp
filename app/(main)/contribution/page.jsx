'use client';

import { ContribAnalysis } from "@/components/contribution/ContribAnalysis";
import { useGuildInsight } from "@/context/GuildInsightProvider";

export default function ContributionPage() {
  const { t, guilds, contribsData, setContribsData } = useGuildInsight();
  return (
    <ContribAnalysis t={t} guilds={guilds} contribsData={contribsData} setContribsData={setContribsData} />
  );
}
