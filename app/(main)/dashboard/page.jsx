'use client';

import { Dashboard } from "@/components/dashboard/Dashboard";
import { useGuildInsight } from "@/context/GuildInsightProvider";

export default function DashboardPage() {
  const { t, activeGuild } = useGuildInsight();
  return <Dashboard t={t} guild={activeGuild} />;
}
