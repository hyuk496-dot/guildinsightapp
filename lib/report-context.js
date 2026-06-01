import { matchesContentName } from "@/lib/content-utils";
import { weekMondayKeyFromTimestamp, recentWeekMondays, formatWeekDisplay } from "@/lib/week-utils";

function rowWeekKey(row) {
  return (
    row.week_monday?.split?.("T")?.[0] ||
    weekMondayKeyFromTimestamp(row.created_at || row.updated_at)
  );
}

/**
 * 길드 컨텍스트(점수/멤버/주차 추이) 수집 → OpenAI 프롬프트용
 *
 * @param {object} supabase  사용자 컨텍스트 supabase 클라이언트 (RLS 적용)
 * @param {string|number} guildId
 * @param {string} contentFilter "전체" 또는 컨텐츠명
 */
export async function collectGuildReportContext(supabase, guildId, contentFilter = "전체") {
  const gid = Number(guildId);

  const [{ data: guild }, { data: members }, { data: scores }] = await Promise.all([
    supabase.from("guilds").select("*").eq("id", gid).maybeSingle(),
    supabase.from("members").select("id,nick,job,server").eq("guild_id", gid),
    supabase.from("scores").select("*").eq("guild_id", gid),
  ]);

  if (!guild) {
    throw new Error("길드를 찾을 수 없습니다.");
  }

  const memberList = members || [];
  const scoresList = scores || [];

  const filteredScores =
    contentFilter && contentFilter !== "전체"
      ? scoresList.filter((s) => matchesContentName(s.content_name, contentFilter))
      : scoresList;

  const targetWeeks = recentWeekMondays(4);
  const currentWeek = targetWeeks[targetWeeks.length - 1];
  const prevWeek = targetWeeks[targetWeeks.length - 2];

  const weeklyByContent = {};
  filteredScores.forEach((row) => {
    const week = rowWeekKey(row);
    if (!targetWeeks.includes(week)) return;
    const content = row.content_name;
    weeklyByContent[content] ??= {};
    weeklyByContent[content][week] ??= 0;
    weeklyByContent[content][week] += Number(row.score || 0);
  });

  const weekTotals = targetWeeks.map((wk) => {
    const total = Object.values(weeklyByContent).reduce(
      (sum, perWeek) => sum + (perWeek[wk] || 0),
      0
    );
    return { weekMonday: wk, label: formatWeekDisplay(wk), total };
  });

  const currentTotal = weekTotals[weekTotals.length - 1]?.total || 0;
  const prevTotal = weekTotals[weekTotals.length - 2]?.total || 0;
  const delta = currentTotal - prevTotal;
  const deltaPct = prevTotal > 0 ? ((delta / prevTotal) * 100).toFixed(1) : "0";

  const memberCurrent = new Map();
  filteredScores.forEach((row) => {
    if (rowWeekKey(row) !== currentWeek) return;
    const mid = String(row.member_id);
    memberCurrent.set(mid, (memberCurrent.get(mid) || 0) + Number(row.score || 0));
  });

  const memberPrev = new Map();
  filteredScores.forEach((row) => {
    if (rowWeekKey(row) !== prevWeek) return;
    const mid = String(row.member_id);
    memberPrev.set(mid, (memberPrev.get(mid) || 0) + Number(row.score || 0));
  });

  const memberRanking = memberList
    .map((m) => {
      const curr = memberCurrent.get(String(m.id)) || 0;
      const prev = memberPrev.get(String(m.id)) || 0;
      return {
        id: m.id,
        nick: m.nick,
        job: m.job || "—",
        currentScore: curr,
        prevScore: prev,
        delta: curr - prev,
      };
    })
    .sort((a, b) => b.currentScore - a.currentScore);

  const activeMembers = memberRanking.filter((m) => m.currentScore > 0).length;
  const totalMembers = memberList.length;
  const participation = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

  const lowParticipants = memberRanking
    .filter((m) => m.currentScore === 0)
    .slice(0, 8)
    .map((m) => m.nick);

  const top5 = memberRanking.slice(0, 5);
  const top5Total = top5.reduce((s, m) => s + m.currentScore, 0);
  const top5Share = currentTotal > 0 ? Math.round((top5Total / currentTotal) * 100) : 0;

  const contentBreakdown = Object.entries(weeklyByContent).map(([content, perWeek]) => {
    const cur = perWeek[currentWeek] || 0;
    const prv = perWeek[prevWeek] || 0;
    return {
      content,
      currentScore: cur,
      prevScore: prv,
      delta: cur - prv,
      deltaPct: prv > 0 ? ((cur - prv) / prv * 100).toFixed(1) : "0",
    };
  });

  return {
    guild: {
      id: guild.id,
      name: guild.name,
      game: guild.game_name || guild.game || "미지정 게임",
      memberCount: totalMembers,
    },
    contentFilter,
    weekMonday: currentWeek,
    weekLabel: formatWeekDisplay(currentWeek),
    weekTotals,
    summary: {
      currentTotal,
      prevTotal,
      delta,
      deltaPct,
      participation,
      activeMembers,
      totalMembers,
      top5Share,
    },
    topMembers: top5,
    bottomMembers: memberRanking.slice(-3).reverse(),
    lowParticipants,
    contentBreakdown,
    mvp: top5[0] || null,
  };
}
