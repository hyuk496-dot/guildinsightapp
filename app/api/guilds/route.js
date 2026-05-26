export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSupabase } from "@/lib/supabase-server";

/**
 * 길드 CRUD — 모두 사용자 세션 컨텍스트에서 동작 (RLS 강제 적용).
 * - SELECT/UPDATE/DELETE: owner_id = auth.uid() 인 행만 보임
 * - INSERT: owner_id 자동으로 현재 사용자 ID 주입
 */

async function requireUser() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, deny: NextResponse.json({ error: "인증 필요" }, { status: 401 }) };
  return { supabase, user, deny: null };
}

export async function GET() {
  const { supabase, deny } = await requireUser();
  if (deny) return deny;

  try {
    const { data: guilds, error } = await supabase.from('guilds').select('*');
    if (error) throw error;
    if (!guilds) return NextResponse.json([], { status: 200 });

    const { data: members } = await supabase.from('members').select('guild_id');

    const result = guilds.map(g => ({
      ...g,
      game: g.game_name || "미지정 게임",
      member_count: members ? members.filter(m => Number(m.guild_id) === Number(g.id)).length : 0,
    }));
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("guilds GET 에러:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  const { supabase, user, deny } = await requireUser();
  if (deny) return deny;

  try {
    const { name, game } = await request.json();
    const { data, error } = await supabase
      .from('guilds')
      .insert([{ name, game_name: game, owner_id: user.id }])
      .select()
      .single();
    if (error) throw error;

    // 신규 길드 생성 시 last_managed_guild_id 도 자동으로 그것으로
    await supabase
      .from("profiles")
      .update({ last_managed_guild_id: data.id, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    return NextResponse.json({
      id: data.id,
      name: data.name,
      game: data.game_name || "미지정 게임",
      member_count: 0,
    }, { status: 201 });
  } catch (error) {
    console.error("guilds POST 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const { supabase, deny } = await requireUser();
  if (deny) return deny;

  try {
    const { id, name, game } = await request.json();
    const { data, error } = await supabase
      .from('guilds')
      .update({ name, game_name: game })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({
      id: data.id,
      name: data.name,
      game: data.game_name || "미지정 게임",
      game_name: data.game_name,
      member_count: 0,
    }, { status: 200 });
  } catch (error) {
    console.error("guilds PUT 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { supabase, deny } = await requireUser();
  if (deny) return deny;

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
    const guildId = Number(id);

    // 자식 행은 ON DELETE CASCADE 또는 RLS 가 동일 owner_id 만 통과시키므로 안전
    const { error: membersError } = await supabase.from("members").delete().eq("guild_id", guildId);
    if (membersError) throw membersError;

    const { error: guildError } = await supabase.from("guilds").delete().eq("id", guildId);
    if (guildError) throw guildError;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("guilds DELETE 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
