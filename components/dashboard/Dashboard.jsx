'use client';

import { useState, useEffect, useRef } from "react";
import { TR } from "@/lib/theme";
import { guildForUi, resolveGuildMemberCount } from "@/lib/guild-display";
import { useGuildInsight } from "@/context/GuildInsightProvider";
import { useSyncedContentSelection } from "@/lib/use-synced-content";
import { buildContentQueryString } from "@/lib/content-fetch";
import { listContentTabs } from "@/lib/contents-catalog";
import { ContribScatterChart } from "@/components/dashboard/ContribScatterChart";
import { GuildRadarChart } from "@/components/dashboard/GuildRadarChart";

export function Dashboard({ t, guild }) {
  const { membersData, scoresData, contents, resolveContentDbNames } =
    useGuildInsight();
  const [chartContent, setChartContent] = useSyncedContentSelection(contents);
  const contentTabs = listContentTabs(contents);
  const guildKey = guild?.id != null ? String(guild.id) : "";
  const guildMembers =
    membersData?.[guildKey] ?? membersData?.[guild?.id] ?? [];
  const guildScores =
    scoresData?.[guildKey] ?? scoresData?.[guild?.id] ?? {};
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const memberCount = resolveGuildMemberCount(
    guild,
    membersData,
    chartData?.totalMembers,
    { excludeWithdrawn: true }
  );
  const g = guildForUi(guild, membersData, chartData?.totalMembers);

  const totals = chartData?.totals ?? [0, 0, 0, 0, 0, 0];
  const weekLabels = chartData?.series?.map((s) => s.label) ?? [];
  const latestScore = chartData?.latest ?? 0;
  const scoreDelta = chartData?.delta ?? 0;
  const scoreDeltaPct = chartData?.deltaPct ?? "0";
  const activeMembers = chartData?.activeMembers ?? 0;
  const activityRate = chartData?.activityRate ?? 0;
  const activityWeek = chartData?.activityWeek ?? chartData?.rankingWeekMonday;
  const prevActivity = Math.max(0, activityRate - 3);

  useEffect(() => {
    if (!guild?.id) return;
    let cancelled = false;
    setChartLoading(true);
    const contentQs = buildContentQueryString(chartContent, resolveContentDbNames);
    fetch(`/api/dashboard?guild_id=${guild.id}&${contentQs}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setChartData(data);
      })
      .catch(() => {
        if (!cancelled) setChartData(null);
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [guild?.id, chartContent, resolveContentDbNames]);

  const mets = g
    ? [
        {
          label: "GUILD MEMBERS",
          val: `${memberCount}`,
          delta: "(탈퇴 멤버 제외)",
          up: memberCount > 0,
        },
        {
          label: `${chartContent} 점수`,
          val: latestScore.toLocaleString(),
          delta: activityWeek
            ? `${activityWeek} 주차 · ${scoreDelta >= 0 ? "▲" : "▼"} ${Math.abs(scoreDelta)} (${scoreDeltaPct}%)`
            : `${scoreDelta >= 0 ? "▲" : "▼"} ${Math.abs(scoreDelta)} (${scoreDeltaPct}%)`,
          up: scoreDelta >= 0,
        },
        {
          label: `${chartContent} 랭킹`,
          val: chartData?.currentServerRank ? `#${chartData.currentServerRank}` : `#${g.rank}`,
          delta: chartData?.rankingWeekMonday
            ? `${chartData.rankingWeekMonday} 주차 기준`
            : "DB 랭킹",
          up: true,
        },
        {
          label: `${chartContent} 참여율`,
          val: `${activityRate}%`,
          delta:
            activityWeek
              ? `${activityWeek} 주 · 참여 ${activeMembers}/${memberCount}명`
              : `참여 ${activeMembers}/${memberCount}명`,
          up: activityRate >= prevActivity,
        },
      ]
    : [];

  const cvRef = useRef(null);

  useEffect(() => {
    if (!g || totals.length < 2) return;
    const cv = cvRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.offsetWidth,
      H = cv.offsetHeight;
    if (!W || !H) return;
    cv.width = W * dpr;
    cv.height = H * dpr;
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    const pad = 28,
      top = 10,
      bot = 20;
    const maxVal = Math.max(...totals, 1);
    const minV = Math.floor(maxVal * 0.85);
    const maxV = Math.ceil(maxVal * 1.1) || 1;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) {
      const y = top + ((H - top - bot) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(W - 6, y);
      ctx.strokeStyle = t.chartGrid;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    const pts = totals.map((v, i) => ({
      x: pad + (i * (W - pad - 6)) / (totals.length - 1),
      y: top + (H - top - bot) * (1 - (v - minV) / (maxV - minV)),
    }));
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = t.chartLine;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.lineTo(pts[pts.length - 1].x, H - bot);
    ctx.lineTo(pts[0].x, H - bot);
    ctx.closePath();
    ctx.fillStyle = t.chartFill;
    ctx.fill();
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = t.chartLine;
      ctx.fill();
    });
    weekLabels.forEach((l, i) => {
      if (!pts[i]) return;
      ctx.fillStyle = t.chartLabel;
      ctx.font = `400 8px 'Courier New'`;
      ctx.textAlign = "center";
      ctx.fillText(l, pts[i].x, H - 5);
    });
  }, [t, chartContent, g, totals, weekLabels]);

  if (!g) {
    return (
      <div style={{ flex: 1, padding: "18px 22px", color: t.textMuted, fontSize: 13 }}>
        길드 정보를 불러오는 중...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
      <div style={{ fontSize: 15, fontWeight: 500, color: t.text, marginBottom: 3 }}>{g.name} 대시보드</div>
      <div style={{ fontSize: 10, fontWeight: 400, color: t.textMuted, marginBottom: 16 }}>
        {g.game} · 랭킹 #{g.rank} · 등록일 {g.created}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        {mets.map((m, i) => (
          <div
            key={i}
            style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              padding: "13px 15px",
              transition: TR,
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 400, color: t.textMuted, letterSpacing: "0.12em", marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 21, fontWeight: 500, color: t.text, lineHeight: 1 }}>{m.val}</div>
            <div style={{ fontSize: 10, marginTop: 4, color: m.up ? t.up : t.dn }}>{m.delta}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: t.rptBg,
          border: `1px solid ${t.rptBorder}`,
          borderRadius: 10,
          padding: "13px 16px",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 500, color: t.accent, marginBottom: 6 }}>✦ GPT 주간 리포트</div>
        <div style={{ fontSize: 12, color: t.rptText, lineHeight: 1.7 }}>
          길드 <strong style={{ color: t.accent }}>{g.name}</strong> — {chartContent}{" "}
          {activityWeek ? `(${activityWeek} 주)` : ""} 합계{" "}
          <strong style={{ color: t.accent }}>{latestScore.toLocaleString()}</strong>점 (전주 대비 {scoreDeltaPct}%).
          {chartContent} 참여율 <strong style={{ color: t.accent }}>{activityRate}%</strong>
          ({activeMembers}/{memberCount}명).
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12, marginBottom: 14 }}>
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 11, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>
              주간 점수 추이
              <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 400, marginLeft: 6 }}>
                최근 6주 {chartLoading ? "· 로딩" : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {contentTabs.map((c) => (
                <button
                  key={c}
                  onClick={() => setChartContent(c)}
                  style={{
                    fontSize: 9,
                    padding: "2px 8px",
                    borderRadius: 20,
                    border: `1px solid ${c === chartContent ? t.borderStrong : t.border}`,
                    background: c === chartContent ? t.accentFaint : "transparent",
                    color: c === chartContent ? t.accent : t.textMuted,
                    fontWeight: 400,
                    cursor: "pointer",
                    fontFamily: "'Courier New',monospace",
                    transition: "all 0.15s",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                padding: "2px 10px",
                background: t.accentFaint,
                border: `1px solid ${t.borderStrong}`,
                color: t.accent,
                borderRadius: 20,
                fontWeight: 500,
              }}
            >
              {chartContent} 기준
            </span>
            <span style={{ fontSize: 10, fontWeight: 400, color: t.textMuted }}>
              최신: <strong style={{ color: t.up }}>{latestScore.toLocaleString()}</strong>
            </span>
            <span style={{ fontSize: 10, color: scoreDelta >= 0 ? t.up : t.dn }}>
              {scoreDelta >= 0 ? "▲" : "▼"} {Math.abs(scoreDelta)} ({scoreDeltaPct}%)
            </span>
          </div>
          <div style={{ height: 120 }}>
            <canvas ref={cvRef} style={{ width: "100%", height: "100%", display: "block" }} />
          </div>
        </div>
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 11, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>서버 랭킹 현황</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 8px",
                  background: t.accentFaint,
                  border: `1px solid ${t.border}`,
                  color: t.accent,
                  borderRadius: 20,
                }}
              >
                {g.game}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 8px",
                  background: t.accentFaint,
                  border: `1px solid ${t.borderStrong}`,
                  color: t.accent,
                  borderRadius: 20,
                  fontWeight: 500,
                }}
              >
                {chartContent}
              </span>
            </div>
          </div>
          {chartLoading && (
            <div style={{ fontSize: 10, fontWeight: 400, color: t.textMuted, padding: "8px 0" }}>랭킹 불러오는 중...</div>
          )}
          {!chartLoading && (!chartData?.serverRanks?.length ? (
            <div style={{ fontSize: 10, fontWeight: 400, color: t.textMuted, padding: "8px 0" }}>
              {chartContent} 점수 데이터가 없습니다. 점수 관리에서 입력 후 표시됩니다.
            </div>
          ) : (
            chartData.serverRanks.slice(0, 6).map((r, i) => (
              <div
                key={r.guildId ?? r.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 8px",
                  borderRadius: 6,
                  background: r.ours ? t.accentFaint : t.bgAlt,
                  border: r.ours ? `1px solid ${t.borderStrong}` : `0.5px solid ${t.border}`,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    width: 16,
                    fontSize: 11,
                    fontWeight: 500,
                    color: i === 0 ? "#d4a017" : r.ours ? t.accent : t.textMuted,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: 11, color: r.ours ? t.accent : t.text, fontWeight: r.ours ? 500 : 400 }}>
                  {r.name}
                  {r.ours ? " ★" : ""}
                </span>
                <span style={{ fontSize: 11, color: r.ours ? t.accent : t.text }}>{r.displayScore.toLocaleString()}</span>
              </div>
            ))
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12, marginBottom: 14 }}>
        <ContribScatterChart t={t} members={guildMembers} scoresByContent={guildScores} />
        <GuildRadarChart
          t={t}
          members={guildMembers}
          scoresByContent={guildScores}
          contents={contents}
        />
      </div>
    </div>
  );
}
