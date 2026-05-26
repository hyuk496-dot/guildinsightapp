/**
 * OpenAI 없이 길드 컨텍스트만으로 결정론적 리포트를 생성한다.
 * - quota/key 오류 시 fallback 용도
 * - 모든 수치/이름은 ctx에서만 가져오므로 환각이 없다.
 */
export function generateLocalReport(ctx) {
  const s = ctx.summary;
  const direction = s.delta >= 0 ? "성장" : "감소";
  const arrow = s.delta >= 0 ? "▲" : "▼";
  const filterTag = ctx.contentFilter && ctx.contentFilter !== "전체" ? `[${ctx.contentFilter}] ` : "";

  const title = `${filterTag}${ctx.guild.name} 주간 리포트 (${ctx.weekLabel})`;

  const summary = [
    `이번 주 ${ctx.guild.name} 길드는 총 ${s.currentTotal.toLocaleString()}점을 기록하여`,
    `전주(${s.prevTotal.toLocaleString()}점) 대비 ${arrow} ${Math.abs(s.delta).toLocaleString()}점 (${s.deltaPct}%) ${direction}했습니다.`,
    `참여율은 ${s.participation}% (${s.activeMembers}/${s.totalMembers}명)이며, 상위 5명이 전체 점수의 ${s.top5Share}%를 담당했습니다.`,
  ].join(" ");

  const top = ctx.topMembers.slice(0, 3);
  const performanceLines = [
    `· 주간 합계: ${s.currentTotal.toLocaleString()}점 (전주 ${s.prevTotal.toLocaleString()}, ${arrow} ${Math.abs(s.delta).toLocaleString()}, ${s.deltaPct}%)`,
    `· 참여율: ${s.participation}% — ${s.activeMembers}명 입력 / ${s.totalMembers}명 등록`,
    `· 상위 5인 점수 점유율: ${s.top5Share}%`,
  ];
  if (top.length) {
    performanceLines.push(
      `· 이번 주 상위 기여자: ${top.map((m) => `${m.nick}(${m.currentScore.toLocaleString()})`).join(", ")}`
    );
  }
  if (ctx.weekTotals?.length) {
    performanceLines.push(
      `· 최근 ${ctx.weekTotals.length}주 합계 추이: ${ctx.weekTotals.map((w) => w.total.toLocaleString()).join(" → ")}`
    );
  }

  let mvpContent = "이번 주 점수 데이터가 없어 MVP를 산출할 수 없습니다.";
  if (ctx.mvp && ctx.mvp.currentScore > 0) {
    const m = ctx.mvp;
    const mvpDelta = m.delta >= 0 ? `▲ +${m.delta}` : `▼ ${m.delta}`;
    mvpContent = [
      `${m.nick} (${m.job}) — 주간 ${m.currentScore.toLocaleString()}점으로 1위. 전주 대비 ${mvpDelta}.`,
      ctx.contentFilter && ctx.contentFilter !== "전체"
        ? `${ctx.contentFilter} 컨텐츠 기준 최상위 기록.`
        : `전체 컨텐츠 합산 기준 최상위 기록.`,
    ].join(" ");
  }

  const improveLines = [];
  if (ctx.lowParticipants?.length) {
    improveLines.push(
      `· 점수 미입력 ${ctx.lowParticipants.length}명: ${ctx.lowParticipants.slice(0, 6).join(", ")} — 참여 독려 필요.`
    );
  }
  const negative = ctx.contentBreakdown?.filter((c) => c.delta < 0) || [];
  if (negative.length) {
    improveLines.push(
      `· 전주 대비 하락 컨텐츠: ${negative.map((c) => `${c.content} (${c.deltaPct}%)`).join(", ")}.`
    );
  }
  if (s.top5Share >= 65) {
    improveLines.push(`· 상위 5인 의존도(${s.top5Share}%)가 높습니다. 중하위 멤버 기여 확대 필요.`);
  }
  if (s.participation < 70) {
    improveLines.push(`· 참여율(${s.participation}%)이 70% 미만입니다. 일정 공지/리마인드 강화 권장.`);
  }
  if (improveLines.length === 0) {
    improveLines.push("· 이번 주 큰 개선점은 발견되지 않았습니다. 현재 운영 페이스를 유지하세요.");
  }

  const strategyLines = [];
  const positive = ctx.contentBreakdown?.filter((c) => c.delta > 0).sort((a, b) => b.delta - a.delta) || [];
  if (positive.length) {
    strategyLines.push(`· 상승 모멘텀 컨텐츠: ${positive.slice(0, 2).map((c) => c.content).join(", ")} — 집중 공략 권장.`);
  }
  if (negative.length) {
    strategyLines.push(`· 하락 컨텐츠 회복 전략 수립: ${negative.slice(0, 2).map((c) => c.content).join(", ")}.`);
  }
  if (ctx.bottomMembers?.length) {
    const names = ctx.bottomMembers.map((m) => m.nick).slice(0, 3).join(", ");
    strategyLines.push(`· 하위 기여자(${names}) 1:1 면담 또는 파티 구성 재정비 검토.`);
  }
  strategyLines.push(`· 다음 주 목표: 전주 대비 +5% 점수 또는 참여율 ${Math.min(s.participation + 5, 100)}% 이상.`);

  const sections = [
    { title: "📊 성과 요약", content: performanceLines.join("\n") },
    { title: "🔥 MVP 분석", content: mvpContent },
    { title: "⚠️ 개선 필요", content: improveLines.join("\n") },
    { title: "🎯 다음 주 전략", content: strategyLines.join("\n") },
  ];

  const chips = [];
  if (ctx.mvp && ctx.mvp.currentScore > 0) chips.push(`MVP: ${ctx.mvp.nick}`);
  chips.push(`참여율 ${s.participation}%`);
  chips.push(`전주 대비 ${arrow}${Math.abs(s.delta)}`);
  if (ctx.contentFilter && ctx.contentFilter !== "전체") chips.push(`기준: ${ctx.contentFilter}`);
  if (negative.length) chips.push(`하락: ${negative[0].content}`);

  return {
    title,
    summary,
    sections,
    chips,
    model: "local-fallback",
    usage: null,
  };
}
