'use client';

import { useState } from "react";
import { TR } from "@/lib/theme";
import { Tag } from "@/components/shared/Tag";
import { Modal } from "@/components/shared/Modal";
import { iStyle, btnPrimary, btnGhost, btnDanger } from "@/lib/styles";
import { useGuildInsight } from "@/context/GuildInsightProvider";
import { guildForUi } from "@/lib/guild-display";

export function GuildManagement({ t, guilds, onSelectGuild, contribsData, setGuilds }) {
  // 💡 Provider에서 제공하는 안전한 전역 CRUD 액션 바인딩
  const { addGuild, deleteGuild, refreshGuilds } = useGuildInsight();

  const [modal, setModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ name: "", game: "" });
  const [delConfirm, setDelConfirm] = useState(null);

  const openAdd = () => { setForm({ name: "", game: "" }); setModal("add"); };
  const openEdit = (g) => { setEditTarget(g); setForm({ name: g.name, game: g.game_name || g.game || "" }); setModal("edit"); };

  const save = async () => {
    if (!form.name.trim() || !form.game.trim()) return;

    if (modal === "add") {
      // 💡 백엔드/컨텍스트 규격과 일치하도록 명확하게 파라미터 전달
      await addGuild(form.name, form.game);
    } else if (modal === "edit" && editTarget) {
      // 💡 실제 수정 로직 구현 (Supabase UPDATE)
      const res = await fetch('/api/guilds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, name: form.name, game: form.game }),
      });
      if (res.ok) {
        setGuilds((prev) =>
          prev.map((g) =>
            g.id === editTarget.id ? { ...g, name: form.name, game_name: form.game, game: form.game } : g
          )
        );
        await refreshGuilds();
      }
    }
    setModal(null);
  };

  // 주간 기여도 매핑 함수 (복구)
  const getWeeklyContrib = (gId) => {
    if (!contribsData) return 0;
    const data = contribsData[gId];
    if (Array.isArray(data)) {
      return data.reduce((sum, c) => sum + (c.score || 0), 0);
    }
    return typeof data === 'number' ? data : 0;
  };

  // 랭킹 변화 표시 컴포넌트 (복구)
  const RankChange = ({ rank, prevRank }) => {
    if (rank === "-" || prevRank === "-" || rank === undefined || prevRank === undefined) return <span style={{ color: t.textMuted, fontSize: 12 }}>—</span>;
    const diff = Number(prevRank) - Number(rank);
    if (diff > 0) return <span style={{ color: t.up, fontSize: 11 }}>▲ {diff}</span>;
    if (diff < 0) return <span style={{ color: t.dn, fontSize: 11 }}>▼ {Math.abs(diff)}</span>;
    return <span style={{ color: t.textMuted, fontSize: 12 }}>—</span>;
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: t.text }}>길드 관리</div>
          <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>관리 중인 길드 {guilds?.length || 0}개</div>
        </div>
        <button onClick={openAdd} style={{ fontSize: 12, padding: "7px 16px", border: `1px solid ${t.borderStrong}`, borderRadius: 8, background: t.accentFaint, color: t.accent, cursor: "pointer", fontFamily: "'Courier New',monospace", fontWeight: 500 }}>+ 길드 등록</button>
      </div>

      {guilds?.map((raw) => {
        const g = guildForUi(raw);
        const weeklyContrib = getWeeklyContrib(g.id) || g.weeklyContrib || 0;

        return (
          <div key={g.id} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12, transition: TR }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: t.accentFaint, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: t.accent, fontWeight: 700, flexShrink: 0 }}>
                {g.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onSelectGuild(raw)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: t.text }}>{g.name}</span>
                  <Tag bg={t.accentFaint} color={t.accent}>{g.game}</Tag>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: t.textMuted }}>길드원 {g.members}명</span>
                  <span style={{ fontSize: 10, color: t.textMuted }}>·</span>
                  <span style={{ fontSize: 10, color: t.textMuted }}>랭킹 #{g.rank}</span>
                  <RankChange rank={g.rank} prevRank={g.prevRank} />
                  <span style={{ fontSize: 10, color: t.textMuted }}>·</span>
                  <span style={{ fontSize: 10, color: t.textMuted }}>등록 {g.created}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onSelectGuild(raw)} style={{ fontSize: 11, padding: "5px 11px", border: `1px solid ${t.border}`, borderRadius: 6, background: t.accentFaint, color: t.accent, cursor: "pointer", fontFamily: "'Courier New',monospace" }}>대시보드</button>
                <button onClick={() => openEdit(raw)} style={{ fontSize: 11, padding: "5px 11px", border: `1px solid ${t.border}`, borderRadius: 6, background: "transparent", color: t.textSub, cursor: "pointer", fontFamily: "'Courier New',monospace" }}>수정</button>
                <button onClick={() => setDelConfirm(g.id)} style={{ fontSize: 11, padding: "5px 11px", border: "1px solid rgba(255,91,91,0.3)", borderRadius: 6, background: "rgba(255,91,91,0.06)", color: "#ff5b5b", cursor: "pointer", fontFamily: "'Courier New',monospace" }}>삭제</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14, paddingTop: 12, borderTop: `0.5px solid ${t.border}` }}>
              <div style={{ textAlign: "center", padding: "8px", background: t.bgAlt, borderRadius: 7 }}>
                <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.1em", marginBottom: 2 }}>MEMBERS</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: t.text }}>{g.members}명</div>
              </div>
              <div style={{ textAlign: "center", padding: "8px", background: t.bgAlt, borderRadius: 7 }}>
                <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.1em", marginBottom: 2 }}>RANK</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 500, color: t.text }}>#{g.rank}</span>
                  <RankChange rank={g.rank} prevRank={g.prevRank} />
                </div>
              </div>
              <div style={{ textAlign: "center", padding: "8px", background: t.accentFaint, borderRadius: 7, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 9, color: t.accentDim, letterSpacing: "0.1em", marginBottom: 2 }}>주간 기여도</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: t.accent }}>{weeklyContrib.toLocaleString()}</div>
              </div>
            </div>
          </div>
        );
      })}

      <Modal open={!!modal} onClose={() => setModal(null)} t={t} title={modal === "add" ? "길드 등록" : "길드 수정"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[["길드명", "name", "ShadowFang"], ["게임명", "game", "로스트아크"]].map(([label, key, ph]) => (
            <div key={key}>
              <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>{label}</div>
              <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} style={iStyle(t)} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={() => setModal(null)} style={btnGhost(t)}>취소</button>
            <button onClick={save} style={btnPrimary(t)}>저장</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!delConfirm} onClose={() => setDelConfirm(null)} t={t} title="길드 삭제 확인">
        <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.7, marginBottom: 16 }}>해당 길드와 모든 관련 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setDelConfirm(null)} style={btnGhost(t)}>취소</button>
          <button onClick={() => { deleteGuild(delConfirm); setDelConfirm(null); }} style={btnDanger()}>삭제 확인</button>
        </div>
      </Modal>
    </div>
  );
}