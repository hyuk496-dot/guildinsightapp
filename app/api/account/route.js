export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getAdminSupabase } from "@/lib/supabase-admin";

/**
 * DELETE /api/account
 *
 * 회원 탈퇴.
 *  1) 본인 세션 확인 (Cookie 기반)
 *  2) 본인 소유 길드의 자식 데이터(scores/contributions/gpt_reports/members) 전부 삭제
 *  3) 본인 소유 길드 삭제
 *  4) profiles 행 삭제 (auth.users 의 CASCADE 가 있더라도 명시 삭제로 race 회피)
 *  5) auth.users 에서 사용자 삭제 (admin API)
 *
 * 모든 DB 작업은 service-role(admin) 로 수행하여 RLS 우회.
 * 단, 삭제 대상은 반드시 "현재 인증된 user.id 의 행"으로만 한정한다.
 *
 * 안전장치: admin@guildinsight.local 계정은 탈퇴 불가 (시드 데이터 보호).
 */
export async function DELETE() {
  // 1) 본인 세션
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  if (user.email === "admin@guildinsight.local") {
    return NextResponse.json(
      {
        error:
          "admin 계정은 탈퇴할 수 없습니다. (시드 데이터 보호 목적)",
        code: "ADMIN_PROTECTED",
      },
      { status: 403 }
    );
  }

  let admin;
  try {
    admin = getAdminSupabase();
  } catch (e) {
    return NextResponse.json(
      {
        error:
          "서버에 SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않아 계정 삭제를 처리할 수 없습니다. .env.local 에 서비스 롤 키를 추가하세요.",
        code: "NO_SERVICE_ROLE",
      },
      { status: 500 }
    );
  }

  const uid = user.id;

  try {
    // 2) 본인 소유 길드 id 수집
    const { data: ownedGuilds, error: gErr } = await admin
      .from("guilds")
      .select("id")
      .eq("owner_id", uid);
    if (gErr) throw gErr;
    const guildIds = (ownedGuilds || []).map((g) => Number(g.id));

    if (guildIds.length > 0) {
      // 자식 → 부모 순서로 삭제 (FK CASCADE 여부와 무관하게 안전)
      const childTables = ["scores", "contributions", "gpt_reports", "members"];
      for (const tbl of childTables) {
        const { error } = await admin.from(tbl).delete().in("guild_id", guildIds);
        if (error && !/does not exist/i.test(error.message || "")) {
          console.warn(`[account] ${tbl} 삭제 경고:`, error.message);
        }
      }

      const { error: deleteGuildsErr } = await admin
        .from("guilds")
        .delete()
        .in("id", guildIds);
      if (deleteGuildsErr) throw deleteGuildsErr;
    }

    // 3) profiles 삭제 (auth.users CASCADE 가 처리하지만 명시 삭제)
    await admin.from("profiles").delete().eq("id", uid);

    // 4) auth.users 삭제 (admin API)
    const { error: authErr } = await admin.auth.admin.deleteUser(uid);
    if (authErr) {
      throw new Error(`auth.users 삭제 실패: ${authErr.message}`);
    }

    return NextResponse.json({
      success: true,
      deletedGuildCount: guildIds.length,
    });
  } catch (err) {
    console.error("[account DELETE] 실패:", err);
    return NextResponse.json(
      { error: err.message || "계정 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
