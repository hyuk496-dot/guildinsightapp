'use client';
import { useState, useEffect, useRef } from "react";
import { TR } from "@/lib/theme";
import { iStyle } from "@/lib/styles";
export function ContribRow({t,c,idx,isSelected,onSelect,onDelete,onHistory,onSaved}){
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState("");
  const [note,setNote]=useState("");
  return(
    <div onClick={onSelect}
      style={{display:"grid",gridTemplateColumns:"28px 1fr 90px 80px 1fr 150px",padding:"9px 14px",borderBottom:idx>0?`0.5px solid ${t.border}`:"none",background:isSelected?t.sideActive:"transparent",cursor:"pointer",alignItems:"center",transition:"background 0.15s"}}>
      <div style={{fontSize:12,fontWeight:500,color:idx===0?"#d4a017":idx===1?"#aaa":idx===2?"#c67c3a":t.textMuted}}>{idx+1}</div>
      <div style={{fontSize:12,fontWeight:500,color:t.text}}>{c.nick}</div>
      <div>
        {editing?(
          <input autoFocus value={val} onChange={e=>setVal(e.target.value)} onClick={e=>e.stopPropagation()}
            style={{...iStyle(t),width:78,padding:"3px 7px"}}
            onKeyDown={e=>{if(e.key==="Escape")setEditing(false);}}/>
        ):<span style={{fontSize:13,fontWeight:500,color:t.text}}>{c.score.toLocaleString()}</span>}
      </div>
      <div style={{fontSize:12,color:t.accentDim}}>{c.pct}%</div>
      <div style={{paddingRight:8}}>
        <div style={{height:4,background:t.pBg,borderRadius:2}}>
          <div style={{height:4,width:`${Math.min(100,c.pct*5)}%`,background:t.pBar,borderRadius:2}}/>
        </div>
      </div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}} onClick={e=>e.stopPropagation()}>
        {editing?(
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>{if(!note.trim()){alert("수정 비고는 필수 입력입니다.");return;}onSaved(c.id,val,note);setEditing(false);setVal("");setNote("");}} style={{fontSize:10,padding:"3px 7px",borderRadius:5,border:`1px solid ${t.borderStrong}`,background:t.accentFaint,color:t.accent,cursor:"pointer"}}>저장</button>
              <button onClick={()=>{setEditing(false);setNote("");}} style={{fontSize:10,padding:"3px 7px",borderRadius:5,border:`1px solid ${t.border}`,background:"transparent",color:t.textMuted,cursor:"pointer"}}>취소</button>
            </div>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="수정 비고 (필수)" style={{...iStyle(t),padding:"2px 7px",fontSize:10}}/>
          </div>
        ):(
          <>
            <button onClick={()=>{setVal(c.score.toString());setEditing(true);}} style={{fontSize:10,padding:"3px 7px",borderRadius:5,border:`1px solid ${t.border}`,background:"transparent",color:t.textSub,cursor:"pointer"}}>수정</button>
            <button onClick={()=>onDelete(c.id)} style={{fontSize:10,padding:"3px 7px",borderRadius:5,border:"1px solid rgba(255,91,91,0.25)",background:"transparent",color:"#ff5b5b",cursor:"pointer"}}>삭제</button>
            <button onClick={()=>onHistory(c)} style={{fontSize:10,padding:"3px 7px",borderRadius:5,border:`1px solid ${t.border}`,background:"transparent",color:t.textMuted,cursor:"pointer"}}>이력</button>
          </>
        )}
      </div>
    </div>
  );
}