'use client';

import { useState, useEffect } from "react";
import { Modal } from "@/components/shared/Modal";
import { ScoreRow } from "./ScoreRow";
import { CONTENTS_INIT } from "@/lib/mock-data";
import { iStyle, selectStyle, optionStyle, btnPrimary, btnGhost, btnDanger } from "@/lib/styles";
import { weekMondayUtcIso } from "@/lib/week-utils";
import { useGuildInsight } from "@/context/GuildInsightProvider";
import { useGuildIdSelection } from "@/lib/use-guild-id-selection";
import { useSyncedContentSelection } from "@/lib/use-synced-content";

export function ScoreManagement({ t, guilds, membersData, scoresData, setScoresData, contents, setContents }) {
  const {
    refreshScores,
    refreshContribs,
    activeGuild,
    setActiveGuild,
    registerContentRename,
    appendContent,
    removeContent,
  } = useGuildInsight();
  const [content, setContent] = useSyncedContentSelection(contents);
  const [selected, setSelected] = useState(null);
  const [guildId, setGuildId] = useGuildIdSelection(activeGuild, guilds, {
    onActiveGuildSync: () => setSelected(null),
  });
  const [histModal, setHistModal] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [guildScore, setGuildScore] = useState("");
  const [simSaved, setSimSaved] = useState(false);
  const [delContentConfirm, setDelContentConfirm] = useState(null);
  const [delContentAlert, setDelContentAlert] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [renameVal, setRenameVal] = useState("");
  const [histRows, setHistRows] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  const handleGuildSelectChange = (nextId) => {
    setGuildId(nextId);
    setSelected(null);
    const g = guilds.find((x) => Number(x.id) === Number(nextId));
    if (g && Number(activeGuild?.id) !== Number(g.id)) {
      setActiveGuild(g);
    }
  };

  useEffect(() => {
    if (guilds.length > 0) refreshScores();
  }, [guilds.length, refreshScores]);

  useEffect(() => {
    if (!histModal?.id || !content) {
      setHistRows([]);
      return;
    }
    let cancelled = false;
    setHistLoading(true);
    fetch(
      `/api/scores?member_id=${histModal.id}&content_name=${encodeURIComponent(content)}`
    )
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        if (!cancelled) setHistRows(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setHistRows([]);
      })
      .finally(() => {
        if (!cancelled) setHistLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [histModal?.id, content]);

  const gKey = guildId;
  const members = membersData[gKey] || membersData[String(gKey)] || [];
  const getScore = (memberId) => (scoresData[gKey]?.[content] || scoresData[String(gKey)]?.[content] || []).find((s) => s.memberId === memberId || String(s.memberId) === String(memberId));
  const contentTotal = (scoresData[gKey]?.[content] || scoresData[String(gKey)]?.[content] || []).reduce((sum, s) => sum + (s.score || 0), 0);

  const saveScore = async (memberId, nick, val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    const targetMember = members.find((m) => m.id === memberId || String(m.id) === String(memberId));
    const ex = getScore(memberId);
    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: Number(memberId),
          guild_id: Number(guildId),
          nick,
          job: targetMember?.job || "—",
          content_name: content,
          score: num,
          prev_score: ex?.score || 0,
          created_at: weekMondayUtcIso(),
        }),
      });
      if (!response.ok) return;
      await refreshScores();
      await refreshContribs();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteScore = async (memberId) => {
    const record = getScore(memberId);
    if (record?.id) {
      await fetch(`/api/scores?id=${record.id}`, { method: "DELETE" });
      await refreshScores();
      await refreshContribs();
    }
  };

  const addContent = () => {
    const name = newContent.trim();
    if (!name) return;
    appendContent(name);
    setContent(name);
    setNewContent("");
    setAddModal(false);
  };

  const deleteContent = (c) => {
    if (CONTENTS_INIT.includes(c)) {
      setDelContentAlert(true);
      return;
    }
    removeContent(c);
    if (content === c) {
      const next = contents.filter((x) => x !== c);
      setContent(next[0] || CONTENTS_INIT[0]);
    }
    setScoresData((p) => {
      const key = String(guildId);
      const gData = { ...(p[key] || p[guildId] || {}) };
      delete gData[c];
      return { ...p, [key]: gData };
    });
  };

  const renameContent = () => {
    const newName = renameVal.trim();
    if (!newName || newName === content) {
      setRenameModal(false);
      return;
    }
    registerContentRename(content, newName);
    setContents((p) => p.map((c) => (c === content ? newName : c)));
    setScoresData((p) => {
      const key = String(guildId);
      const gData = { ...(p[key] || p[guildId] || {}) };
      if (gData[content]) {
        gData[newName] = gData[content];
        delete gData[content];
      }
      return { ...p, [key]: gData };
    });
    setContent(newName);
    setRenameModal(false);
    setRenameVal("");
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: t.navBg }}>
          <select
            value={guildId}
            onChange={(e) => handleGuildSelectChange(+e.target.value)}
            style={{ ...selectStyle(t), width: "auto", minWidth: 140 }}
          >
            {guilds.map((g) => (
              <option key={g.id} value={g.id} style={optionStyle(t)}>
                {g.name}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {contents.map((c) => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <button
                  onClick={() => {
                    setContent(c);
                    setSelected(null);
                  }}
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: c === content ? "20px 0 0 20px" : 20,
                    border: `1px solid ${c === content ? t.borderStrong : t.border}`,
                    borderRight: c === content ? "none" : undefined,
                    background: c === content ? t.accentFaint : "transparent",
                    color: c === content ? t.accent : t.textSub,
                    cursor: "pointer",
                    fontFamily: "'Courier New',monospace",
                    transition: "all 0.15s",
                  }}
                >
                  {c}
                </button>
                {c === content && (
                  <button
                    onClick={() => setDelContentConfirm(c)}
                    title={CONTENTS_INIT.includes(c) ? "기본 컨텐츠는 삭제 불가" : "컨텐츠 삭제"}
                    style={{
                      fontSize: 9,
                      padding: "4px 7px",
                      borderRadius: "0 20px 20px 0",
                      border: `1px solid ${t.borderStrong}`,
                      borderLeft: "none",
                      background: CONTENTS_INIT.includes(c) ? "rgba(100,100,100,0.1)" : "rgba(255,91,91,0.12)",
                      color: CONTENTS_INIT.includes(c) ? t.textMuted : "#ff5b5b",
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              setRenameVal(content);
              setRenameModal(true);
            }}
            style={{
              fontSize: 11,
              padding: "4px 11px",
              border: `1px solid ${t.border}`,
              borderRadius: 20,
              background: "transparent",
              color: t.textMuted,
              cursor: "pointer",
              fontFamily: "'Courier New',monospace",
            }}
          >
            ✏ 이름 수정
          </button>
          <button
            onClick={() => setAddModal(true)}
            style={{
              fontSize: 11,
              padding: "4px 11px",
              border: `1px solid ${t.borderStrong}`,
              borderRadius: 20,
              background: t.accentFaint,
              color: t.accent,
              cursor: "pointer",
              fontFamily: "'Courier New',monospace",
            }}
          >
            + 컨텐츠 등록
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>{content} — 점수 현황</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: t.textMuted }}>시뮬 총점:</span>
              <input
                value={guildScore}
                onChange={(e) => {
                  setGuildScore(e.target.value);
                  setSimSaved(false);
                }}
                placeholder={contentTotal > 0 ? `현재 총점 ${contentTotal.toLocaleString()}` : "점수 없음"}
                style={{ ...iStyle(t), width: 140, padding: "5px 9px" }}
              />
              <button
                onClick={() => {
                  if (guildScore) setSimSaved(true);
                }}
                style={{
                  fontSize: 11,
                  padding: "5px 10px",
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  background: simSaved ? t.upBg : t.accentFainter,
                  color: simSaved ? t.up : t.accentDim,
                  cursor: "pointer",
                  fontFamily: "'Courier New',monospace",
                }}
              >
                {simSaved ? "✓ 저장됨" : "시뮬 저장"}
              </button>
            </div>
          </div>
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 11, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 64px 80px 90px 80px 130px",
                padding: "8px 14px",
                background: t.bgAlt,
                borderBottom: `1px solid ${t.border}`,
              }}
            >
              {["닉네임", "직업", "점수", "전주 대비", "입력일", "액션"].map((h) => (
                <div key={h} style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.07em" }}>
                  {h}
                </div>
              ))}
            </div>
            {members.map((m, i) => (
              <ScoreRow
                key={m.id}
                t={t}
                m={m}
                idx={i}
                content={content}
                scoresData={scoresData}
                guildId={guildId}
                onSave={saveScore}
                onDelete={deleteScore}
                onHistory={setHistModal}
                isSelected={selected?.id === m.id}
                onSelect={() => setSelected(m)}
              />
            ))}
            {members.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px", color: t.textMuted, fontSize: 12 }}>이 길드에 등록된 길드원이 없습니다</div>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <div style={{ width: 220, flexShrink: 0, borderLeft: `1px solid ${t.border}`, padding: "16px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{selected.nick}</div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 14 }}>
              ✕
            </button>
          </div>
          <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8 }}>컨텐츠별 최신 점수</div>
          {contents.map((c) => {
            const sc2 = (scoresData[gKey]?.[c] || scoresData[String(gKey)]?.[c] || []).find(
              (s) => s.memberId === selected.id || String(s.memberId) === String(selected.id)
            );
            return (
              <div
                key={c}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 9px",
                  background: c === content ? t.sideActive : t.bgAlt,
                  borderRadius: 6,
                  marginBottom: 4,
                  border: `0.5px solid ${c === content ? t.borderStrong : t.border}`,
                }}
              >
                <span style={{ fontSize: 11, color: c === content ? t.accent : t.textSub }}>{c}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: sc2 ? t.text : t.textMuted }}>{sc2 ? sc2.score : "—"}</span>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!histModal}
        onClose={() => {
          setHistModal(null);
          setHistRows([]);
        }}
        t={t}
        title={`${histModal?.nick} 히스토리`}
      >
        <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 10 }}>
          {content} · 주차 기준(월요일) 이력
        </div>
        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          {histLoading ? (
            <div style={{ textAlign: "center", padding: 24, color: t.textMuted, fontSize: 12 }}>불러오는 중...</div>
          ) : histRows.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: t.textMuted, fontSize: 12 }}>
              저장된 주차별 이력이 없습니다.
            </div>
          ) : (
            histRows.map((h) => (
              <div
                key={h.weekMonday}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 72px 56px",
                  gap: 8,
                  padding: "8px 10px",
                  background: t.bgAlt,
                  borderRadius: 7,
                  marginBottom: 5,
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 11, color: t.textSub }}>{h.date}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: t.text, textAlign: "right" }}>
                  {h.score.toLocaleString()}
                </span>
                <span style={{ fontSize: 10, color: t.textMuted, textAlign: "right" }}>{h.note}</span>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal open={addModal} onClose={() => setAddModal(false)} t={t} title="컨텐츠 등록">
        <div>
          <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 6 }}>컨텐츠명</div>
          <input value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="새 컨텐츠명" style={{ ...iStyle(t), marginBottom: 14 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setAddModal(false)} style={btnGhost(t)}>
              취소
            </button>
            <button onClick={addContent} style={btnPrimary(t)}>
              등록
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={renameModal} onClose={() => setRenameModal(false)} t={t} title={`"${content}" 이름 수정`}>
        <div>
          <div style={{ fontSize: 11, color: t.textSub, marginBottom: 10, lineHeight: 1.6 }}>
            게임에 맞게 컨텐츠 이름을 변경할 수 있습니다.
            <br />
            <span style={{ color: t.accent, fontSize: 10 }}>예) 주간 활약 → 레이드, 결투장 → 아레나</span>
          </div>
          <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 5 }}>새 컨텐츠명</div>
          <input
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            placeholder={content}
            style={{ ...iStyle(t), marginBottom: 14 }}
            onKeyDown={(e) => {
              if (e.key === "Enter") renameContent();
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setRenameModal(false)} style={btnGhost(t)}>
              취소
            </button>
            <button onClick={renameContent} style={btnPrimary(t)}>
              이름 변경
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!delContentConfirm} onClose={() => setDelContentConfirm(null)} t={t} title="컨텐츠 삭제 확인">
        <div>
          <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.7, marginBottom: 6 }}>
            <strong style={{ color: t.accent }}>"{delContentConfirm}"</strong> 컨텐츠를 삭제하면
          </div>
          <div style={{ fontSize: 12, color: "#ff5b5b", marginBottom: 16 }}>해당 컨텐츠의 모든 점수 데이터가 함께 삭제됩니다.</div>
          {CONTENTS_INIT.includes(delContentConfirm || "") ? (
            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 16, padding: "8px 12px", background: t.bgAlt, borderRadius: 7 }}>
              ⚠ 기본 제공 컨텐츠는 삭제할 수 없습니다.
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setDelContentConfirm(null)} style={btnGhost(t)}>
              취소
            </button>
            {!CONTENTS_INIT.includes(delContentConfirm || "") && (
              <button
                onClick={() => {
                  deleteContent(delContentConfirm);
                  setDelContentConfirm(null);
                }}
                style={btnDanger()}
              >
                삭제 확인
              </button>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={delContentAlert} onClose={() => setDelContentAlert(false)} t={t} title="삭제 불가">
        <div style={{ fontSize: 12, color: t.textSub, marginBottom: 16 }}>
          기본 제공 컨텐츠(주간 활약, 결투장 등)는 삭제할 수 없습니다. 직접 추가한 컨텐츠만 삭제 가능합니다.
        </div>
        <button onClick={() => setDelContentAlert(false)} style={btnPrimary(t)}>
          확인
        </button>
      </Modal>
    </div>
  );
}
