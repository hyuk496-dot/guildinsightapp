'use client';
import { useState, useEffect } from "react";
import { Modal } from "@/components/shared/Modal";
import { ContribRow } from "./ContribRow";
import { selectStyle, optionStyle, btnGhost, btnDanger } from "@/lib/styles";
import { useGuildInsight } from "@/context/GuildInsightProvider";
import { useGuildIdSelection } from "@/lib/use-guild-id-selection";

export function ContribAnalysis({ t, guilds, contribsData, setContribsData }) {
  const { refreshContribs, activeGuild, setActiveGuild } = useGuildInsight();
  const [selected, setSelected] = useState(null);
  const [guildId, setGuildId] = useGuildIdSelection(activeGuild, guilds, {
    onActiveGuildSync: () => setSelected(null),
  });
  const [histModal, setHistModal] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  const handleGuildSelectChange = (nextId) => {
    setGuildId(nextId);
    setSelected(null);
    const g = guilds.find((x) => Number(x.id) === Number(nextId));
    if (g && Number(activeGuild?.id) !== Number(g.id)) {
      setActiveGuild(g);
    }
  };

  const contribs = contribsData[guildId] || contribsData[String(guildId)] || [];
  const total = contribs.reduce((a, c) => a + c.score, 0);
  const sorted = [...contribs].sort((a, b) => b.score - a.score);

  const saveContrib = async (id, val, note) => {
    if (!note?.trim()) {
      alert("수정 비고는 필수 입력입니다.");
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    const entry = contribs.find((c) => c.id === id || c.member_id === id);
    if (!entry) return;

    try {
      const res = await fetch("/api/contributions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guild_id: guildId,
          member_id: entry.member_id ?? entry.id,
          nick: entry.nick,
          score: num,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      if (Array.isArray(data.list)) {
        const key = String(guildId);
        setContribsData((p) => ({ ...p, [key]: data.list, [guildId]: data.list }));
      } else {
        await refreshContribs();
      }
    } catch (e) {
      alert(e.message || "기여도 저장 실패");
    }
  };

  const deleteContrib = async (id) => {
    const entry = contribs.find((c) => c.id === id);
    try {
      const contribPk =
        entry?.id != null && Number(entry.id) !== Number(entry.member_id)
          ? entry.id
          : null;
      if (contribPk) {
        const res = await fetch(`/api/contributions?id=${contribPk}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "삭제 실패");
        if (Array.isArray(data.list)) {
          const key = String(guildId);
          setContribsData((p) => ({ ...p, [key]: data.list, [guildId]: data.list }));
        } else {
          await refreshContribs();
        }
      } else {
        await refreshContribs();
      }
      if (selected?.id === id) setSelected(null);
    } catch {
      alert("삭제 실패 (contributions 테이블 확인)");
    }
    setDelConfirm(null);
  };
  const selC=contribs.find(c=>c.id===selected?.id)||selected;

  return(
    <div style={{display:"flex",flex:1,overflow:"hidden"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",gap:12,background:t.navBg}}>
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
          <div style={{fontSize:11,color:t.textMuted}}>총 누적 기여도: <span style={{color:t.accent,fontWeight:500}}>{total.toLocaleString()}</span></div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
          <div style={{fontSize:13,fontWeight:500,color:t.text,marginBottom:12}}>누적 기여도 현황</div>
          <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:11,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 90px 80px 1fr 150px",padding:"8px 14px",background:t.bgAlt,borderBottom:`1px solid ${t.border}`}}>
              {["순위","닉네임","누적 점수","기여도 %","진행도","액션"].map(h=><div key={h} style={{fontSize:10,color:t.textMuted,letterSpacing:"0.07em"}}>{h}</div>)}
            </div>
            {sorted.map((c,i)=>(
              <ContribRow key={c.id} t={t} c={c} idx={i}
                isSelected={selected?.id===c.id}
                onSelect={()=>setSelected(c)}
                onDelete={(id)=>setDelConfirm(id)}
                onHistory={setHistModal}
                onSaved={saveContrib}/>
            ))}
            {sorted.length===0&&<div style={{textAlign:"center",padding:"30px",color:t.textMuted,fontSize:12}}>기여도 데이터 없음</div>}
          </div>
        </div>
      </div>

      {/* SIDE */}
      {selC&&(
        <div style={{width:240,flexShrink:0,borderLeft:`1px solid ${t.border}`,padding:"16px",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:500,color:t.text}}>{selC.nick}</div>
            <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:t.textMuted,cursor:"pointer",fontSize:14}}>✕</button>
          </div>
          <div style={{fontSize:10,color:t.textMuted,marginBottom:10}}>수정 이력</div>
          {selC.history&&selC.history.length>0?selC.history.map((h,i)=>(
            <div key={i} style={{padding:"9px 11px",background:t.bgAlt,borderRadius:8,marginBottom:6,border:`0.5px solid ${t.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:10,color:t.textMuted}}>{h.date}</span>
                <span style={{fontSize:12,fontWeight:500,color:h.delta.startsWith("+")?t.up:t.dn}}>{h.delta}</span>
              </div>
              <div style={{fontSize:11,color:t.textSub}}>비고: {h.note}</div>
            </div>
          )):<div style={{textAlign:"center",padding:"24px 0",color:t.textMuted,fontSize:12}}>수정 이력 없음</div>}
        </div>
      )}

      <Modal open={!!histModal} onClose={()=>setHistModal(null)} t={t} title={`${histModal?.nick} — 기여도 이력`}>
        <div style={{maxHeight:260,overflowY:"auto"}}>
          {histModal?.history?.length?histModal.history.map((h,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:t.bgAlt,borderRadius:7,marginBottom:6}}>
              <span style={{fontSize:11,color:t.textSub}}>{h.date}</span>
              <span style={{fontSize:12,fontWeight:500,color:h.delta.startsWith("+")?t.up:t.dn}}>{h.delta}</span>
              <span style={{fontSize:11,color:t.textMuted,maxWidth:130,textAlign:"right"}}>{h.note}</span>
            </div>
          )):<div style={{textAlign:"center",padding:"24px 0",color:t.textMuted,fontSize:12}}>이력 없음</div>}
        </div>
      </Modal>

      <Modal open={!!delConfirm} onClose={()=>setDelConfirm(null)} t={t} title="기여도 삭제 확인">
        <div style={{fontSize:12,color:t.textSub,marginBottom:16}}>해당 기여도 기록이 삭제됩니다.</div>
        <div style={{display:"flex",gap:8}}><button onClick={()=>setDelConfirm(null)} style={btnGhost(t)}>취소</button><button onClick={()=>deleteContrib(delConfirm)} style={btnDanger()}>삭제</button></div>
      </Modal>
    </div>
  );
}