import path from "path";
import fs from "fs";
import vision from "@google-cloud/vision";

function resolveCredentialsPath() {
  let cred = process.env.GOOGLE_APPLICATION_CREDENTIALS || "google-vision-key.json";
  cred = cred.replace(/^["']|["']$/g, "");
  const resolved = path.isAbsolute(cred) ? cred : path.join(process.cwd(), cred);
  return fs.existsSync(resolved) ? resolved : null;
}

let client;

function getClient() {
  if (client) return client;
  const keyFilename = resolveCredentialsPath();
  if (!keyFilename) {
    throw new Error(
      "Google Vision 인증 파일을 찾을 수 없습니다. guildinsightapp/google-vision-key.json 또는 GOOGLE_APPLICATION_CREDENTIALS를 확인하세요."
    );
  }
  client = new vision.ImageAnnotatorClient({ keyFilename });
  return client;
}

/** @param {Buffer} imageBuffer */
export async function runVisionOcr(imageBuffer) {
  const annotator = getClient();
  const [result] = await annotator.documentTextDetection({
    image: { content: imageBuffer },
  });

  // ── DEBUG: Google Vision API 원본 응답 덤프 ──────────────────────
  // 파싱 알고리즘을 손대기 전에 실제 raw JSON 구조를 확인하기 위한 로깅.
  // textAnnotations 배열이 매우 길 수 있어 결과 길이도 함께 표기한다.
  console.log("================ VISION API RAW START ================");
  try {
    console.log(
      JSON.stringify(
        result,
        (_key, value) => (typeof value === "bigint" ? value.toString() : value),
        2
      )
    );
  } catch (e) {
    console.log("[VISION RAW] JSON.stringify 실패:", e?.message || e);
    console.log("[VISION RAW] result keys:", Object.keys(result || {}));
  }
  console.log(
    "[VISION RAW] textAnnotations.length =",
    result?.textAnnotations?.length ?? 0,
    "/ fullTextAnnotation.text.length =",
    result?.fullTextAnnotation?.text?.length ?? 0
  );
  console.log("================ VISION API RAW END ==================");
  // ────────────────────────────────────────────────────────────────

  const fullText = result.fullTextAnnotation?.text || "";
  const textAnnotations = result.textAnnotations || [];

  return { fullText, textAnnotations };
}
