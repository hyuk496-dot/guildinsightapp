'use client';
import { useState, useEffect } from "react";
import { Modal } from "@/components/shared/Modal";
import { SimBarChart } from "./SimBarChart";
import { SIM_CONTENTS } from "@/lib/constants";
import { iStyle, selectStyle, optionStyle, btnPrimary, btnGhost } from "@/lib/styles";
import { formatWeekDisplay } from "@/lib/week-utils";

export function RankingSimulationLegacy({ t, guilds, activeGuild }) {
  const [guildId, setGuildId] = useState(activeGuild?.id ?? guilds[0]?.id);
  const [content, setContent] = useState(SIM_CONTENTS[0]);
  const [simScores, setSimScores] = useState({});
  const [guildSim, setGuildSim] = useState("");
  const [savedSims, setSavedSims] = useState([]);
  const [saveModal, setSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activeGuild?.id) setGuildId(activeGuild.id);
  }, [activeGuild?.id]);

  useEffect(() => {
    if (!guildId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/simulation?guild_id=${guildId}&content=${encodeURIComponent(content)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "시뮬레이션 데이터 조회 실패");
        }
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setSimScores({});
        setGuildSim("");
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

  const currentGuild = guilds.find((g) => g.id === guildId) || guilds[0];
  const gameName = data?.gameName || currentGuild?.game_name || currentGuild?.game || "—";
  const ranks = data?.ranks || [];
  const ourEntry = ranks.find((r) => r.ours);
  const ourBase = ourEntry?.displayScore ?? 0;
  const ourSim = guildSim ? parseInt(guildSim, 10) || ourBase : ourBase;

  const chartData = ranks.map((r) => {
    const baseScore = r.displayScore || 0;
    const delta = r.ours ? 0 : Number(simScores[r.guildId]) || 0;
    const sim = r.ours ? ourSim : baseScore + delta;
    return {
      ...r,
      score: baseScore,
      sim,
    };
  });

  const sorted = [...chartData].sort((a, b) => (b.sim || b.score) - (a.sim || a.score));
  const ourRank = sorted.findIndex((r) => r.ours) + 1 || null;
  const nextAbove = ourRank ? sorted[ourRank - 2] : null;
  const needed = nextAbove ? Math.max(0, (nextAbove.sim || nextAbove.score) - ourSim + 1) : 0;
  const curRankNow = data?.currentRank ?? null;

  const saveSim = () => {
    if (!saveName.trim()) return;
    setSavedSims((p) => [
      ...p,
      {
        name: saveName,
        game: gameName,
        content,
        ourScore: ourSim,
        rank: ourRank,
        date: new Date().toLocaleDateString("ko-KR"),
      },
    ]);
    setSaveModal(false);
    setSaveName("");
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
      <div
        style={{
          marginBottom: 12,
          padding: "10px 14px",
          background: "rgba(239,159,39,0.1)",
          border: "1px solid rgba(239,159,39,0.35)",
          borderRadius: 8,
          fontSize: 11,
          color: "#8a5200",
          lineHeight: 1.6,
        }}
      >
        구 버전(수동 타 길드 조정) 화면입니다. 일반 이용은 사이드바 「랭킹 목표」를 사용하세요.
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: t.text }}>랭킹 시뮬레이션</div>
          <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>
            같은 게임 길드 간 점수 예상 순위 — DB 점수 기반
            {data?.weekMonday && ` · ${formatWeekDisplay(data.weekMonday)} 주차`}
          </div>
        </div>
        <button
          onClick={() => setSaveModal(true)}
          disabled={!ourEntry}
          style={{
            fontSize: 11,
            padding: "7px 16px",
            border: `1px solid ${t.borderStrong}`,
            borderRadius: 8,
            background: t.accentFaint,
            color: t.accent,
            cursor: ourEntry ? "pointer" : "not-allowed",
            opacity: ourEntry ? 1 : 0.5,
            fontFamily: "'Courier New',monospace",
            fontWeight: 500,
          }}
        >
          시뮬 저장
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          padding: "10px 14px",
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 9,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 11, color: t.textMuted, flexShrink: 0 }}>비교 기준 길드:</div>
        <select
          value={guildId ?? ""}
          onChange={(e) => {
            setGuildId(+e.target.value);
            setSimScores({});
            setGuildSim("");
          }}
          style={{ ...selectStyle(t), flex: 1, maxWidth: 220 }}
        >
          {guilds.map((g) => (
            <option key={g.id} value={g.id} style={optionStyle(t)}>
              {g.name} ({g.game_name || g.game || "—"})
            </option>
          ))}
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: t.textMuted }}>게임:</span>
          <span
            style={{
              fontSize: 11,
              padding: "3px 10px",
              background: t.accentFaint,
              border: `1px solid ${t.borderStrong}`,
              color: t.accent,
              borderRadius: 20,
              fontWeight: 500,
            }}
          >
            {gameName}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: t.textMuted }}>같은 게임 길드:</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: t.text }}>
            {data?.sameGameCount ?? ranks.length}개
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {SIM_CONTENTS.map((c) => (
          <button
            key={c}
            onClick={() => {
              setContent(c);
              setSimScores({});
              setGuildSim("");
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
              transition: "all 0.15s",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && (
        <div
          style={{
            padding: "24px 0",
            textAlign: "center",
            color: t.textMuted,
            fontSize: 12,
          }}
        >
          시뮬레이션 데이터 불러오는 중...
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "12px 14px",
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
            padding: "30px 20px",
            textAlign: "center",
            color: t.textMuted,
            fontSize: 12,
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 11,
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.4 }}>📊</div>
          {gameName}의 {content} 점수 데이터가 아직 없습니다.
          <br />
          <span style={{ fontSize: 10 }}>점수 관리 페이지에서 입력하면 시뮬레이션에 반영됩니다.</span>
        </div>
      )}

      {!loading && !error && ranks.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 14 }}>
                점수 입력 ({content})
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 5 }}>
                  우리 길드 ({currentGuild?.name}) 예상 점수
                </div>
                <input
                  value={guildSim}
                  onChange={(e) => setGuildSim(e.target.value)}
                  placeholder={`현재: ${ourBase.toLocaleString()}`}
                  style={iStyle(t)}
                />
              </div>
              <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8 }}>타 길드 점수 조정 (±)</div>
              {ranks
                .filter((r) => !r.ours)
                .map((r) => (
                  <div key={r.guildId} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 11, color: t.textSub, width: 90, flexShrink: 0 }}>{r.name}</div>
                    <input
                      value={simScores[r.guildId]?.toString() || ""}
                      onChange={(e) =>
                        setSimScores((p) => ({
                          ...p,
                          [r.guildId]: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      placeholder={`현재 ${(r.displayScore || 0).toLocaleString()}`}
                      style={{ ...iStyle(t), flex: 1, padding: "5px 9px" }}
                    />
                  </div>
                ))}
            </div>

            <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 14 }}>시뮬레이션 결과</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
                <div style={{ background: t.bgAlt, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 4 }}>현재 순위</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: t.text }}>
                    {curRankNow ? `#${curRankNow}` : "—"}
                  </div>
                </div>
                <div
                  style={{
                    background: t.accentFaint,
                    borderRadius: 8,
                    padding: "10px 12px",
                    textAlign: "center",
                    border: `1px solid ${t.borderStrong}`,
                  }}
                >
                  <div style={{ fontSize: 9, color: t.accentDim, marginBottom: 4 }}>예상 순위</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: t.accent }}>
                    {ourRank ? `#${ourRank}` : "—"}
                  </div>
                </div>
                <div style={{ background: t.upBg, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: t.up, marginBottom: 4 }}>필요 점수</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: t.up }}>+{needed}</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8 }}>
                예상 순위표 ({gameName} · {content})
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {sorted.map((r, i) => (
                  <div
                    key={r.guildId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: r.ours ? t.accentFaint : t.bgAlt,
                      border: r.ours ? `1px solid ${t.borderStrong}` : `0.5px solid ${t.border}`,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 18,
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
                      {(r.sim || r.score).toLocaleString()}
                    </span>
                    {r.sim !== r.score && (
                      <span style={{ fontSize: 10, color: r.sim > r.score ? t.up : t.dn }}>
                        {r.sim > r.score ? "+" : ""}
                        {r.sim - r.score}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "16px 18px",
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 4 }}>점수 비교 그래프</div>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 10 }}>■ 현재  ■ 시뮬레이션</div>
            <div style={{ height: 180 }}>
              <SimBarChart t={t} data={chartData} />
            </div>
          </div>
        </>
      )}

      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>저장된 시뮬레이션</div>
            <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>
              시뮬 저장 버튼으로 현재 설정을 기록할 수 있습니다
            </div>
          </div>
          <span style={{ fontSize: 11, color: t.accent, fontWeight: 500 }}>{savedSims.length}건</span>
        </div>

        {savedSims.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              color: t.textMuted,
              fontSize: 12,
              border: `1px dashed ${t.border}`,
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.4 }}>📋</div>
            저장된 시뮬레이션이 없습니다.
            <br />
            <span style={{ fontSize: 10 }}>상단 "시뮬 저장" 버튼을 눌러 현재 설정을 저장하세요.</span>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 70px 80px 60px 90px 90px 36px",
                gap: 4,
                padding: "6px 10px",
                background: t.bgAlt,
                borderRadius: "7px 7px 0 0",
                marginBottom: 1,
              }}
            >
              {["이름", "게임", "컨텐츠", "예상순위", "우리점수", "저장일", ""].map((h) => (
                <div key={h} style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.07em" }}>
                  {h}
                </div>
              ))}
            </div>
            {savedSims.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 70px 80px 60px 90px 90px 36px",
                  gap: 4,
                  alignItems: "center",
                  padding: "9px 10px",
                  background: i % 2 === 0 ? t.bgAlt : t.bgCard,
                  borderRadius: i === savedSims.length - 1 ? "0 0 7px 7px" : 0,
                  borderBottom: i < savedSims.length - 1 ? `0.5px solid ${t.border}` : "none",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 500, color: t.text }}>{s.name}</span>
                <span style={{ fontSize: 10, color: t.accentDim }}>{s.game || "—"}</span>
                <span style={{ fontSize: 10, color: t.textMuted }}>{s.content}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: t.accent }}>
                  {s.rank ? `#${s.rank}` : "—"}
                </span>
                <span style={{ fontSize: 11, color: t.text }}>{s.ourScore.toLocaleString()}</span>
                <span style={{ fontSize: 10, color: t.textMuted }}>{s.date}</span>
                <button
                  onClick={() => setSavedSims((p) => p.filter((_, j) => j !== i))}
                  style={{
                    fontSize: 10,
                    padding: "3px 6px",
                    borderRadius: 5,
                    border: "1px solid rgba(255,91,91,0.25)",
                    background: "transparent",
                    color: "#ff5b5b",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      <Modal open={saveModal} onClose={() => setSaveModal(false)} t={t} title="시뮬레이션 저장">
        <div>
          <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 6 }}>저장 이름</div>
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="시뮬레이션 이름"
            style={{ ...iStyle(t), marginBottom: 14 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setSaveModal(false)} style={btnGhost(t)}>
              취소
            </button>
            <button onClick={saveSim} style={btnPrimary(t)}>
              저장
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
