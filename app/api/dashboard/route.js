export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { buildGuildWeeklyChart } from "@/lib/dashboard-utils";
import { buildServerRankings } from "@/lib/server-rank-utils";

export async function GET(request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get("guild_id");
  const content = searchParams.get("content") || "총력전";

  if (!guildId) {
    return NextResponse.json({ error: "guild_id 필요" }, { status: 400 });
  }

  try {
    // [1] 본인 길드 + 본인 점수만 RLS 컨텍스트로 (소유 검증 겸용)
    const [
      { data: myScores, error: myErr },
      { data: guildRow },
      { data: myMembers },
    ] = await Promise.all([
      supabase
        .from("scores")
        .select("*")
        .eq("guild_id", Number(guildId))
        .eq("content_name", content),
      supabase
        .from("guilds")
        .select("id, name, game_name")
        .eq("id", Number(guildId))
        .maybeSingle(),
      supabase
        .from("members")
        .select("id")
        .eq("guild_id", Number(guildId)),
    ]);

    if (!guildRow) {
      return NextResponse.json(
        { error: "접근 권한이 없거나 존재하지 않는 길드입니다." },
        { status: 403 }
      );
    }
    if (myErr) throw myErr;

    // [2] 서버 랭킹은 cross-tenant 집계 — admin client 로 동일 game_name 풀 조회
    //    개인정보(member_id, nick)는 응답에 노출되지 않고, (guildId, name, displayScore) 만 전송.
    const gameName = guildRow.game_name || "미지정 게임";
    let serverRanks = { ranks: [], currentRank: null, weekMonday: null };
    try {
      const admin = getAdminSupabase();
      const { data: sameGameGuilds } = await admin
        .from("guilds")
        .select("id, name, game_name")
        .eq("game_name", gameName);

      const gameGuildIds = (sameGameGuilds || []).map((g) => Number(g.id));

      const { data: scoresAll } = gameGuildIds.length
        ? await admin
            .from("scores")
            .select("guild_id, content_name, score, week_monday, created_at, updated_at")
            .eq("content_name", content)
            .in("guild_id", gameGuildIds)
        : { data: [] };

      serverRanks = buildServerRankings(scoresAll || [], sameGameGuilds || [], {
        contentName: content,
        gameName,
        currentGuildId: guildId,
      });
    } catch (rankErr) {
      // service-role 키 미설정 등으로 admin client 실패 시 본인 길드만 랭킹화
      console.warn(
        "[dashboard] cross-tenant 랭킹 집계 실패 — 본인 길드만 표시. " +
          "SUPABASE_SERVICE_ROLE_KEY 설정 여부를 확인하세요.",
        rankErr?.message || rankErr
      );
      const fallback = buildServerRankings(myScores || [], [guildRow], {
        contentName: content,
        gameName,
        currentGuildId: guildId,
      });
      serverRanks = fallback;
    }

    const chart = buildGuildWeeklyChart(myScores || [], guildId, content, 6);

    const memberIds = new Set((myMembers || []).map((m) => String(m.id)));
    const activeMembers = new Set();
    (myScores || []).forEach((row) => {
      const week =
        row.week_monday?.split?.("T")?.[0] ||
        row.created_at?.split?.("T")?.[0];
      const latestWeek = chart.series[chart.series.length - 1]?.weekMonday;
      if (week === latestWeek && memberIds.has(String(row.member_id))) {
        activeMembers.add(String(row.member_id));
      }
    });

    const activityRate =
      memberIds.size > 0
        ? Math.round((activeMembers.size / memberIds.size) * 100)
        : 0;

    return NextResponse.json({
      content,
      ...chart,
      activityRate,
      activeMembers: activeMembers.size,
      totalMembers: memberIds.size,
      serverRanks: serverRanks.ranks,
      currentServerRank: serverRanks.currentRank,
      rankingWeekMonday: serverRanks.weekMonday,
      // 디버그용 메타 — 동일 게임 풀 크기
      sameGameGuildCount: serverRanks.ranks?.length || 0,
    });
  } catch (error) {
    console.error("대시보드 조회 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
