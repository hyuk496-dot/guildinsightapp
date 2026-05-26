export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { runVisionOcr } from "@/lib/google-vision";
import {
  parseVisionAnnotations,
  parseOcrPlainText,
  summarizeOcrRows,
} from "@/lib/ocr-parse";
import { getServerSupabase } from "@/lib/supabase-server";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png"]);

export async function POST(request) {
  const started = Date.now();

  // 인증 확인 — 로그인 안 한 사용자는 OCR 호출 불가
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "이미지 파일이 필요합니다." }, { status: 400 });
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "JPG 또는 PNG 파일만 업로드 가능합니다." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "파일 크기는 최대 10MB까지 가능합니다." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { fullText, textAnnotations } = await runVisionOcr(buffer);

    let rows = parseVisionAnnotations(textAnnotations);
    if (rows.length === 0 && fullText) {
      rows = parseOcrPlainText(fullText);
    }

    rows = rows.map((r, i) => ({
      ...r,
      id: `ocr-${i}`,
      memberId: null,
    }));

    const summary = summarizeOcrRows(rows);

    return NextResponse.json({
      rows,
      rawText: fullText,
      avgConf: summary.avgConf,
      warnCount: summary.warnCount,
      processingMs: Date.now() - started,
    });
  } catch (error) {
    console.error("OCR 스캔 에러:", error);
    return NextResponse.json(
      { error: error.message || "OCR 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
