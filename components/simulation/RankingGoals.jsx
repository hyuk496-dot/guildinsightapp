'use client';

import { useState, useEffect, useMemo } from "react";
import { selectStyle, optionStyle } from "@/lib/styles";
import { useGuildInsight } from "@/context/GuildInsightProvider";
import { useSyncedContentSelection } from "@/lib/use-synced-content";
import { buildContentQueryString } from "@/lib/content-fetch";
import { listContentTabs } from "@/lib/contents-catalog";
import { formatWeekDisplay } from "@/lib/week-utils";
import { MAX_BOOST, simulateGuildRank } from "@/lib/ranking-goals";
import {
  loadVirtualCompetitors,
  persistVirtualCompetitors,
  createVirtualCompetitorId,
  virtualCompetitorsToRankRows,
  assertCanAddVirtualCompetitors,
  filterVirtualCompetitorsByGame,
  MAX_VIRTUAL_COMPETITORS_PER_GAME,
  MAX_SERVER_RANKS_IN_SIM,
} from "@/lib/virtual-competitors-storage";
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

/** 순위 시뮬레이션 점수 인라인: 파란 총점 · [ 흰색 굵은 시나리오 ] · +초록 가산 */
function SimScoreInline({ total, scenarioBonus, guildBoost, t, fontSize = 11 }) {
  const mono = { fontFamily: "'Courier New',monospace", fontSize };
  const hasParts = scenarioBonus > 0 || guildBoost > 0;
  return (
    <span
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        justifyContent: "center",
        gap: "0 6px",
        lineHeight: 1.35,
        ...mono,
      }}
    >
      <span style={{ ...mono, color: t.accent, fontWeight: 600 }}>{formatNum(total)}</span>
      {scenarioBonus > 0 ? (
        <span style={{ ...mono, color: "#fff", fontWeight: 700 }}>
          [ {formatNum(scenarioBonus)} ]
        </span>
      ) : null}
      {guildBoost > 0 ? (
        <span style={{ ...mono, color: t.up, fontWeight: 500 }}>+{formatNum(guildBoost)}</span>
      ) : null}
      {!hasParts ? (
        <span style={{ ...mono, color: t.textMuted, fontWeight: 400, fontSize: fontSize - 1 }}>
          가산 없음
        </span>
      ) : null}
    </span>
  );
}

const BOOST_STEP = 100_000; // 10만 단위 정밀 조절
const RANK_ROW_H = 36;
const SERVER_TABLE_MAX_H = RANK_ROW_H * 10;
const RIVAL_LIST_MAX_H = RANK_ROW_H * 5;
const SERVER_MIN_SLOTS = 5;

