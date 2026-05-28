import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/**
 * OAuth / Magic link → code 교환 후 세션 쿠키 설정
 * Vercel: forwarded host 기준 redirect + /auth/confirm 에서 최종 이동
 */
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const errorCode = url.searchParams.get("error_code");
  const errorDescription = url.searchParams.get("error_description");

  const next = url.searchParams.get("next") || "/dashboard";
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const origin = getSiteOrigin(request);

  if (errorParam || errorDescription) {
    const errUrl = new URL("/auth/error", origin);
    if (errorParam) errUrl.searchParams.set("error", errorParam);
    if (errorCode) errUrl.searchParams.set("code", errorCode);
    if (errorDescription) errUrl.searchParams.set("desc", errorDescription);
    return NextResponse.redirect(errUrl);
  }

  if (!code) {
    const errUrl = new URL("/auth/error", origin);
    errUrl.searchParams.set(
      "desc",
      "Authorization code 가 누락되었습니다. Supabase Redirect URL에 /auth/callback 이 등록되어 있는지 확인하세요."
    );
    return NextResponse.redirect(errUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    const errUrl = new URL("/auth/error", origin);
    errUrl.searchParams.set("desc", "Supabase 환경변수 누락 (Vercel Environment Variables 확인)");
    return NextResponse.redirect(errUrl);
  }

  const confirmUrl = new URL("/auth/confirm", origin);
  confirmUrl.searchParams.set("next", safeNext);

  let response = NextResponse.redirect(confirmUrl, { status: 303 });

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
