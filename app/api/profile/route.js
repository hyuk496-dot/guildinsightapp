export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

/**
 * /api/profile
 *  GET  → 현재 사용자 프로필 (소유 길드 수, 마지막 관리 길드 id 포함)
 *  PUT  → last_managed_guild_id / display_name 갱신
 */

async function requireSupabase() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, deny: NextResponse.json({ error: "인증 필요" }, { status: 401 }) };
  return { supabase, user, deny: null };
}

export async function GET() {
  const { supabase, user, deny } = await requireSupabase();
  if (deny) return deny;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, last_managed_guild_id, discord_webhook_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data: guilds } = await supabase.from("guilds").select("id, name");

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile: profile || {
      id: user.id,
      email: user.email,
      display_name: user.email,
      last_managed_guild_id: null,
    },
    guildsCount: guilds?.length ?? 0,
  });
}

export async function PUT(request) {
  const { supabase, user, deny } = await requireSupabase();
  if (deny) return deny;

  try {
    const body = await request.json().catch(() => ({}));
    const patch = {};
    if (typeof body.last_managed_guild_id !== "undefined") {
      patch.last_managed_guild_id = body.last_managed_guild_id
        ? Number(body.last_managed_guild_id)
        : null;
    }
    if (typeof body.display_name === "string") {
      patch.display_name = body.display_name;
    }
    if (typeof body.discord_webhook_url === "string") {
      const raw = body.discord_webhook_url.trim();
      patch.discord_webhook_url = raw ? raw : null;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "변경할 필드가 없습니다." }, { status: 400 });
    }
    patch.updated_at = new Date().toISOString();

    // RLS 가 본인 행만 update 허용 → eq('id', user.id) 도 안전망으로 추가
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id)
      .select()
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("profile PUT 에러:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