export function RankingGoals({ t, guilds, activeGuild }) {
  const { contents, resolveContentDbNames } = useGuildInsight();
  const [guildId, setGuildId] = useState(activeGuild?.id ?? guilds[0]?.id);
  const [content, setContent] = useSyncedContentSelection(contents);
  const contentTabs = listContentTabs(contents);
  const [boost, setBoost] = useState(0);
  const [boostInput, setBoostInput] = useState("0");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [savedTarget, setSavedTarget] = useState(null);
  const [virtualCompetitors, setVirtualCompetitors] = useState([]);
  const [rivalFormOpen, setRivalFormOpen] = useState(false);
  const [rivalName, setRivalName] = useState("");
  const [rivalScore, setRivalScore] = useState("");
  const [editingRivalId, setEditingRivalId] = useState(null);
  const [editRivalName, setEditRivalName] = useState("");
  const [editRivalScore, setEditRivalScore] = useState("");

  useEffect(() => {
    setVirtualCompetitors(loadVirtualCompetitors());
  }, []);

  const commitVirtualCompetitors = (next) => {
    const res = persistVirtualCompetitors(next);
    if (res.ok) setVirtualCompetitors(res.list);
    return res.ok;
  };

  useEffect(() => {
    if (activeGuild?.id) setGuildId(activeGuild.id);
  }, [activeGuild?.id]);

  const weekKey = data?.activityWeek || data?.weekProgress?.weekKey || null;

  useEffect(() => {
    if (!guildId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const contentQs = buildContentQueryString(content, resolveContentDbNames);
    fetch(`/api/simulation?guild_id=${guildId}&${contentQs}`)
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
  }, [guildId, content, resolveContentDbNames]);

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

  const currentGuild = guilds.find((g) => g.id === guildId) || guilds[0];
  const gameName = data?.gameName || currentGuild?.game_name || currentGuild?.game || "—";

  const rivalsForGame = useMemo(
    () => filterVirtualCompetitorsByGame(virtualCompetitors, gameName),
    [virtualCompetitors, gameName]
  );

  useEffect(() => {
    setRivalFormOpen(false);
    setEditingRivalId(null);
    setEditRivalName("");
    setEditRivalScore("");
  }, [gameName, guildId]);

  const ranks = data?.ranks || [];
  const serverRanksCapped = useMemo(() => ranks.slice(0, MAX_SERVER_RANKS_IN_SIM), [ranks]);
  const mergedRanks = useMemo(
    () => [
      ...serverRanksCapped,
      ...virtualCompetitorsToRankRows(rivalsForGame),
    ],
    [serverRanksCapped, rivalsForGame]
  );
  const ourBase = data?.ourBaseScore ?? 0;
  const baseForSim = activePreset
    ? data?.scenarios?.[activePreset]?.totalScore ?? ourBase
    : ourBase;
  const simulatedTotal = baseForSim + boost;

  /** 시나리오 원클릭 가산 vs 슬라이더 가산 (표시·순위표 분리용, API/차트 미변경) */
  const scenarioBonus = useMemo(() => {
    if (!activePreset || !data?.scenarios) return 0;
    const sc = data.scenarios[activePreset];
    const added = Number(sc?.addedPoints);
    if (Number.isFinite(added) && added >= 0) return added;
    return Math.max(0, baseForSim - ourBase);
  }, [activePreset, data?.scenarios, baseForSim, ourBase]);

  const guildBoost = boost;
  const finalExpectedTotal = ourBase + scenarioBonus + guildBoost;

  const sim = useMemo(
    () => simulateGuildRank(mergedRanks, simulatedTotal),
    [mergedRanks, simulatedTotal]
  );

  /** DB + 로컬 라이벌 통합 정렬 결과 (슬라이더·시나리오 반영) */
  const rankTableRows = useMemo(
    () => sim.sorted.map((r, idx) => ({ ...r, rank: idx + 1 })),
    [sim.sorted]
  );

  const competitorCount = rankTableRows.filter((r) => !r.ours).length;
  const showRankEmptyHint = competitorCount === 0;

  const rankTableSlots = useMemo(() => {
    if (!showRankEmptyHint || rankTableRows.length >= SERVER_MIN_SLOTS) {
      return rankTableRows;
    }
    const slots = [...rankTableRows];
    while (slots.length < SERVER_MIN_SLOTS) {
      slots.push({ isPlaceholder: true, guildId: `ph-${slots.length}` });
    }
    return slots;
  }, [rankTableRows, showRankEmptyHint]);

  const addRivalGuild = () => {
    const name = rivalName.trim();
    if (!name) return;
    if (!assertCanAddVirtualCompetitors(virtualCompetitors, gameName)) return;
    const score = Math.max(0, Math.round(Number(rivalScore) || 0));
    const next = [
      ...virtualCompetitors,
      { id: createVirtualCompetitorId(), name, score, game: gameName },
    ];
    if (commitVirtualCompetitors(next)) {
      setRivalName("");
      setRivalScore("");
      setRivalFormOpen(false);
    }
  };

  const startEditRival = (v) => {
    setEditingRivalId(v.id);
    setEditRivalName(v.name);
    setEditRivalScore(String(v.score));
  };

  const cancelEditRival = () => {
    setEditingRivalId(null);
    setEditRivalName("");
    setEditRivalScore("");
  };

  const saveEditRival = () => {
    const name = editRivalName.trim();
    if (!name || !editingRivalId) return;
    const score = Math.max(0, Math.round(Number(editRivalScore) || 0));
    const next = virtualCompetitors.map((v) =>
      v.id === editingRivalId ? { ...v, name, score } : v
    );
    if (commitVirtualCompetitors(next)) cancelEditRival();
  };

  const deleteRivalGuild = (id) => {
    const next = virtualCompetitors.filter((v) => v.id !== id);
    commitVirtualCompetitors(next);
    if (editingRivalId === id) cancelEditRival();
  };

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
        {contentTabs.map((c) => (
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

            <div
              style={{
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 8 }}>
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
                        return n >= 1_000_000
                          ? `${Math.round(n / 1_000_000)}m`
                          : `${Math.round(n / 1000)}k`;
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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 0,
            }}
          >
            <div
              style={{
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: "16px 18px",
                flex: "0 0 auto",
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
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: t.accentDim,
                      letterSpacing: "0.04em",
                    }}
                  >
                    최종 예상 총점
                  </div>
                  <SimScoreInline
                    total={finalExpectedTotal}
                    scenarioBonus={scenarioBonus}
                    guildBoost={guildBoost}
                    t={t}
                    fontSize={12}
                  />
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
              예상 순위표 ({gameName} · {content}) · 서버+라이벌 통합
            </div>
            <div
              style={{
                position: "relative",
                maxHeight: SERVER_TABLE_MAX_H,
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              {showRankEmptyHint && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                    zIndex: 1,
                    padding: "0 12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: t.textMuted,
                      textAlign: "center",
                      lineHeight: 1.5,
                    }}
                  >
                    현재 동일 게임 타 길드 정보가 없습니다
                  </span>
                </div>
              )}
              {rankTableSlots.map((r) =>
                r.isPlaceholder ? (
                  <div
                    key={r.guildId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      minHeight: RANK_ROW_H,
                      padding: "7px 10px",
                      borderRadius: 6,
                      background: "transparent",
                      border: `0.5px dashed ${t.border}`,
                      marginBottom: 4,
                      opacity: 0.35,
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 10, color: "transparent" }}>—</span>
                  </div>
                ) : (
                  <div
                    key={r.guildId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minHeight: RANK_ROW_H,
                      padding: "7px 10px",
                      borderRadius: 6,
                      background: r.ours
                        ? t.accentFaint
                        : r.isVirtual
                          ? "rgba(148, 163, 184, 0.06)"
                          : t.bgAlt,
                      border: r.ours
                        ? `1px solid ${t.borderStrong}`
                        : r.isVirtual
                          ? `0.5px dashed ${t.border}`
                          : `0.5px solid ${t.border}`,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        fontSize: 11,
                        fontWeight: 500,
                        color:
                          r.rank === 1 ? "#d4a017" : r.ours ? t.accent : t.textMuted,
                      }}
                    >
                      {r.rank}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 11,
                        color: r.ours ? t.accent : t.text,
                        fontWeight: r.ours || r.isVirtual ? 500 : 400,
                        minWidth: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      {r.isVirtual ? (
                        <span
                          style={{
                            fontSize: 8,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: "rgba(148, 163, 184, 0.15)",
                            border: `1px solid ${t.border}`,
                            color: t.textMuted,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          라이벌
                        </span>
                      ) : null}
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.name}
                        {r.ours ? " ★" : ""}
                      </span>
                    </span>
                    {r.ours ? (
                      <span style={{ flexShrink: 0, textAlign: "right" }}>
                        <SimScoreInline
                          total={r.simScore}
                          scenarioBonus={scenarioBonus}
                          guildBoost={guildBoost}
                          t={t}
                          fontSize={10}
                        />
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: r.isVirtual ? t.text : t.text,
                          fontFamily: "'Courier New',monospace",
                          flexShrink: 0,
                        }}
                      >
                        {formatNum(r.simScore)}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
            </div>

            <div
              style={{
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: "16px 18px",
                flex: "0 0 auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 6,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 500, color: t.text }}>
                  경쟁 길드 관리
                </span>
                <button
                  type="button"
                  onClick={() => setRivalFormOpen((o) => !o)}
                  style={{
                    fontSize: 10,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: `1px solid ${t.borderStrong}`,
                    background: rivalFormOpen ? t.accentFaint : t.bgAlt,
                    color: t.accent,
                    cursor: "pointer",
                    fontFamily: "'Courier New',monospace",
                  }}
                >
                  + 라이벌 추가
                </button>
              </div>
              <p
                style={{
                  fontSize: 9,
                  color: t.textMuted,
                  lineHeight: 1.55,
                  margin: "0 0 10px",
                }}
              >
                ⚠️ 라이벌 길드는 각 게임별 최대 {MAX_VIRTUAL_COMPETITORS_PER_GAME}개까지 등록
                가능하며, 브라우저 쿠키/캐시 삭제 시 데이터가 함께 초기화될 수 있습니다.
              </p>

              {rivalFormOpen && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "flex-end",
                    marginBottom: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: t.bgAlt,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <label style={{ flex: "1 1 120px", minWidth: 100 }}>
                    <span style={{ fontSize: 9, color: t.textMuted, display: "block", marginBottom: 4 }}>
                      길드명
                    </span>
                    <input
                      type="text"
                      value={rivalName}
                      onChange={(e) => setRivalName(e.target.value)}
                      placeholder="라이벌 길드명"
                      maxLength={40}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: `1px solid ${t.border}`,
                        background: t.inputBg,
                        color: t.text,
                        fontSize: 11,
                      }}
                    />
                  </label>
                  <label style={{ flex: "0 1 100px", minWidth: 80 }}>
                    <span style={{ fontSize: 9, color: t.textMuted, display: "block", marginBottom: 4 }}>
                      점수
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={rivalScore}
                      onChange={(e) => setRivalScore(e.target.value)}
                      placeholder="0"
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: `1px solid ${t.border}`,
                        background: t.inputBg,
                        color: t.text,
                        fontSize: 11,
                        fontFamily: "'Courier New',monospace",
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={addRivalGuild}
                    style={{
                      fontSize: 10,
                      padding: "7px 12px",
                      borderRadius: 6,
                      border: `1px solid ${t.borderStrong}`,
                      background: t.accentFaint,
                      color: t.accent,
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    등록
                  </button>
                </div>
              )}

              <div
                style={{
                  maxHeight: RIVAL_LIST_MAX_H,
                  overflowY: "auto",
                  overflowX: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {rivalsForGame.length === 0 ? (
                  <div
                    style={{
                      fontSize: 10,
                      color: t.textMuted,
                      padding: "8px 10px",
                      borderRadius: 6,
                      background: t.bgAlt,
                      textAlign: "center",
                    }}
                  >
                    등록된 라이벌 길드가 없습니다. 위 버튼으로 추가하면 순위표에 반영됩니다.
                  </div>
                ) : (
                  rivalsForGame.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: t.bgAlt,
                        border: `0.5px dashed ${t.border}`,
                      }}
                    >
                      {editingRivalId === v.id ? (
                        <>
                          <input
                            type="text"
                            value={editRivalName}
                            onChange={(e) => setEditRivalName(e.target.value)}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              padding: "4px 8px",
                              borderRadius: 5,
                              border: `1px solid ${t.border}`,
                              background: t.inputBg,
                              color: t.text,
                              fontSize: 11,
                            }}
                          />
                          <input
                            type="number"
                            min={0}
                            value={editRivalScore}
                            onChange={(e) => setEditRivalScore(e.target.value)}
                            style={{
                              width: 88,
                              padding: "4px 8px",
                              borderRadius: 5,
                              border: `1px solid ${t.border}`,
                              background: t.inputBg,
                              color: t.text,
                              fontSize: 11,
                              fontFamily: "'Courier New',monospace",
                            }}
                          />
                          <button
                            type="button"
                            onClick={saveEditRival}
                            style={{
                              fontSize: 9,
                              padding: "4px 8px",
                              borderRadius: 5,
                              border: `1px solid ${t.borderStrong}`,
                              background: t.accentFaint,
                              color: t.accent,
                              cursor: "pointer",
                            }}
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditRival}
                            style={{
                              fontSize: 9,
                              padding: "4px 8px",
                              borderRadius: 5,
                              border: `1px solid ${t.border}`,
                              background: "transparent",
                              color: t.textMuted,
                              cursor: "pointer",
                            }}
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <span
                            style={{
                              flex: 1,
                              fontSize: 11,
                              color: t.text,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {v.name}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: t.text,
                              fontFamily: "'Courier New',monospace",
                              flexShrink: 0,
                            }}
                          >
                            {formatNum(v.score)}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditRival(v)}
                            style={{
                              fontSize: 9,
                              padding: "3px 8px",
                              borderRadius: 5,
                              border: `1px solid ${t.border}`,
                              background: "transparent",
                              color: t.textSub,
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRivalGuild(v.id)}
                            title="삭제"
                            style={{
                              fontSize: 9,
                              padding: "3px 8px",
                              borderRadius: 5,
                              border: "1px solid rgba(255,91,91,0.35)",
                              background: "rgba(255,91,91,0.1)",
                              color: "#ff5b5b",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          >
                            X 삭제
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div style={{ fontSize: 9, color: t.textMuted, marginTop: 8 }}>
                {gameName} 라이벌 등록 {rivalsForGame.length} / {MAX_VIRTUAL_COMPETITORS_PER_GAME}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
