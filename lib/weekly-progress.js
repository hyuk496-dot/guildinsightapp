import { matchesContentName } from "@/lib/content-utils";
import { weekMondayKeyFromTimestamp } from "@/lib/week-utils";

function mondayDateFromKey(weekKey) {
  // weekKey: YYYY-MM-DD
  const [y, m, d] = String(weekKey || "").split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

const DOW_KO = ["월", "화", "수", "목", "금", "토", "일"];

function isoDateKeyUtc(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function rowUpdatedTime(row) {
  const iso = row?.updated_at || row?.created_at;
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
}

/**
 * 이번 주(월~일) 동안의 누적 입력 점수 시계열.
 *
 * 점수 row는 (member_id, content, week) 기준으로 upsert 되어 1주에 1행이므로,
 * 특정 날짜까지 입력된(=updated_at/created_at <= dayEnd) 행들의 score 합으로 누적선을 만든다.
 */
export function buildWeekCumulativeSeries(
  scores,
  guildId,
  contentName,
  weekKey,
  dbNames = null
) {
  const monday = mondayDateFromKey(weekKey);
  if (!monday) return { weekKey: null, series: [] };

  const weekRows = (scores || []).filter((r) => {
    if (String(r.guild_id) !== String(guildId)) return false;
    if (!matchesContentName(r.content_name, contentName, dbNames)) return false;
    const wk = r.week_monday?.split?.("T")?.[0] || weekMondayKeyFromTimestamp(r.created_at || r.updated_at);
    return wk === weekKey;
  });

  const series = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = addDays(monday, i);
    const dayEnd = addDays(monday, i + 1);
    const dayEndMs = dayEnd.getTime();

    let cumulative = 0;
    for (const r of weekRows) {
      if (rowUpdatedTime(r) < dayEndMs) {
        cumulative += Number(r.score || 0);
      }
    }

    series.push({
      dayIndex: i,
      dayLabel: DOW_KO[i] || String(i),
      dateKey: isoDateKeyUtc(dayStart),
      cumulative,
    });
  }

  return { weekKey, series };
}

