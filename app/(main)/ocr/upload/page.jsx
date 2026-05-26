'use client';

import { OcrImageUpload } from "@/components/ocr/OcrImageUpload";
import { useGuildInsight } from "@/context/GuildInsightProvider";

export default function OcrUploadEntryPage() {
  const { t, completeOcrScan } = useGuildInsight();

  return (
    <OcrImageUpload
      t={t}
      onScanComplete={(meta) => completeOcrScan(meta)}
    />
  );
}
