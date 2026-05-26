'use client';

import { useState, useEffect } from "react";
import { Tag } from "@/components/shared/Tag";
import { Modal } from "@/components/shared/Modal";
import { RadarCanvas } from "@/components/shared/RadarCanvas";
import { RADAR_LABELS } from "@/lib/constants";
import { iStyle, selectStyle, optionStyle, btnPrimary, btnGhost, btnDanger } from "@/lib/styles";
import { upsertMember, removeMember } from "@/lib/members-utils";
import { memberForUi } from "@/lib/guild-display";
import { buildMemberRadar, hasRadarData } from "@/lib/radar-utils";
import { useGuildInsight } from "@/context/GuildInsightProvider";

export function MemberManagement({
  t,
  guilds,
  membersData,
  setMembersData,
  contribsData,
  scoresData = {},
  contents = [],
}) {
  const { refreshGuilds } = useGuildInsight();

  const [guildId, setGuildId] = useState(guilds[0]?.id);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [form, setForm] = useState({ nick: "", server: "", job: "", joined: "", left: "" });

  useEffect(() => {
    if (!guildId && guilds.length > 0) setGuildId(guilds[0].id);
  }, [guilds, guildId]);

  const currentMembers = membersData[String(guildId)] || membersData[guildId] || [];

  const withRadar = (m) => {
    const radar = buildMemberRadar(m.id, guildId, scoresData, contents);
    return memberForUi(m, radar);
  };

  const members = currentMembers
    .map(withRadar)
    .filter((m) => m.nick.toLowerCase().includes(search.toLowerCase()));
  const selMember =
    members.find((m) => m.id === selected?.id) ||
    (selected ? withRadar(selected) : null);

  const openAdd = () => {
    setForm({ nick: "", server: "", job: "", joined: "", left: "" });
    setModal("add");
  };

  const openEdit = (m) => {
    setEditTarget(m);
    setForm({ nick: m.nick, server: m.server, job: m.job, joined: m.joined, left: m.left });
    setModal("edit");
  };

  const save = async () => {
    if (!form.nick.trim()) return;
    const payloadJoined = form.joined?.trim() || null;
    const payloadLeft = form.left?.trim() || null;

    try {
      if (modal === "add") {
        const response = await fetch("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guild_id: Number(guildId),
            nick: form.nick,
            server: form.server,
            job: form.job,
            joined_at: payloadJoined,
            left_at: payloadLeft,
          }),
        });
        if (!response.ok) throw new Error();
        const newMember = await response.json();
        setMembersData((prev) => upsertMember(prev, newMember));
        await refreshGuilds();
      } else if (modal === "edit" && editTarget) {
        const response = await fetch("/api/members", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editTarget.id,
            nick: form.nick,
            server: form.server,
            job: form.job,
            joined_at: payloadJoined,
            left_at: payloadLeft,
          }),
        });
        if (!response.ok) throw new Error();
        const updated = await response.json();
        setMembersData((prev) => upsertMember(prev, updated));
        setSelected(updated);
        await refreshGuilds();
      }
      setModal(null);
    } catch {
      alert("저장 실패: 입력 형식을 확인해 주세요.");
    }
  };

  const deleteMember = async (id) => {
    try {
      const response = await fetch(`/api/members?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setMembersData((prev) => removeMember(prev, id));
      if (selected?.id === id) setSelected(null);
      await refreshGuilds();
      setDelConfirm(null);
    } catch {
      alert("삭제 실패");
    }
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div style={{ width: 320, flexShrink: 0, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>길드원 관리</div>
            <button
              onClick={openAdd}
              style={{
                fontSize: 11,
                padding: "5px 12px",
                border: `1px solid ${t.borderStrong}`,
                borderRadius: 7,
                background: t.accentFaint,
                color: t.accent,
                cursor: "pointer",
                fontFamily: "'Courier New',monospace",
                fontWeight: 500,
              }}
            >
              + 추가
            </button>
          </div>
          <select
            value={guildId}
            onChange={(e) => {
              setGuildId(+e.target.value);
              setSelected(null);
            }}
            style={{ ...selectStyle(t), width: "100%", marginBottom: 8 }}
          >
            {guilds.map((g) => (
              <option key={g.id} value={g.id} style={optionStyle(t)}>
                {g.name} ({g.game_name || g.game})
              </option>
            ))}
          </select>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: t.textMuted, fontSize: 12, pointerEvents: "none" }}>
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="닉네임 검색..."
              style={{ ...iStyle(t), paddingLeft: 28 }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
          {members.length === 0 && (
            <div style={{ textAlign: "center", color: t.textMuted, fontSize: 12, marginTop: 40 }}>결과 없음</div>
          )}
          {members.map((m, i) => (
            <div
              key={m.id}
              onClick={() => setSelected(m)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "9px 10px",
                borderRadius: 8,
                background: selected?.id === m.id ? t.sideActive : t.bgCard,
                border: `1px solid ${selected?.id === m.id ? t.borderStrong : t.border}`,
                marginBottom: 6,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: t.avColors[i % 6][0],
                  color: t.avColors[i % 6][1],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {m.nick.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: selected?.id === m.id ? t.accent : t.text }}>{m.nick}</div>
                <div style={{ fontSize: 10, color: t.textMuted }}>
                  {m.job} · {m.server}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(m);
                  }}
                  style={{ fontSize: 9, padding: "3px 7px", border: `1px solid ${t.border}`, borderRadius: 5, background: "transparent", color: t.textMuted, cursor: "pointer" }}
                >
                  수정
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDelConfirm(m.id);
                  }}
                  style={{ fontSize: 9, padding: "3px 7px", border: "1px solid rgba(255,91,91,0.2)", borderRadius: 5, background: "transparent", color: "#ff5b5b", cursor: "pointer" }}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: "20px 22px", overflowY: "auto" }}>
        {!selMember ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: t.textMuted, gap: 10 }}>
            <div style={{ fontSize: 36, opacity: 0.4 }}>◈</div>
            <div style={{ fontSize: 13 }}>길드원을 선택하면 상세 정보가 표시됩니다</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 13,
                  background: t.accentFaint,
                  border: `1px solid ${t.borderStrong}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  color: t.accent,
                  fontWeight: 700,
                }}
              >
                {selMember.nick.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 500, color: t.text }}>{selMember.nick}</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                  {selMember.job} · {selMember.server} · 가입 {selMember.joined}
                </div>
              </div>
              {selMember.left && <Tag bg="rgba(255,91,91,0.08)" color="#ff5b5b">탈퇴 {selMember.left}</Tag>}
            </div>

            <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 12 }}>역량 레이더 (컨텐츠별 점수)</div>
              {hasRadarData(selMember.radar) ? (
                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  <RadarCanvas t={t} vals={selMember.radar} size={160} />
                  <div style={{ flex: 1 }}>
                    {RADAR_LABELS.map((lbl, i) => (
                      <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: t.textSub, width: 60, flexShrink: 0 }}>{lbl}</div>
                        <div style={{ flex: 1, height: 4, background: t.pBg, borderRadius: 2 }}>
                          <div style={{ height: 4, width: `${selMember.radar[i] || 0}%`, background: t.pBar, borderRadius: 2, transition: "width 0.4s" }} />
                        </div>
                        <div style={{ fontSize: 11, color: t.accent, width: 28, textAlign: "right" }}>{selMember.radar[i] || 0}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "28px 0", color: t.textMuted, fontSize: 12, border: `1px dashed ${t.border}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>📊</div>
                  데이터 정보 없음 — 점수 관리에서 컨텐츠별 점수를 입력해주세요
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {(() => {
                const contribEntry = (contribsData[guildId] || contribsData[String(guildId)] || []).find(
                  (c) => c.id === selMember.id || c.nick === selMember.nick
                );
                const contribScore = contribEntry ? contribEntry.score.toLocaleString() : "—";
                const contribPct = contribEntry ? `${contribEntry.pct}%` : "—";
                return [
                  ["닉네임", selMember.nick],
                  ["서버명", selMember.server],
                  ["직업", selMember.job],
                  ["가입일", selMember.joined],
                  ["탈퇴일", selMember.left || "—"],
                  ["누적 기여도", contribScore],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: t.bgAlt, borderRadius: 8, padding: "10px 13px" }}>
                    <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.1em", marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: k === "누적 기여도" ? 15 : 14, fontWeight: 500, color: k === "누적 기여도" ? t.accent : t.text }}>{v}</div>
                    {k === "누적 기여도" && contribEntry && (
                      <div style={{ fontSize: 9, color: t.textMuted, marginTop: 2 }}>전체 기여도 {contribPct}</div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} t={t} title={modal === "add" ? "길드원 추가" : "길드원 수정"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            ["닉네임", "nick", "닉네임"],
            ["서버명", "server", "서버명"],
            ["직업", "job", "전사/딜러/힐러..."],
            ["가입일", "joined", "2025.01.01"],
            ["탈퇴일", "left", "비어있으면 현역"],
          ].map(([label, key, ph]) => (
            <div key={key}>
              <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 3 }}>{label}</div>
              <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={ph} style={iStyle(t)} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={() => setModal(null)} style={btnGhost(t)}>
              취소
            </button>
            <button onClick={save} style={btnPrimary(t)}>
              저장
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!delConfirm} onClose={() => setDelConfirm(null)} t={t} title="길드원 삭제 확인">
        <div style={{ fontSize: 12, color: t.textSub, marginBottom: 16 }}>해당 길드원의 모든 기록이 삭제됩니다.</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setDelConfirm(null)} style={btnGhost(t)}>
            취소
          </button>
          <button onClick={() => deleteMember(delConfirm)} style={btnDanger()}>
            삭제
          </button>
        </div>
      </Modal>
    </div>
  );
}
