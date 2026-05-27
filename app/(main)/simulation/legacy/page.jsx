'use client';

import { RankingSimulationLegacy } from "@/components/simulation/RankingSimulation.legacy";
import { useGuildInsight } from "@/context/GuildInsightProvider";

/**
 * 구 랭킹 시뮬레이션 (수동 타 길드 ± 입력).
 * 사이드바 비노출 — 복구 시 /simulation/legacy 로 접근.
 */
export default function SimulationLegacyPage() {
  const { t, guilds, activeGuild } = useGuildInsight();
  return (
    <RankingSimulationLegacy t={t} guilds={guilds} activeGuild={activeGuild} />
  );
}
