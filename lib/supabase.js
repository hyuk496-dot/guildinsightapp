/**
 * 레거시 호환용 entry point.
 *
 * - 이전에 모든 API 라우트가 여기서 `supabase` 를 import 했다.
 * - 본 파일은 기본적으로 **서비스 롤 (RLS 우회)** 클라이언트를 export 한다.
 *   → 사용자 컨텍스트가 필요한 새 API 라우트는 lib/supabase-server.js 의
 *     getServerSupabase() 를 사용해야 한다.
 *
 * 신규 코드에서는 다음 셋 중 하나를 명시적으로 import 하자.
 *   1) lib/supabase-server.js → getServerSupabase()   (유저 세션, RLS 적용)
 *   2) lib/supabase-admin.js  → getAdminSupabase()    (서비스 롤, RLS 우회)
 *   3) lib/supabase-browser.js → getBrowserSupabase() (브라우저, 쿠키 세션)
 */
import { getAdminSupabase } from "@/lib/supabase-admin";

// 모듈 로드 시점이 아니라 호출 시점에 초기화되도록 Proxy 로 lazy wrapping
export const supabase = new Proxy(
  {},
  {
    get(_t, prop) {
      const client = getAdminSupabase();
      const v = client[prop];
      return typeof v === "function" ? v.bind(client) : v;
    },
  }
);
