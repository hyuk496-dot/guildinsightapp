export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  assertAuthenticatedUserId,
  getOcrQuotaForUser,
} from "@/lib/ocr-quota-server";

export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !assertAuthenticatedUserId(user.id)) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const quota = await getOcrQuotaForUser(user.id, user.email ?? "");
    return NextResponse.json(quota, { status: 200 });
  } catch (error) {
    console.error("ocr/quota GET:", error.message || error);
    return NextResponse.json(
      { error: "잔여 횟수를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
