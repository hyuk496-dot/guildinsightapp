import path from "path";
import fs from "fs";
import vision from "@google-cloud/vision";

function resolveCredentialsPath() {
  let cred = process.env.GOOGLE_APPLICATION_CREDENTIALS || "google-vision-key.json";
  cred = cred.replace(/^["']|["']$/g, "");
  const resolved = path.isAbsolute(cred) ? cred : path.join(process.cwd(), cred);
  return fs.existsSync(resolved) ? resolved : null;
}

function resolveCredentialsObject() {
  const raw = process.env.GOOGLE_CREDENTIALS_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      "GOOGLE_CREDENTIALS_JSON 파싱 실패. Vercel에 서비스 계정 JSON 전체를 한 줄로 설정했는지 확인하세요."
    );
  }
}

let client;

function getClient() {
  if (client) return client;

  const credentials = resolveCredentialsObject();
  if (credentials) {
    client = new vision.ImageAnnotatorClient({ credentials });
    return client;
  }

  const keyFilename = resolveCredentialsPath();
  if (!keyFilename) {
    throw new Error(
      "Google Vision 인증이 없습니다. GOOGLE_CREDENTIALS_JSON(Vercel) 또는 google-vision-key.json(로컬)을 설정하세요."
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

  const fullText = result.fullTextAnnotation?.text || "";
  const textAnnotations = result.textAnnotations || [];

  if (process.env.OCR_VISION_DEBUG === "true") {
    console.log(
      "[VISION] textAnnotations.length =",
      textAnnotations.length,
      "fullText.length =",
      fullText.length
    );
  }

  return { fullText, textAnnotations };
}
