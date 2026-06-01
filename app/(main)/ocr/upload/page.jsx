'use client';

import { OcrImageUpload } from "@/components/ocr/OcrImageUpload";
import { useGuildInsight } from "@/context/GuildInsightProvider";

export default function OcrUploadEntryPage() {
  const { t, guilds, contents, activeGuild, completeOcrScan } = useGuildInsight();

  return (
    <OcrImageUpload
      t={t}
      guilds={guilds}
      contents={contents}
      defaultGuildId={activeGuild?.id ?? null}
      defaultContentName={contents?.[0] ?? ""}
      onScanComplete={(meta) => completeOcrScan(meta)}
    />
  );
}
