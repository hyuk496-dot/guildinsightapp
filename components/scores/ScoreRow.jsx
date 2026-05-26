'use client';
import { useState } from "react";
import { iStyle } from "@/lib/styles";

export function ScoreRow({t, m, idx, content, scoresData, guildId, onSave, onDelete, onHistory, isSelected, onSelect}){
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  
  // 💡 guildId 타입이나 데이터 매핑 충돌 방지 안전장치
  const currentGuildScores = scoresData[guildId] || scoresData[String(guildId)] || scoresData[Number(guildId)] || {};
  const contentScores = currentGuildScores[content] || [];
  const sc = contentScores.find(s => Number(s.memberId) === Number(m.id));
  
  const diff = sc ? sc.score - sc.prev : null;

  return (
    <div onClick={onSelect}
      style={{display:"grid", gridTemplateColumns:"1fr 64px 80px 90px 80px 130px", padding:"9px 14px", borderBottom:idx>0?`0.5px solid ${t.border}`:"none", background:isSelected?t.sideActive:"transparent", cursor:"pointer", alignItems:"center", transition:"background 0.15s"}}>
      <div style={{display:"flex", alignItems:"center", gap:8}}>
        {/* 💡 문법 에러가 났던 justify-content 구조를 완벽하게 수정했습니다 */}
        <div style={{width:24, height:24, borderRadius:"50%", background:t.avColors[idx%6][0], color:t.avColors[idx%6][1], display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:600, flexShrink:0}}>
          {m.nick ? m.nick.slice(0,2).toUpperCase() : "—"}
        </div>
        <span style={{fontSize:12, color:t.text, fontWeight:500}}>{m.nick}</span>
      </div>
      <div style={{fontSize:11, color:t.textMuted}}>{m.job || "—"}</div>
      <div>
        {editing ? (
          <input autoFocus value={val} onChange={e=>setVal(e.target.value)} onClick={e=>e.stopPropagation()}
            style={{...iStyle(t), width:70, padding:"3px 7px"}}
            onKeyDown={e=>{
              if(e.key==="Enter"){onSave(m.id, m.nick, val); setEditing(false);}
              if(e.key==="Escape")setEditing(false);
            }}/>
        ) : (
          <span style={{fontSize:13, fontWeight:500, color:sc?t.text:t.textMuted}}>{sc ? sc.score : "—"}</span>
        )}
      </div>
      <div>{diff!==null ? <span style={{fontSize:11, color:diff>=0?t.up:t.dn}}>{diff>=0?"+":""}{diff}</span> : <span style={{fontSize:11, color:t.textMuted}}>—</span>}</div>
      <div style={{fontSize:10, color:t.textMuted}}>{sc?.date || "—"}</div>
      <div style={{display:"flex", gap:4}} onClick={e=>e.stopPropagation()}>
        {editing ? (
          <>
            <button onClick={()=>{onSave(m.id, m.nick, val); setEditing(false);}} style={{fontSize:10, padding:"3px 7px", borderRadius:5, border:`1px solid ${t.borderStrong}`, background:t.accentFaint, color:t.accent, cursor:"pointer"}}>저장</button>
            <button onClick={()=>setEditing(false)} style={{fontSize:10, padding:"3px 7px", borderRadius:5, border:`1px solid ${t.border}`, background:"transparent", color:t.textMuted, cursor:"pointer"}}>취소</button>
          </>
        ) : (
          <>
            <button onClick={()=>{setVal(sc?.score?.toString()||""); setEditing(true);}} style={{fontSize:10, padding:"3px 7px", borderRadius:5, border:`1px solid ${t.border}`, background:"transparent", color:t.textSub, cursor:"pointer"}}>{sc?"수정":"입력"}</button>
            {sc && <button onClick={()=>onDelete(m.id)} style={{fontSize:10, padding:"3px 7px", borderRadius:5, border:"1px solid rgba(255,91,91,0.25)", background:"transparent", color:"#ff5b5b", cursor:"pointer"}}>삭제</button>}
            <button onClick={()=>onHistory(m)} style={{fontSize:10, padding:"3px 7px", borderRadius:5, border:`1px solid ${t.border}`, background:"transparent", color:t.textMuted, cursor:"pointer"}}>히스토리</button>
          </>
        )}
      </div>
    </div>
  );
}