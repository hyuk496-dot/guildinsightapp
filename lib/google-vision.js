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

  const fullText = result.fullTextAnnotation?.text || "";
  const textAnnotations = result.textAnnotations || [];

  return { fullText, textAnnotations };
}
