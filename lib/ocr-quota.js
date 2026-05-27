export const FREE_OCR_MAX = 3;
export const ADMIN_EMAIL = "admin@guildinsight.local";

export function isOcrQuotaExempt(profile, userEmail) {
  const email = profile?.email || userEmail || "";
  if (email === ADMIN_EMAIL) return true;
  if (profile?.free_ocr_count == null) return true;
  return false;
}

export function normalizeFreeOcrRemaining(profile, userEmail) {
  if (isOcrQuotaExempt(profile, userEmail)) {
    return { remaining: FREE_OCR_MAX, max: FREE_OCR_MAX, unlimited: true };
  }
  const n = Number(profile?.free_ocr_count ?? 0);
  const remaining = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  return { remaining, max: FREE_OCR_MAX, unlimited: false };
}
