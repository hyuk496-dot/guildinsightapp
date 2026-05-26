export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSupabase } from "@/lib/supabase-server";

async function requireUser() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, deny: NextResponse.json({ error: "인증 필요" }, { status: 401 }) };
  return { supabase, deny: null };
}

export async function GET() {
  const { supabase, deny } = await requireUser();
  if (deny) return deny;
  try {
    const { data, error } = await supabase.from('members').select('*');
    if (error) throw error;
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("멤버 데이터 조회 에러:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request) {
  const { supabase, deny } = await requireUser();
  if (deny) return deny;
  try {
    const { guild_id, nick, server, job, joined_at, left_at } = await request.json();
    const { data, error } = await supabase
      .from('members')
      .insert([{ guild_id, nick, server, job, joined_at, left_at }])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("멤버 등록 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const { supabase, deny } = await requireUser();
  if (deny) return deny;
  try {
    const { id, nick, server, job, joined_at, left_at } = await request.json();
    if (!id) return NextResponse.json({ error: "id가 누락되었습니다." }, { status: 400 });
    const { data, error } = await supabase
      .from('members')
      .update({ nick, server, job, joined_at, left_at })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("멤버 수정 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { supabase, deny } = await requireUser();
  if (deny) return deny;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "id가 누락되었습니다." }, { status: 400 });
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("멤버 삭제 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
