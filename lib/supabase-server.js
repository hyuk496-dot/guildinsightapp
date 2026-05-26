import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버 컴포넌트 / Server Action / Route Handler 에서 사용할 Supabase 클라이언트.
 *
 * - PKCE code_verifier 를 쿠키에서 읽어 exchangeCodeForSession 처리 가능.
 * - 세션이 갱신되면 응답 쿠키에 자동 반영.
 *
 * 주의: cookies() 가 read-only 인 Server Component 에서는 setAll 이 throw 될 수 있으므로
 *      catch 로 감싼다. 갱신은 다음 요청에서 미들웨어로 처리한다고 가정.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 .env.local 에 필요합니다."
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component 의 read-only 쿠키 컨텍스트에서는 무시
        }
      },
    },
  });
}
