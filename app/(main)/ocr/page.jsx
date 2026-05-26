'use client';

import { OcrUpload } from "@/components/ocr/OcrUpload";
import { useGuildInsight } from "@/context/GuildInsightProvider";

/** 사이드바 "OCR 업로드" · 스캔 완료 후 — OcrUpload (결과/저장) */
export default function OcrResultsPage() {
  const {
    t,
    guilds,
    contents,
    membersData,
    ocrSession,
    activeGuild,
    refreshScores,
    refreshContribs,
  } = useGuildInsight();

  return (
    <OcrUpload
      t={t}
      guilds={guilds}
      contents={contents}
      membersData={membersData}
      ocrSession={ocrSession}
      defaultGuildId={activeGuild?.id}
      refreshScores={refreshScores}
      refreshContribs={refreshContribs}
    />
  );
}
