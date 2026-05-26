/**
 * scores 테이블의 신스키마(week_monday/created_at) 지원 여부를 감지/캐시.
 * 마이그레이션이 안 돌아간 환경에서도 API가 죽지 않도록 보호.
 */
let weekMondaySupported = null;

/** PostgREST/Postgres가 컬럼 누락을 알리는 에러인지 */
export function isMissingColumnError(error) {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  if (error.code === "42703") return true;
  if (error.code === "PGRST204") return true;
  if (msg.includes("schema cache")) return true;
  if (msg.includes("does not exist") && msg.includes("column")) return true;
  return false;
}

/** 특정 컬럼명이 누락 에러에 포함됐는지 */
export function isMissingSpecificColumn(error, columnName) {
  if (!isMissingColumnError(error)) return false;
  const msg = String(error.message || "").toLowerCase();
  return msg.includes(columnName.toLowerCase());
}

/** 유니크 제약 누락 (onConflict 실패) */
export function isMissingUniqueConstraint(error) {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  if (error.code === "42P10") return true;
  if (msg.includes("no unique") || msg.includes("matching unique")) return true;
  return false;
}

export function markWeekMondayMissing() {
  weekMondaySupported = false;
}

export function markWeekMondaySupported() {
  weekMondaySupported = true;
}

/** null이면 아직 모름, false면 컬럼 없음, true면 컬럼 있음 */
export function getWeekMondaySupport() {
  return weekMondaySupported;
}
