export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

/**
 * 서버에서 Supabase 세션 쿠키 완전 삭제 후 랜딩으로 이동
 * GET /auth/signout
 */
export async function GET(request) {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();

  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/?logout=1", url.origin));
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}
