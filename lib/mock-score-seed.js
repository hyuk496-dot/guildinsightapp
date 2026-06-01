import {
  PRIMARY_CONTENT_NAME,
  LEGACY_PRIMARY_CONTENT_NAME,
} from "@/lib/constants";
import { CONTENTS_INIT } from "@/lib/mock-data";
import { recentWeekMondays, weekMondayUtcIso } from "@/lib/week-utils";

/** 멤버·컨텐츠·주차별 시드 점수 (목업 이력 → DB 이관용) */
export function buildScoreSeedRows(members, weeks = recentWeekMondays(6)) {
  const rows = [];
  const contentMultipliers = {
    [PRIMARY_CONTENT_NAME]: 1,
    [LEGACY_PRIMARY_CONTENT_NAME]: 1,
    결투장: 0.85,
    공성전: 0.65,
    길드전: 0.9,
    강림: 0.35,
    "개인 컨텐츠": 0.55,
  };

  members.forEach((member, mi) => {
    const base = 400 + (mi % 7) * 80 + (Number(member.id) % 5) * 30;

    CONTENTS_INIT.forEach((content) => {
      const mult = contentMultipliers[content] ?? 0.7;

      weeks.forEach((week, wi) => {
        const growth = 1 + wi * 0.08 + (mi % 3) * 0.02;
        const score = Math.round(base * mult * growth);
        const prev = wi > 0 ? Math.round(base * mult * (growth - 0.06)) : 0;

        rows.push({
          member_id: Number(member.id),
          guild_id: Number(member.guild_id),
          nick: member.nick,
          job: member.job || "—",
          content_name: content,
          score,
          prev_score: prev,
          week_monday: week,
          created_at: weekMondayUtcIso(week),
        });
      });
    });
  });

  return rows;
}
