import { weekMondayKey } from "@/lib/week-utils";

function normalizeWeekKey(v) {
  if (!v) return "";
  return String(v).split("T")[0].slice(0, 10);
}

/**
 * 이번 주 목표 1건 조회 (없으면 null)
 * - 재사용 목적: 대시보드/다른 메뉴에서 목표 점수 로드
 */
export async function fetchRankingTarget({
  guildId,
  contentName,
  weekMonday = weekMondayKey(),
}) {
  if (guildId == null) return null;
  const week = normalizeWeekKey(weekMonday);
  const res = await fetch(
    `/api/ranking-targets?guild_id=${guildId}&content_name=${encodeURIComponent(
      contentName
    )}&week_monday=${encodeURIComponent(week)}`,
    { method: "GET" }
  );
  if (!res.ok) return null;
  return await res.json();
}

