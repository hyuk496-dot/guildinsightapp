'use client';

import { MemberManagement } from "@/components/members/MemberManagement";
import { useGuildInsight } from "@/context/GuildInsightProvider";

export default function MembersPage() {
  const { t, guilds, membersData, setMembersData, contribsData, membersLoading, scoresData, contents } =
    useGuildInsight();

  if (membersLoading || guilds.length === 0) {
    return <div style={{ color: t.text, padding: 20 }}>데이터를 불러오는 중...</div>;
  }

  return (
    <MemberManagement
      t={t}
      guilds={guilds}
      membersData={membersData}
      setMembersData={setMembersData}
      contribsData={contribsData}
      scoresData={scoresData}
      contents={contents}
    />
  );
}
