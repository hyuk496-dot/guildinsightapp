import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * 네트워크 경계 인증 프록시 (Next.js 16)
 *
 * 1) x-pathname 헤더 → 서버 레이아웃
 * 2) Supabase 세션 쿠키 갱신
 * 3) 보호 경로 / API 비로그인 차단
 *
 * 권한의 최종 검증은 (main)/layout + 각 API Route Handler 에서 수행한다.
 */

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/members",
  "/scores",
  "/contribution",
  "/simulation",
  "/gptreport",
  "/ocr",
  "/guild",
];

/** 인증 없이 허용하는 API (없음 — 모든 /api 는 세션 필요) */
const PUBLIC_API_PREFIXES = [] as const;

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isPublicApi(pathname: string) {
  return PUBLIC_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function applyNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = isProtectedPath(pathname);
  const isApi = pathname.startsWith("/api/");

  if (isApi && !isPublicApi(pathname) && !user) {
    return applyNoStore(
      NextResponse.json({ error: "인증 필요" }, { status: 401 })
    );
  }

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/billing";
    url.searchParams.set("auth", "required");
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return applyNoStore(redirectResponse);
  }

  if (isProtected || isApi) {
    return applyNoStore(supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|images|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
