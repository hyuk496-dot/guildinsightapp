import { getAdminSupabase } from "@/lib/supabase-admin";
import { ADMIN_EMAIL, normalizeFreeOcrRemaining } from "@/lib/ocr-quota";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertAuthenticatedUserId(userId) {
  if (!userId || typeof userId !== "string" || !UUID_RE.test(userId)) {
    return false;
  }
  return true;
}

/**
 * 서버 전용: 세션 사용자의 OCR 잔여 횟수 (RLS 우회 없이 service role로 본인 행만 조회)
 */
export async function getOcrQuotaForUser(userId, userEmail) {
  if (!assertAuthenticatedUserId(userId)) {
    throw new Error("유효하지 않은 사용자 ID");
  }

  // admin 프리패스: DB 조회/차감 로직을 타지 않는다.
  if ((userEmail || "").trim() === ADMIN_EMAIL) {
    return { remaining: Infinity, max: Infinity, unlimited: true, isAdmin: true };
  }

  const admin = getAdminSupabase();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("free_ocr_count, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  const quota = normalizeFreeOcrRemaining(profile, userEmail);
  return { ...quota, isAdmin: false };
}

/**
 * OCR 성공 후 1회 차감 — p_user_id는 반드시 세션 user.id만 전달
 */
export async function consumeOcrScanForUser(userId) {
  if (!assertAuthenticatedUserId(userId)) {
    throw new Error("유효하지 않은 사용자 ID");
  }

  const admin = getAdminSupabase();
  const { data: remaining, error } = await admin.rpc("gi_consume_free_ocr_scan", {
    p_user_id: userId,
  });

  if (error) throw error;
  return remaining;
}

/**
 * 스캔 전 quota 검사 (admin 기준, 타 유저 변조 방지)
 */
export async function assertCanConsumeOcrScan(userId, userEmail) {
  if ((userEmail || "").trim() === ADMIN_EMAIL) {
    return { remaining: Infinity, max: Infinity, unlimited: true, isAdmin: true };
  }
  const quota = await getOcrQuotaForUser(userId, userEmail);
  if (quota.unlimited) return quota;
  if (quota.remaining <= 0) {
    const err = new Error("무료 이미지 스캔 횟수를 모두 소진하셨습니다.");
    err.code = "OCR_QUOTA_EXCEEDED";
    throw err;
  }
  return quota;
}
