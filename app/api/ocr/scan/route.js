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

    // 사용자가 업로드 화면에서 미리 선택한 길드/컨텐츠 (선택 사항)
    const guildIdRaw = formData.get("guild_id");
    const contentName = (formData.get("content_name") || "").toString().trim() || null;
    const guildId =
      guildIdRaw != null && guildIdRaw !== "" && !Number.isNaN(Number(guildIdRaw))
        ? Number(guildIdRaw)
        : null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { fullText, textAnnotations } = await runVisionOcr(buffer);

    // 콘텐츠별 파서 옵션 (공성전: 2단 분할 + rank+score 필수 strict 모드)
    const parserOptions = {
      contentName: contentName || null,
      knownGuilds: undefined, // 추후 DB 에서 주입 가능
      debug: true,
    };

    let rows = parseVisionAnnotations(textAnnotations, parserOptions);
    if (rows.length === 0 && fullText) {
      rows = parseOcrPlainText(fullText, parserOptions);
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
      guildId,
      contentName,
    });
  } catch (error) {
    console.error("OCR 스캔 에러:", error);
    return NextResponse.json(
      { error: error.message || "OCR 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
