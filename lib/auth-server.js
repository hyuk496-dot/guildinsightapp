import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase-server";

/**
 * 서버에서 Supabase 세션 사용자 조회 (JWT 서버 검증)
 * @returns {Promise<{ user: import('@supabase/supabase-js').User | null, supabase: import('@supabase/supabase-js').SupabaseClient, error: Error | null }>}
 */
export async function getAuthUser() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  return {
    user: data?.user ?? null,
    supabase,
    error: error ?? null,
  };
}

/**
 * (main) 레이아웃 등 — 비로그인 시 결제/로그인 안내로 이동
 */
export async function requireAuthUser() {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user?.id) {
    redirect("/billing?auth=required");
  }
  return { user, supabase };
}
