import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용 service-role 클라이언트.
 *
 * - RLS 를 우회한다. **절대 클라이언트로 노출 금지.**
 * - 사용 처: OCR/시드/관리자 스크립트 등 사용자 컨텍스트가 없거나 cross-tenant 가 필요한 경우.
 * - 일반 API 라우트는 lib/supabase-server.js 의 getServerSupabase() 를 쓰고,
 *   여기는 정말 필요할 때만 호출한다.
 *
 * 환경변수
 *   NEXT_PUBLIC_SUPABASE_URL     (기존)
 *   SUPABASE_SERVICE_ROLE_KEY    (서버 전용, NEXT_PUBLIC_ 접두사 없음)
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  // 호환성: 과거 잘못 NEXT_PUBLIC_* 에 secret 을 넣어둔 경우 fallback (경고)
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith("sb_secret_")
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : null);

let _admin = null;

export function getAdminSupabase() {
  if (typeof window !== "undefined") {
    throw new Error("getAdminSupabase 는 서버 전용입니다. 클라이언트에서 호출 금지.");
  }
  if (_admin) return _admin;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 필요합니다 (서버 전용, NEXT_PUBLIC_ 접두사 X)."
    );
  }
  if (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith("sb_secret_") &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.warn(
      "[supabase-admin] NEXT_PUBLIC_SUPABASE_ANON_KEY 에 secret key 가 들어 있습니다. " +
        "보안상 즉시 publishable key 로 교체하고, SUPABASE_SERVICE_ROLE_KEY 를 별도로 설정하세요."
    );
  }
  _admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
