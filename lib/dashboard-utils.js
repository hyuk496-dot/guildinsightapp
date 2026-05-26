import {
  weekMondayKeyFromTimestamp,
  formatWeekChartLabel,
  recentWeekMondays,
} from "@/lib/week-utils";

/** 길드·컨텐츠별 주차 합산 (대시보드 꺾은선 차트) */
export function buildGuildWeeklyChart(dbScores, guildId, contentName, weekCount = 6) {
  const guildKey = String(guildId);
  const targetWeeks = recentWeekMondays(weekCount);
  const sums = new Map(targetWeeks.map((w) => [w, 0]));

  (dbScores || []).forEach((row) => {
    if (String(row.guild_id) !== guildKey || row.content_name !== contentName) return;
    const week =
      row.week_monday?.split?.("T")?.[0] ||
      weekMondayKeyFromTimestamp(row.created_at || row.updated_at);
    if (!sums.has(week)) return;
    sums.set(week, sums.get(week) + Number(row.score || 0));
  });

  const series = targetWeeks.map((weekMonday) => ({
    weekMonday,
    label: formatWeekChartLabel(weekMonday),
    total: sums.get(weekMonday) || 0,
  }));

  const totals = series.map((s) => s.total);
  const latest = totals[totals.length - 1] ?? 0;
  const prev = totals[totals.length - 2] ?? 0;
  const delta = latest - prev;
  const deltaPct = prev ? ((delta / prev) * 100).toFixed(1) : "0";

  return { series, totals, latest, prev, delta, deltaPct };
}
