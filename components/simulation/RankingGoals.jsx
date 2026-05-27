'use client';

import { useState, useEffect, useMemo } from "react";
import { CONTENTS_INIT } from "@/lib/mock-data";
import { selectStyle, optionStyle } from "@/lib/styles";
import { formatWeekDisplay } from "@/lib/week-utils";
import { MAX_BOOST, simulateGuildRank } from "@/lib/ranking-goals";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

function formatNum(n) {
  return Number(n || 0).toLocaleString();
}

const BOOST_STEP = 100_000; // 10만 단위 정밀 조절

export function RankingGoals({ t, guilds, activeGuild }) {
  const [guildId, setGuildId] = useState(activeGuild?.id ?? guilds[0]?.id);
  const [content, setContent] = useState(CONTENTS_INIT[0]);
  const [boost, setBoost] = useState(0);
  const [boostInput, setBoostInput] = useState("0");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [savedTarget, setSavedTarget] = useState(null);

  useEffect(() => {
    if (activeGuild?.id) setGuildId(activeGuild.id);
  }, [activeGuild?.id]);

  const weekKey = data?.activityWeek || data?.weekProgress?.weekKey || null;

  useEffect(() => {
    if (!guildId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/simulation?guild_id=${guildId}&content=${encodeURIComponent(content)}`
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "데이터 조회 실패");
        }
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setBoost(0);
        setBoostInput("0");
        setActivePreset(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [guildId, content]);

  useEffect(() => {
    if (!guildId || !weekKey) {
      setSavedTarget(null);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/ranking-targets?guild_id=${guildId}&content_name=${encodeURIComponent(
        content
      )}&week_monday=${encodeURIComponent(weekKey)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        const n = Number(json?.target_score || 0);
        setSavedTarget(Number.isFinite(n) && n > 0 ? n : null);
      })
      .catch(() => {
        if (!cancelled) setSavedTarget(null);
      });
    return () => {
      cancelled = true;
    };
  }, [guildId, content, weekKey]);

  const ranks = data?.ranks || [];
  const ourBase = data?.ourBaseScore ?? 0;
  const baseForSim = activePreset
    ? data?.scenarios?.[activePreset]?.totalScore ?? ourBase
    : ourBase;
  const simulatedTotal = baseForSim + boost;

  const sim = useMemo(
    () => simulateGuildRank(ranks, simulatedTotal),
    [ranks, simulatedTotal]
  );

  const currentGuild = guilds.find((g) => g.id === guildId) || guilds[0];
  const gameName = data?.gameName || currentGuild?.game_name || currentGuild?.game || "—";

  const applyBoost = (value) => {
    const v = Math.max(0, Math.min(MAX_BOOST, Math.round(Number(value) || 0)));
    setBoost(v);
    setBoostInput(String(v));
  };

  const onBoostInputChange = (e) => {
    const raw = e.target.value;
    // 사용자가 지우는 중에도 입력 UX가 깨지지 않게 처리
    if (raw === "") {
      setBoostInput("");
      setBoost(0);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setBoostInput(raw);
      return;
    }
    applyBoost(n);
  };

  const applyPreset = (key) => {
    const scenario = data?.scenarios?.[key];
    if (!scenario) return;
    setActivePreset(key);
    setBoost(0);
    setBoostInput("0");
  };

  const clearPreset = () => {
    setActivePreset(null);
    setBoost(0);
    setBoostInput("0");
  };

  const reloadSavedTarget = async () => {
    if (!guildId || !weekKey) return;
    try {
      const res = await fetch(
        `/api/ranking-targets?guild_id=${guildId}&content_name=${encodeURIComponent(
          content
        )}&week_monday=${encodeURIComponent(weekKey)}`
      );
      if (!res.ok) {
        setSavedTarget(null);
        return;
      }
      const json = await res.json();
      const n = Number(json?.target_score || 0);
      setSavedTarget(Number.isFinite(n) && n > 0 ? n : null);
    } catch {
      setSavedTarget(null);
    }
  };

  const saveTarget = async () => {
    if (!guildId || !weekKey) return;
    const target = Math.max(0, Math.round(simulatedTotal));
    if (!Number.isFinite(target) || target <= 0) return;
    const prev = savedTarget;
    setSavedTarget(target);
    try {
      const res = await fetch("/api/ranking-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guild_id: Number(guildId),
          content_name: content,
          week_monday: weekKey,
          target_score: target,
          target_rank: sim.rank,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "목표 저장 실패");
      }
      const saved = await res.json();
      const n = Number(saved?.target_score ?? target);
      setSavedTarget(Number.isFinite(n) && n > 0 ? n : target);
    } catch (err) {
      setSavedTarget(prev);
      alert(err.message || "목표 저장에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  const clearTarget = async () => {
    if (!guildId || !weekKey) return;
    const prev = savedTarget;
    setSavedTarget(null);
    try {
      const res = await fetch(
        `/api/ranking-targets?guild_id=${guildId}&content_name=${encodeURIComponent(
          content
        )}&week_monday=${encodeURIComponent(weekKey)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "목표 해제 실패");
      }
    } catch (err) {
      setSavedTarget(prev);
      alert(err.message || "목표 해제에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  const presets = [
    {
      key: "inactive_fill",
      title: "미참여자 보충",
      sub: data?.scenarios?.inactive_fill?.description,
    },
    {
      key: "full_participation",
      title: "활동 멤버 전원 참여",
      sub: data?.scenarios?.full_participation?.description,
    },
  ];

  const weekProgress = data?.weekProgress?.series || [];
  const chartMax = useMemo(() => {
    const maxCurrent = weekProgress.reduce(
      (m, p) => Math.max(m, Number(p.cumulative || 0)),
      0
    );
    const maxTarget = Math.max(
      savedTarget || 0,
      simulatedTotal || 0,
      baseForSim || 0
    );
    const base = Math.max(maxCurrent, maxTarget, 1);
    return Math.ceil(base * 1.1);
  }, [weekProgress, savedTarget, simulatedTotal, baseForSim]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: t.text }}>랭킹 목표</div>
        <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2, lineHeight: 1.6 }}>
          우리 길드 데이터 기반 순위 갭 분석 · 대시보드와 동일한 주차·랭킹 규칙
          {data?.weekMonday && ` · ${formatWeekDisplay(data.weekMonday)} 주차`}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
          padding: "10px 14px",
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 9,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 11, color: t.textMuted }}>길드</span>
        <select
          value={guildId ?? ""}
          onChange={(e) => {
            setGuildId(+e.target.value);
            clearPreset();
          }}
          style={{ ...selectStyle(t), minWidth: 180 }}
        >
          {guilds.map((g) => (
            <option key={g.id} value={g.id} style={optionStyle(t)}>
              {g.name} ({g.game_name || g.game || "—"})
            </option>
          ))}
        </select>
        <span
          style={{
            fontSize: 11,
            padding: "3px 10px",
            background: t.accentFaint,
            border: `1px solid ${t.borderStrong}`,
            color: t.accent,
            borderRadius: 20,
          }}
        >
          {gameName}
        </span>
        <span style={{ fontSize: 11, color: t.textMuted }}>
          동일 게임 길드 {data?.sameGameCount ?? ranks.length}개
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {CONTENTS_INIT.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setContent(c);
              clearPreset();
            }}
            style={{
              fontSize: 11,
              padding: "5px 14px",
              borderRadius: 20,
              border: `1px solid ${content === c ? t.borderStrong : t.border}`,
              background: content === c ? t.accentFaint : "transparent",
              color: content === c ? t.accent : t.textSub,
              cursor: "pointer",
              fontFamily: "'Courier New',monospace",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: t.textMuted, fontSize: 12, padding: 24 }}>
          {content} 랭킹·참여 데이터 불러오는 중...
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 12,
            background: "rgba(255,91,91,0.08)",
            border: "1px solid rgba(255,91,91,0.3)",
            borderRadius: 9,
            color: t.dn,
            fontSize: 12,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && ranks.length === 0 && (
        <div
          style={{
            padding: 28,
            textAlign: "center",
            color: t.textMuted,
            fontSize: 12,
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 11,
          }}
        >
          {gameName} · {content} 점수가 없습니다. 점수 관리에서 입력 후 이용하세요.
        </div>
      )}

      {!loading && !error && ranks.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 12 }}>
                참여 시나리오 (원클릭)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {presets.map((p) => {
                  const sc = data?.scenarios?.[p.key];
                  const selected = activePreset === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => applyPreset(p.key)}
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        borderRadius: 9,
                        border: `1px solid ${selected ? t.borderStrong : t.border}`,
                        background: selected ? t.accentFaint : t.bgAlt,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: selected ? t.accent : t.text,
                          marginBottom: 4,
                        }}
                      >
                        {p.title}
                      </div>
                      <div style={{ fontSize: 10, color: t.textMuted, lineHeight: 1.5, marginBottom: 8 }}>
                        {p.sub}
                      </div>
                      {sc && (
                        <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                          <span style={{ color: t.text }}>
                            예상 총점 <strong>{formatNum(sc.totalScore)}</strong>
                          </span>
                          <span style={{ color: t.accent }}>
                            예상 #{sc.rank ?? "—"}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {activePreset && (
                <button
                  type="button"
                  onClick={clearPreset}
                  style={{
                    marginTop: 10,
                    fontSize: 10,
                    color: t.textMuted,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  시나리오 해제 · 현재 DB 총점 기준으로 돌아가기
                </button>
              )}
              {data?.participation && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 10,
                    color: t.textMuted,
                    lineHeight: 1.6,
                    padding: "8px 10px",
                    background: t.bgAlt,
                    borderRadius: 6,
                  }}
                >
                  활동 멤버 {data.participation.activeCount}명 · 이번 주 참여{" "}
                  {data.participation.participatedCount}명 · 미참여{" "}
                  {data.participation.zeroScoreCount}명
                  {data.participation.guildAvg > 0 &&
                    ` · 길드 평균 참고 ${formatNum(data.participation.guildAvg)}`}
                </div>
              )}
            </div>

            <div
              style={{
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 4 }}>
                우리 길드 추가 점수
              </div>
              <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 12 }}>
                기준 총점 {formatNum(baseForSim)}
                {activePreset ? " (시나리오 적용)" : " (DB)"} + 가산 0 ~ 10억
              </div>
              <input
                type="range"
                min={0}
                max={MAX_BOOST}
                step={BOOST_STEP}
                value={boost}
                onChange={(e) => applyBoost(e.target.value)}
                style={{ width: "100%", marginBottom: 10 }}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  min={0}
                  max={MAX_BOOST}
                  step={BOOST_STEP}
                  value={boostInput}
                  onChange={onBoostInputChange}
                  onBlur={() => applyBoost(boostInput === "" ? 0 : boostInput)}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 7,
                    border: `1px solid ${t.border}`,
                    background: t.inputBg,
                    color: t.text,
                    fontSize: 13,
                    fontFamily: "'Courier New',monospace",
                  }}
                />
                <span style={{ fontSize: 11, color: t.textMuted, flexShrink: 0 }}>점 가산</span>
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: t.accent,
                  fontFamily: "'Courier New',monospace",
                }}
              >
                시뮬 총점 = {formatNum(simulatedTotal)}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={saveTarget}
                  style={{
                    fontSize: 11,
                    padding: "7px 12px",
                    borderRadius: 8,
                    border: `1px solid ${t.borderStrong}`,
                    background: "rgba(255, 91, 91, 0.08)",
                    color: "#ff5b5b",
                    cursor: "pointer",
                    fontFamily: "'Courier New',monospace",
                    fontWeight: 500,
                  }}
                  title="현재 시뮬 총점을 이번 주 목표로 저장"
                >
                  목표로 저장
                </button>
                {savedTarget ? (
                  <button
                    type="button"
                    onClick={clearTarget}
                    style={{
                      fontSize: 11,
                      padding: "7px 12px",
                      borderRadius: 8,
                      border: `1px solid ${t.border}`,
                      background: "transparent",
                      color: t.textMuted,
                      cursor: "pointer",
                      fontFamily: "'Courier New',monospace",
                    }}
                    title="저장된 목표를 제거"
                  >
                    목표 해제
                  </button>
                ) : null}
                {savedTarget ? (
                  <span style={{ fontSize: 10, color: t.textMuted, alignSelf: "center" }}>
                    저장된 목표: <strong style={{ color: "#ff5b5b" }}>{formatNum(savedTarget)}</strong>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div
            style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 14 }}>
              {content} 순위 시뮬레이션
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
              <div style={{ background: t.bgAlt, borderRadius: 8, padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 4 }}>현재 순위</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: t.text }}>
                  {data?.currentRank ? `#${data.currentRank}` : "—"}
                </div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 4 }}>
                  {formatNum(ourBase)}점
                </div>
              </div>
              <div
                style={{
                  background: t.accentFaint,
                  borderRadius: 8,
                  padding: "12px",
                  textAlign: "center",
                  border: `1px solid ${t.borderStrong}`,
                }}
              >
                <div style={{ fontSize: 9, color: t.accentDim, marginBottom: 4 }}>예상 순위</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: t.accent }}>
                  {sim.rank ? `#${sim.rank}` : "—"}
                </div>
                <div style={{ fontSize: 9, color: t.accent, marginTop: 4 }}>
                  {formatNum(simulatedTotal)}점
                </div>
              </div>
              <div style={{ background: t.upBg, borderRadius: 8, padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: t.up, marginBottom: 4 }}>다음 순위 (+N)</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: t.up }}>
                  {sim.needed > 0 ? `+${formatNum(sim.needed)}` : sim.rank === 1 ? "1위" : "—"}
                </div>
                {sim.nextAboveName && sim.needed > 0 && (
                  <div style={{ fontSize: 9, color: t.textMuted, marginTop: 4 }}>
                    {sim.nextAboveName} 넘기기
                  </div>
                )}
              </div>
            </div>

            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8 }}>
              예상 순위표 ({gameName} · {content})
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {sim.sorted.map((r, i) => (
                <div
                  key={r.guildId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 6,
                    background: r.ours ? t.accentFaint : t.bgAlt,
                    border: r.ours ? `1px solid ${t.borderStrong}` : `0.5px solid ${t.border}`,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      fontSize: 11,
                      fontWeight: 500,
                      color: i === 0 ? "#d4a017" : r.ours ? t.accent : t.textMuted,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 11,
                      color: r.ours ? t.accent : t.text,
                      fontWeight: r.ours ? 500 : 400,
                    }}
                  >
                    {r.name}
                    {r.ours ? " ★" : ""}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: r.ours ? t.accent : t.text }}>
                    {formatNum(r.simScore)}
                  </span>
                  {r.ours && r.simScore !== r.displayScore && (
                    <span style={{ fontSize: 9, color: t.up }}>
                      +{formatNum(r.simScore - r.displayScore)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: t.text, marginBottom: 8 }}>
                이번 주 목표 vs 실시간 누적 입력
              </div>
              <div
                style={{
                  height: 180,
                  background: t.bgAlt,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  padding: "10px 10px 6px",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weekProgress} margin={{ top: 6, right: 10, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke={t.chartGrid} strokeWidth={0.6} vertical={false} />
                    <XAxis
                      dataKey="dayLabel"
                      tick={{ fill: t.textMuted, fontSize: 10 }}
                      axisLine={{ stroke: t.border }}
                      tickLine={{ stroke: t.border }}
                    />
                    <YAxis
                      domain={[0, chartMax]}
                      tick={{ fill: t.textMuted, fontSize: 10 }}
                      axisLine={{ stroke: t.border }}
                      tickLine={{ stroke: t.border }}
                      width={44}
                      tickFormatter={(v) => {
                        const n = Number(v || 0);
                        return n >= 1_000_000 ? `${Math.round(n / 1_000_000)}m` : `${Math.round(n / 1000)}k`;
                      }}
                    />
                    <Tooltip
                      formatter={(value) => [formatNum(value), "누적 점수"]}
                      labelFormatter={(label) => `${label}요일`}
                      contentStyle={{
                        background: t.bgCard,
                        border: `1px solid ${t.border}`,
                        borderRadius: 8,
                        fontSize: 11,
                        color: t.text,
                      }}
                    />

                    {savedTarget ? (
                      <ReferenceLine
                        y={savedTarget}
                        stroke="#ff5b5b"
                        strokeDasharray="6 4"
                        strokeWidth={1.4}
                        ifOverflow="extendDomain"
                      />
                    ) : null}

                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="none"
                      fillOpacity={0.18}
                      fill={t.accent}
                      isAnimationActive
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke={t.accent}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ fontSize: 10, color: t.textMuted, marginTop: 6, lineHeight: 1.5 }}>
                파란선: 이번 주 입력 누적 · 빨간 점선: 저장된 목표 총점
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
