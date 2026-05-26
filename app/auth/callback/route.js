import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

/**
 * 서버 Route Handler 로 OAuth code 를 처리한다.
 *
 * - PKCE verifier 는 브라우저가 OAuth 시작 시 쿠키에 저장해 두었고,
 *   리다이렉트 후 동일 도메인 요청이라 쿠키가 그대로 따라온다.
 * - 서버에서 exchangeCodeForSession 을 호출하면 verifier 쿠키를 함께 보내
 *   Supabase 가 검증 → 세션 발급 → 응답 쿠키에 sb-auth-token 을 set.
 * - React StrictMode 의 이중 호출에 영향을 받지 않음 (서버는 한 번만 실행).
 * - 클라이언트 storage race condition 자체가 발생하지 않음.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const errorCode = url.searchParams.get("error_code");
  const errorDescription = url.searchParams.get("error_description");

  const next = url.searchParams.get("next") || "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  // Supabase 가 ?error=... 로 반환한 경우 → 에러 페이지로 전달
  if (errorParam || errorDescription) {
    const errUrl = new URL("/auth/error", origin);
    if (errorParam) errUrl.searchParams.set("error", errorParam);
    if (errorCode) errUrl.searchParams.set("code", errorCode);
    if (errorDescription) errUrl.searchParams.set("desc", errorDescription);
    return NextResponse.redirect(errUrl);
  }

  if (!code) {
    const errUrl = new URL("/auth/error", origin);
    errUrl.searchParams.set("desc", "Authorization code 가 누락되었습니다.");
    return NextResponse.redirect(errUrl);
  }

  // 응답 쿠키를 set 할 수 있도록 redirect Response 를 먼저 만든 뒤,
  // Supabase 클라이언트가 그 response 의 cookies 에 setAll 하도록 위임한다.
  const response = NextResponse.redirect(new URL(safeNext, origin));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    const errUrl = new URL("/auth/error", origin);
    errUrl.searchParams.set("desc", "Supabase 환경변수 누락 (.env.local 확인 필요)");
    return NextResponse.redirect(errUrl);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchangeCodeForSession 실패:", error);
    const errUrl = new URL("/auth/error", origin);
    errUrl.searchParams.set("error", "exchange_failed");
    if (error.code) errUrl.searchParams.set("code", error.code);
    errUrl.searchParams.set("desc", error.message || "code 교환 실패");
    return NextResponse.redirect(errUrl);
  }

  return response;
}
