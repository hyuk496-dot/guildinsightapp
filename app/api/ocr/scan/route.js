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
import { getAdminSupabase } from "@/lib/supabase-admin";
import { isOcrQuotaExempt } from "@/lib/ocr-quota";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png"]);
const QUOTA_ERROR = "무료 이미지 스캔 횟수를 모두 소진하셨습니다.";

export async function POST(request) {
  const started = Date.now();

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("free_ocr_count, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) throw profileErr;

    const exempt = isOcrQuotaExempt(profile, user.email);
    if (!exempt) {
      const left = Number(profile?.free_ocr_count ?? 0);
      if (!Number.isFinite(left) || left <= 0) {
        return NextResponse.json({ error: QUOTA_ERROR, code: "OCR_QUOTA_EXCEEDED" }, { status: 403 });
      }
    }

    const guildIdRaw = formData.get("guild_id");
    const contentName = (formData.get("content_name") || "").toString().trim() || null;
    const guildId =
      guildIdRaw != null && guildIdRaw !== "" && !Number.isNaN(Number(guildIdRaw))
        ? Number(guildIdRaw)
        : null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { fullText, textAnnotations } = await runVisionOcr(buffer);

    const parserOptions = {
      contentName: contentName || null,
      knownGuilds: undefined,
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

    if (!exempt) {
      try {
        const admin = getAdminSupabase();
        const { data: remaining, error: consumeErr } = await admin.rpc(
          "gi_consume_free_ocr_scan",
          { p_user_id: user.id }
        );
        if (consumeErr) {
          console.error("free_ocr consume 실패:", consumeErr);
        } else if (remaining === 0 && Number(profile?.free_ocr_count ?? 0) <= 0) {
          console.warn("free_ocr: consume skipped at 0 for", user.id);
        }
      } catch (consumeBlock) {
        console.error("free_ocr consume:", consumeBlock);
      }
    }

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
