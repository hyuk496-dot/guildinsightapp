export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { normalizeFreeOcrRemaining } from "@/lib/ocr-quota";

export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("free_ocr_count, email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("ocr/quota GET:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(normalizeFreeOcrRemaining(profile, user.email));
}
