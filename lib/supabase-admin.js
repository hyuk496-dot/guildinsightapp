import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용 service-role 클라이언트.
 *
 * - RLS 를 우회한다. **절대 클라이언트로 노출 금지.**
 * - 사용 처: OCR 차감, cross-tenant 집계 등
 *
 * 환경변수
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (서버 전용, NEXT_PUBLIC_ 접두사 없음)
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

function resolveServiceKey() {
  const explicit = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (explicit) return explicit;

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anon?.startsWith("sb_secret_")) {
    return anon;
  }
  return null;
}

const serviceKey = resolveServiceKey();

let _admin = null;

export function getAdminSupabase() {
  if (typeof window !== "undefined") {
    throw new Error("getAdminSupabase 는 서버 전용입니다. 클라이언트에서 호출 금지.");
  }
  if (_admin) return _admin;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 가 필요합니다 (서버 전용, Vercel 환경 변수에 설정)."
    );
  }
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("sb_secret_") &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.warn(
      "[supabase-admin] 개발 환경: secret key fallback 사용 중. 프로덕션에서는 SUPABASE_SERVICE_ROLE_KEY 를 별도 설정하세요."
    );
  }
  _admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
