'use client';

import { ScoreManagement } from "@/components/scores/ScoreManagement";
import { useGuildInsight } from "@/context/GuildInsightProvider";

export default function ScoresPage() {
  const { t, guilds, membersData, scoresData, setScoresData, contents, setContents } = useGuildInsight();
  return (
    <ScoreManagement
      t={t}
      guilds={guilds}
      membersData={membersData}
      scoresData={scoresData}
      setScoresData={setScoresData}
      contents={contents}
      setContents={setContents}
    />
  );
}
