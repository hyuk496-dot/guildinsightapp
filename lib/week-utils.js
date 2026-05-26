/** 해당 날짜가 속한 주의 월요일 00:00 (로컬) */
export function getWeekMonday(date = new Date()) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** DB 저장용 YYYY-MM-DD (해당 주 월요일) */
export function weekMondayKey(date = new Date()) {
  const monday = getWeekMonday(date);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const day = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Supabase created_at용: 해당 주 월요일 00:00 UTC */
export function weekMondayUtcIso(weekMondayOrDate) {
  const key =
    typeof weekMondayOrDate === "string" && weekMondayOrDate.length >= 10
      ? weekMondayOrDate.split("T")[0]
      : weekMondayKey(weekMondayOrDate);
  return `${key}T00:00:00.000Z`;
}

/** created_at 등에서 주 월요일 키 추출 */
export function weekMondayKeyFromTimestamp(iso) {
  if (!iso) return weekMondayKey();
  return weekMondayKey(new Date(iso));
}

/** UI 표시: 2026-05-18 → 2026.05.18 */
export function formatWeekDisplay(weekMondayIso) {
  if (!weekMondayIso) return "—";
  const [y, m, d] = String(weekMondayIso).split("T")[0].split("-");
  return `${y}.${m}.${d}`;
}

/** 차트 축 라벨: 2026-05-18 → 5/18 */
export function formatWeekChartLabel(weekMondayIso) {
  if (!weekMondayIso) return "";
  const [, m, d] = String(weekMondayIso).split("T")[0].split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** 최근 N개 주 월요일 (오래된 순) */
export function recentWeekMondays(count = 6, anchor = new Date()) {
  const monday = getWeekMonday(anchor);
  const weeks = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(monday);
    d.setDate(d.getDate() - i * 7);
    weeks.push(weekMondayKey(d));
  }
  return weeks;
}

export function weekHistoryLabel(index) {
  if (index === 0) return "최신";
  if (index === 1) return "전주";
  if (index === 2) return "전전주";
  return "-";
}

export function aggregateWeeklyHistory(rows = []) {
  const map = new Map();

  rows.forEach((row) => {
    const week =
      row.week_monday?.split?.("T")?.[0] ||
      weekMondayKeyFromTimestamp(row.created_at || row.updated_at);
    const rowTime = new Date(row.updated_at || row.created_at || 0).getTime();
    const existing = map.get(week);

    if (!existing || rowTime >= existing._time) {
      map.set(week, {
        weekMonday: week,
        date: formatWeekDisplay(week),
        score: Number(row.score || 0),
        prev_score: Number(row.prev_score || 0),
        recordedAt: row.created_at || row.updated_at,
        _time: rowTime,
      });
    }
  });

  return [...map.values()]
    .sort((a, b) => b.weekMonday.localeCompare(a.weekMonday))
    .map(({ weekMonday, date, score, prev_score, recordedAt }, index) => ({
      weekMonday,
      date,
      score,
      prev_score,
      recordedAt,
      note: weekHistoryLabel(index),
    }));
}

export function pickLatestScoresPerMemberContent(dbScores = []) {
  const best = new Map();

  dbScores.forEach((s) => {
    const guildKey = String(s.guild_id);
    const contentKey = s.content_name;
    const memberKey = String(s.member_id);
    const mapKey = `${guildKey}:${contentKey}:${memberKey}`;
    const week =
      s.week_monday?.split?.("T")?.[0] ||
      weekMondayKeyFromTimestamp(s.created_at || s.updated_at);
    const rowTime = new Date(s.updated_at || s.created_at || 0).getTime();
    const prev = best.get(mapKey);

    if (!prev || week > prev.week || (week === prev.week && rowTime >= prev._time)) {
      best.set(mapKey, { row: s, week, _time: rowTime });
    }
  });

  return [...best.values()].map(({ row, week }) => ({ ...row, _weekMonday: week }));
}
