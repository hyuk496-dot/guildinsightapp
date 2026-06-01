export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getAdminSupabase } from "@/lib/supabase-admin";
import {
  matchesContentName,
  parseContentNamesFromSearchParams,
  applyContentNameFilterToQuery,
} from "@/lib/content-utils";
import { buildServerRankings } from "@/lib/server-rank-utils";
import { buildParticipationScenarios } from "@/lib/ranking-goals";
import { buildWeekCumulativeSeries } from "@/lib/weekly-progress";

export async function GET(request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get("guild_id");
  const { content, names } = parseContentNamesFromSearchParams(searchParams);

  if (!guildId) {
    return NextResponse.json({ error: "guild_id 필요" }, { status: 400 });
  }
  if (!names.length) {
    return NextResponse.json({ error: "content 필요" }, { status: 400 });
  }

  try {
    const [
      { data: guildRow },
      { data: myMembers },
      { data: myScores, error: scoreErr },
    ] = await Promise.all([
      supabase
        .from("guilds")
        .select("id, name, game_name")
        .eq("id", Number(guildId))
        .maybeSingle(),
      supabase
        .from("members")
        .select("id, nick, left_at")
        .eq("guild_id", Number(guildId)),
      supabase.from("scores").select("*").eq("guild_id", Number(guildId)),
    ]);

    if (!guildRow) {
      return NextResponse.json(
        { error: "접근 권한이 없거나 존재하지 않는 길드입니다." },
        { status: 403 }
      );
    }
    if (scoreErr) throw scoreErr;

    const gameName = guildRow.game_name || guildRow.game || "미지정 게임";
    const contentScores = (myScores || []).filter((s) =>
      matchesContentName(s.content_name, content, names)
    );

    let ranking = { ranks: [], currentRank: null, weekMonday: null };
    let sameGameGuilds = [guildRow];

    try {
      const admin = getAdminSupabase();
      const { data: gameGuilds } = await admin
        .from("guilds")
        .select("id, name, game_name")
        .eq("game_name", gameName);
      sameGameGuilds = gameGuilds || [guildRow];

      const gameGuildIds = sameGameGuilds.map((g) => Number(g.id));
      const { data: scoresAll } = gameGuildIds.length
        ? await applyContentNameFilterToQuery(
            admin
              .from("scores")
              .select(
                "guild_id, content_name, score, week_monday, created_at, updated_at, member_id"
              )
              .in("guild_id", gameGuildIds),
            names
          )
        : { data: [] };

      ranking = buildServerRankings(scoresAll || [], sameGameGuilds, {
        contentName: content,
        gameName,
        currentGuildId: guildId,
        dbNames: names,
      });
    } catch (rankErr) {
      console.warn(
        "[simulation] cross-tenant 집계 실패 — 본인 길드만 표시.",
        rankErr?.message || rankErr
      );
      ranking = buildServerRankings(contentScores, [guildRow], {
        contentName: content,
        gameName,
        currentGuildId: guildId,
        dbNames: names,
      });
    }

    const participation = buildParticipationScenarios(
      myScores || [],
      myMembers || [],
      guildId,
      content,
      ranking.ranks
    );

    const ourEntry = ranking.ranks.find((r) => r.ours);
    const ourBaseScore =
      ourEntry?.displayScore ?? participation.currentTotal ?? 0;

    const activityWeek =
      participation?.activityWeek || ranking.weekMonday || null;
    const weekProgress =
      activityWeek != null
        ? buildWeekCumulativeSeries(myScores || [], guildId, content, activityWeek, names)
        : { weekKey: null, series: [] };

    return NextResponse.json({
      content,
      gameName,
      currentGuild: { id: guildRow.id, name: guildRow.name },
      sameGameCount: sameGameGuilds.length,
      ranks: ranking.ranks,
      currentRank: ranking.currentRank,
      weekMonday: ranking.weekMonday,
      ourBaseScore,
      participation,
      scenarios: participation.scenarios,
      activityWeek,
      weekProgress,
    });
  } catch (error) {
    console.error("랭킹 목표 조회 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
