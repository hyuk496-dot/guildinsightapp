'use client';

import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저 전용 Supabase 클라이언트 (쿠키 기반 PKCE 세션)
 *
 * - @supabase/ssr 의 createBrowserClient 사용
 * - PKCE code_verifier 가 localStorage 가 아니라 쿠키(document.cookie)에 저장됨
 *   → 서버 Route Handler 에서도 같은 verifier 를 읽을 수 있어
 *     exchangeCodeForSession 을 서버에서 안전하게 처리할 수 있다.
 * - React StrictMode 이중 호출, 클라이언트/서버 race condition 영향을 받지 않음
 */

let _client;

export function getBrowserSupabase() {
  if (typeof window === "undefined") {
    throw new Error("getBrowserSupabase 는 브라우저에서만 사용 가능합니다.");
  }
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 .env.local 에 필요합니다."
    );
  }

  _client = createBrowserClient(url, anonKey);
  return _client;
}
