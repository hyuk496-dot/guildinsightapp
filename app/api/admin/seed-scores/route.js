export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { buildScoreSeedRows } from "@/lib/mock-score-seed";
import { CONTRIBS_INIT } from "@/lib/mock-data";
import { recentWeekMondays } from "@/lib/week-utils";

/**
 * Mock 점수 이력 → Supabase scores (주차 월요일 UTC, upsert)
 * POST /api/admin/seed-scores
 * 개발 환경에서만 실행 권장
 */
export async function POST() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_SCORE_SEED) {
    return NextResponse.json({ error: "production 에서는 비활성화" }, { status: 403 });
  }

  try {
    const { data: members, error: memErr } = await supabase
      .from("members")
      .select("id,guild_id,nick,job");

    if (memErr) throw memErr;
    if (!members?.length) {
      return NextResponse.json(
        { error: "members 테이블에 길드원이 없습니다. 먼저 길드원을 등록하세요." },
        { status: 400 }
      );
    }

    const weeks = recentWeekMondays(6);
    const seedRows = buildScoreSeedRows(members, weeks);

    let inserted = 0;
    let errors = [];

    for (const row of seedRows) {
      const { error } = await supabase.from("scores").upsert(row, {
        onConflict: "member_id,content_name,week_monday",
      });

      if (error) {
        const fallback = { ...row };
        delete fallback.week_monday;
        delete fallback.created_at;
        const { error: err2 } = await supabase.from("scores").upsert(fallback, {
          onConflict: "member_id,content_name",
        });
        if (err2) errors.push(`${row.nick}/${row.content_name}: ${err2.message}`);
        else inserted += 1;
      } else {
        inserted += 1;
      }
    }

    let contribSynced = 0;
    for (const [guildKey, contribList] of Object.entries(CONTRIBS_INIT)) {
      const guildMembers = members.filter((m) => String(m.guild_id) === String(guildKey));
      if (!guildMembers.length) continue;

      for (const c of contribList) {
        const matched = guildMembers.find(
          (m) => m.nick === c.nick || String(m.id) === String(c.id)
        );
        if (!matched) continue;

        const { error } = await supabase.from("contributions").upsert(
          {
            guild_id: Number(matched.guild_id),
            member_id: Number(matched.id),
            nick: matched.nick,
            score: c.score,
            history: c.history || [],
          },
          { onConflict: "guild_id,member_id" }
        );
        if (!error) contribSynced += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      members: members.length,
      weeks,
      scoreRows: seedRows.length,
      inserted,
      contribSynced,
      errors: errors.slice(0, 10),
      memberMap: members.map((m) => ({ id: m.id, nick: m.nick, guild_id: m.guild_id })),
    });
  } catch (error) {
    console.error("seed-scores 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
