import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * 1) 모든 요청에 x-pathname 헤더 주입 → 서버 레이아웃이 현재 경로를 알 수 있음
 * 2) Supabase 세션을 매 요청마다 갱신 (쿠키)
 * 3) 보호된 경로에서 비로그인 사용자는 / 로 리다이렉트
 *
 * 보호 경로:
 *   /dashboard, /members, /scores, /contribution, /simulation,
 *   /gptreport, /ocr, /guild, /billing
 *
 * 공개 경로:
 *   / (랜딩), /auth/callback, /auth/error, /unauthorized,
 *   정적 파일, _next 내부 경로, /api/auth/*
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
  "/billing",
];

export async function middleware(request: NextRequest) {
  // 1) 레이아웃에서 읽을 수 있도록 현재 경로를 헤더로 노출
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // 2) 세션 갱신
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3) 보호 라우트 차단
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth", "required");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|images|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
