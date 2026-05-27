'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { selectStyle, optionStyle } from "@/lib/styles";
import { exportElementToPdf } from "@/lib/export-report-pdf";

// ─── THEME ───────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:"#080c14",bgCard:"#0d1a2a",bgAlt:"#0a1520",bgHover:"#111f30",
    border:"rgba(0,200,255,0.12)",borderStrong:"rgba(0,200,255,0.35)",
    accent:"#00c8ff",accentDim:"rgba(0,200,255,0.55)",
    accentFaint:"rgba(0,200,255,0.08)",accentFainter:"rgba(0,200,255,0.04)",
    text:"#e8f4ff",textSub:"rgba(180,210,240,0.7)",textMuted:"rgba(0,200,255,0.4)",
    up:"#4cff91",dn:"#ff5b5b",upBg:"rgba(76,255,145,0.08)",
    navBg:"#0d1a2a",navBorder:"rgba(0,200,255,0.1)",
    sideActive:"rgba(0,200,255,0.10)",
    pBg:"rgba(0,200,255,0.1)",pBar:"#00c8ff",
    rptBg:"rgba(0,200,255,0.04)",rptBorder:"rgba(0,200,255,0.15)",rptText:"rgba(140,210,240,0.8)",
    inputBg:"rgba(0,200,255,0.05)",inputBorder:"rgba(0,200,255,0.2)",
    radarRgb:"0,200,255",
    dColors:["#00c8ff","#EF9F27","#4cff91","#ff6fa8","#a89df5","#5f7a94"],
    avColors:[["rgba(0,200,255,0.15)","#00c8ff"],["rgba(239,159,39,0.15)","#EF9F27"],["rgba(76,255,145,0.15)","#4cff91"],["rgba(212,83,126,0.15)","#ff6fa8"],["rgba(127,119,221,0.15)","#a89df5"],["rgba(95,122,148,0.15)","#7a9ab5"]],
    chartLine:"#00c8ff",chartFill:"rgba(0,200,255,0.08)",chartGrid:"rgba(0,200,255,0.07)",chartLabel:"rgba(0,200,255,0.35)",
    modalBg:"rgba(4,10,22,0.88)",
  },
  light: {
    bg:"#f0f4f8",bgCard:"#ffffff",bgAlt:"#f8fafc",bgHover:"#edf2f8",
    border:"rgba(24,95,165,0.12)",borderStrong:"rgba(24,95,165,0.3)",
    accent:"#185FA5",accentDim:"rgba(24,95,165,0.55)",
    accentFaint:"rgba(24,95,165,0.07)",accentFainter:"rgba(24,95,165,0.03)",
    text:"#0c1a2e",textSub:"rgba(20,50,90,0.65)",textMuted:"rgba(24,95,165,0.45)",
    up:"#1a7a3c",dn:"#c0392b",upBg:"rgba(26,122,60,0.07)",
    navBg:"#ffffff",navBorder:"rgba(24,95,165,0.1)",
    sideActive:"rgba(24,95,165,0.08)",
    pBg:"rgba(24,95,165,0.1)",pBar:"#185FA5",
    rptBg:"rgba(24,95,165,0.03)",rptBorder:"rgba(24,95,165,0.12)",rptText:"rgba(20,50,90,0.7)",
    inputBg:"rgba(24,95,165,0.04)",inputBorder:"rgba(24,95,165,0.2)",
    radarRgb:"24,95,165",
    dColors:["#185FA5","#c87200","#1a7a3c","#a0284f","#5145b8","#7a8fa0"],
    avColors:[["#dbeeff","#185FA5"],["#fff3db","#9c5e00"],["#dbf5e9","#1a7a3c"],["#ffe0ed","#a0284f"],["#eae8ff","#5145b8"],["#e8edf2","#4a6070"]],
    chartLine:"#185FA5",chartFill:"rgba(24,95,165,0.07)",chartGrid:"rgba(24,95,165,0.07)",chartLabel:"rgba(24,95,165,0.4)",
    modalBg:"rgba(200,210,225,0.75)",
  },
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const GUILDS_INIT = [
  {id:1,name:"ShadowFang",game:"로스트아크",members:48,rank:7,prevRank:9,score:2841,weeklyContrib:2841,created:"2024.01.15"},
  {id:2,name:"IronValor",game:"블레이드&소울",members:32,rank:2,prevRank:2,score:3988,weeklyContrib:3988,created:"2024.03.08"},
  {id:3,name:"PhoenixRise",game:"메이플스토리",members:61,rank:4,prevRank:3,score:3540,weeklyContrib:3540,created:"2023.11.20"},
];

const MEMBERS_INIT = {
  1:[
    {id:1,nick:"Zephyr",server:"아이온",job:"딜러",joined:"2024.01.15",left:"",score:523,radar:[92,88,75,81,70,95],pct:92},
    {id:2,nick:"NightClaw",server:"카오스",job:"탱커",joined:"2024.01.15",left:"",score:441,radar:[85,70,80,78,65,88],pct:78},
    {id:3,nick:"LunaX",server:"아이온",job:"힐러",joined:"2024.02.01",left:"",score:368,radar:[70,65,88,60,72,80],pct:65},
    {id:4,nick:"Strix",server:"카오스",job:"궁수",joined:"2024.02.10",left:"",score:311,radar:[55,60,70,65,58,72],pct:55},
    {id:5,nick:"Vortex",server:"빛의정원",job:"마법사",joined:"2024.03.05",left:"",score:272,radar:[],pct:48},
    {id:6,nick:"IceWolf",server:"아이온",job:"전사",joined:"2024.03.12",left:"",score:241,radar:[48,55,60,50,45,65],pct:43},
  ],
  2:[
    {id:7,nick:"DragonBane",server:"태양",job:"검사",joined:"2024.03.08",left:"",score:612,radar:[95,90,85,92,88,96],pct:96},
    {id:8,nick:"Solaris",server:"달빛",job:"힐러",joined:"2024.03.08",left:"",score:501,radar:[80,75,90,70,82,85],pct:82},
  ],
  3:[
    {id:9,nick:"MapleStar",server:"슈리아",job:"마법사",joined:"2023.11.20",left:"",score:720,radar:[98,95,92,90,96,99],pct:99},
    {id:10,nick:"RedHawk",server:"슈리아",job:"전사",joined:"2023.12.01",left:"",score:580,radar:[88,82,78,85,80,90],pct:90},
  ],
};

const CONTENTS_INIT = ["총력전","결투장","공성전","길드전","강림","개인 컨텐츠"];

const SCORES_INIT = {
  1:{
    "총력전":[
      {memberId:1,nick:"Zephyr",score:523,prev:490,date:"2025.04.28"},
      {memberId:2,nick:"NightClaw",score:441,prev:420,date:"2025.04.28"},
      {memberId:3,nick:"LunaX",score:368,prev:350,date:"2025.04.27"},
      {memberId:4,nick:"Strix",score:311,prev:295,date:"2025.04.27"},
      {memberId:5,nick:"Vortex",score:272,prev:260,date:"2025.04.26"},
      {memberId:6,nick:"IceWolf",score:241,prev:241,date:"2025.04.25"},
    ],
    "결투장":[
      {memberId:1,nick:"Zephyr",score:481,prev:460,date:"2025.04.28"},
      {memberId:2,nick:"NightClaw",score:392,prev:380,date:"2025.04.28"},
    ],
  },
};

const CONTRIBS_INIT = {
  1:[
    {id:1,nick:"Zephyr",score:2841,pct:18.8,history:[{date:"2025.04.28",delta:"+33",note:"총력전 갱신"},{date:"2025.04.21",delta:"+41",note:"보상 참여"}]},
    {id:2,nick:"NightClaw",score:2210,pct:14.6,history:[{date:"2025.04.28",delta:"+21",note:"공성 기여"}]},
    {id:3,nick:"LunaX",score:1980,pct:13.1,history:[{date:"2025.04.27",delta:"+18",note:"힐 기여 조정"}]},
    {id:4,nick:"Strix",score:1540,pct:10.2,history:[]},
    {id:5,nick:"Vortex",score:1320,pct:8.7,history:[{date:"2025.04.20",delta:"-10",note:"오입력 수정"}]},
    {id:6,nick:"IceWolf",score:1100,pct:7.3,history:[]},
  ],
};

const RADAR_LABELS = ["총력전","결투장","공성전","길드전","강림","개인"];
const SIM_CONTENTS = ["총력전","결투장","공성전","길드전","강림"];

// 게임별 서버 랭킹 데이터 (컨텐츠별 점수 포함)
const SERVER_RANKS_BY_GAME = {
  "로스트아크": [
    {name:"DragonBlood", ours:false, scores:{"총력전":4210,"결투장":3100,"공성전":2800,"길드전":3600,"강림":1200}},
    {name:"IronValor",   ours:false, scores:{"총력전":3988,"결투장":2900,"공성전":2600,"길드전":3400,"강림":1100}},
    {name:"StarFall",    ours:false, scores:{"총력전":3720,"결투장":2700,"공성전":2400,"길드전":3100,"강림": 980}},
    {name:"PhoenixRise", ours:false, scores:{"총력전":3540,"결투장":2500,"공성전":2200,"길드전":2900,"강림": 900}},
    {name:"CrystalEdge", ours:false, scores:{"총력전":3181,"결투장":2300,"공성전":2000,"길드전":2700,"강림": 820}},
    {name:"NightRaiders",ours:false, scores:{"총력전":3050,"결투장":2200,"공성전":1900,"길드전":2600,"강림": 780}},
    {name:"ShadowFang",  ours:true,  scores:{"총력전":2841,"결투장":1980,"공성전":1740,"길드전":2400,"강림": 720}},
    {name:"TerraForge",  ours:false, scores:{"총력전":2700,"결투장":1850,"공성전":1600,"길드전":2200,"강림": 680}},
    {name:"SkyBreaker",  ours:false, scores:{"총력전":2500,"결투장":1700,"공성전":1450,"길드전":2000,"강림": 620}},
  ],
  "블레이드&소울": [
    {name:"IronValor",   ours:true,  scores:{"총력전":3988,"결투장":3200,"공성전":2500,"길드전":3100,"강림":1050}},
    {name:"ShadowBlade", ours:false, scores:{"총력전":3700,"결투장":3000,"공성전":2300,"길드전":2900,"강림": 980}},
    {name:"CrimsonWing", ours:false, scores:{"총력전":3400,"결투장":2800,"공성전":2100,"길드전":2700,"강림": 900}},
    {name:"AzureStorm",  ours:false, scores:{"총력전":3100,"결투장":2600,"공성전":1900,"길드전":2500,"강림": 820}},
    {name:"GoldenFist",  ours:false, scores:{"총력전":2800,"결투장":2400,"공성전":1700,"길드전":2300,"강림": 740}},
  ],
  "메이플스토리": [
    {name:"PhoenixRise", ours:true,  scores:{"총력전":3540,"결투장":2800,"공성전":2200,"길드전":3000,"강림": 900}},
    {name:"MapleStar",   ours:false, scores:{"총력전":4100,"결투장":3300,"공성전":2700,"길드전":3500,"강림":1100}},
    {name:"BossClear",   ours:false, scores:{"총력전":3800,"결투장":3100,"공성전":2500,"길드전":3200,"강림":1020}},
    {name:"LeafOrder",   ours:false, scores:{"총력전":3200,"결투장":2600,"공성전":2000,"길드전":2800,"강림": 840}},
    {name:"CherryBomb",  ours:false, scores:{"총력전":2900,"결투장":2400,"공성전":1800,"길드전":2500,"강림": 760}},
  ],
};
// 기본 fallback (호환용)
const SERVER_RANKS = SERVER_RANKS_BY_GAME["로스트아크"].map(r=>({name:r.name,score:r.scores["총력전"],ours:r.ours}));
const GPT_REPORTS = [
  {id:1,date:"2025.04.28",title:"4월 4주차 주간 리포트",badge:"최신",guild:"ShadowFang",
   summary:"이번 주 길드 ShadowFang은 전주 대비 12.4% 성장하며 랭킹 #7에 진입. Zephyr(523)와 NightClaw(441)의 기여가 두드러졌으며 상위 5인이 전체 점수의 61%를 담당.",
   sections:[
     {title:"📊 성과 요약",content:"주간 점수 2,841점 달성 (전주 2,530 대비 +311). 참여율 87%로 전주 대비 3% 하락. 총력전 기여도 1위: Zephyr 523점."},
     {title:"🔥 MVP 분석",content:"Zephyr (딜러, Lv.85) — 주간 523점으로 1위. 전주 대비 33점 상승. 총력전·강림 콘텐츠에서 최상위 기록. 현재 S등급 유지 중."},
     {title:"⚠️ 개선 필요",content:"Vortex 등 7명의 참여율이 50% 미만. 총력전 참여 독려 권장. IceWolf의 점수가 2주 연속 정체 중이며 개인 컨텐츠 참여 독려 필요."},
     {title:"🎯 다음 주 전략",content:"목표 랭킹 #5 달성을 위해 340점 추가 필요. CrystalEdge(3,181)와의 격차 340점. 공성전 참여율 향상 및 결투장 점수 집중 권장."},
   ],
   chips:["MVP: Zephyr","목표까지 340점","참여율 개선 7명","공성전 집중 권장"]},
  {id:2,date:"2025.04.21",title:"4월 3주차 주간 리포트",badge:"",guild:"ShadowFang",
   summary:"주간 점수 2,530점 달성. 참여율 90%로 이번달 최고치. LunaX의 힐 기여도가 특히 두드러졌으며, 길드전 점수가 전주 대비 22% 상승.",
   sections:[
     {title:"📊 성과 요약",content:"주간 점수 2,530점 달성. 총 참여율 90%. 길드전 점수 22% 상승."},
     {title:"🔥 MVP 분석",content:"LunaX (힐러, Lv.80) — 힐 기여도 1위. 길드전 최다 기여."},
     {title:"⚠️ 개선 필요",content:"총력전 평균 점수 전주 대비 5% 하락. 딜러진 강화 필요."},
     {title:"🎯 다음 주 전략",content:"총력전 집중 공략. 하위 참여자 5명 독려 계획."},
   ],
   chips:["MVP: LunaX","길드전 +22%","총력전 개선 필요"]},
];

const TR = "background 0.3s, color 0.3s, border-color 0.3s";
const NAV_ITEMS = [
  {id:"dashboard",label:"대시보드",icon:"◼",section:"메인"},
  {id:"guild",label:"길드 관리",icon:"◎",section:"메인"},
  {id:"members",label:"길드원 관리",icon:"◈",section:"분석"},
  {id:"scores",label:"점수 관리",icon:"▲",section:"분석"},
  {id:"contribution",label:"기여도 분석",icon:"◆",section:"분석"},
  {id:"simulation",label:"랭킹 시뮬레이션",icon:"▶",section:"전략"},
  {id:"gptreport",label:"GPT 리포트",icon:"✦",section:"AI"},
  {id:"ocr",label:"OCR 업로드",icon:"◑",section:"AI"},
];

// ─── SHARED ──────────────────────────────────────────────────────────────────
function Tag({bg,color,children}){return <span style={{fontSize:10,padding:"2px 8px",background:bg,color,borderRadius:20,fontWeight:500,border:`1px solid ${color}33`}}>{children}</span>;}

function Modal({open,onClose,t,title,children}){
  if(!open)return null;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:200,background:t.modalBg,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(3px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:t.bgCard,border:`1px solid ${t.borderStrong}`,borderRadius:14,padding:"22px 24px",minWidth:340,maxWidth:480,width:"90%",boxShadow:"0 24px 60px rgba(0,0,0,0.4)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <span style={{fontSize:13,fontWeight:500,color:t.accent,letterSpacing:"0.06em"}}>{title}</span>
          <span onClick={onClose} style={{cursor:"pointer",color:t.textMuted,fontSize:16,lineHeight:1}}>✕</span>
        </div>
        {children}
      </div>
    </div>
  );
}

const iStyle=(t)=>({width:"100%",padding:"8px 12px",borderRadius:7,border:`1px solid ${t.inputBorder}`,background:t.inputBg,color:t.text,outline:"none",fontSize:12,fontFamily:"'Courier New',monospace",boxSizing:"border-box"});
const btnPrimary=(t)=>({padding:"8px 0",border:`1px solid ${t.borderStrong}`,borderRadius:7,background:t.accentFaint,color:t.accent,cursor:"pointer",fontFamily:"'Courier New',monospace",fontSize:12,fontWeight:500,width:"100%"});
const btnGhost=(t)=>({padding:"8px 0",border:`1px solid ${t.border}`,borderRadius:7,background:"transparent",color:t.textSub,cursor:"pointer",fontFamily:"'Courier New',monospace",fontSize:12,width:"100%"});
const btnDanger=()=>({padding:"8px 0",border:"1px solid rgba(255,91,91,0.4)",borderRadius:7,background:"rgba(255,91,91,0.07)",color:"#ff5b5b",cursor:"pointer",fontFamily:"'Courier New',monospace",fontSize:12,width:"100%"});

function RadarCanvas({t,vals,size=160}){
  const ref=useRef(null);
  useEffect(()=>{
    const cv=ref.current;if(!cv)return;
    const dpr=window.devicePixelRatio||1;
    cv.width=size*dpr;cv.height=size*dpr;
    const ctx=cv.getContext("2d");ctx.scale(dpr,dpr);
    const cx=size/2,cy=size/2,R=size*0.34,n=RADAR_LABELS.length,step=Math.PI*2/n;
    for(let ring=1;ring<=4;ring++){
      const rr=R*ring/4;ctx.beginPath();
      for(let i=0;i<n;i++){const a=step*i-Math.PI/2;const x=cx+rr*Math.cos(a),y=cy+rr*Math.sin(a);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
      ctx.closePath();ctx.strokeStyle=`rgba(${t.radarRgb},${0.07+ring*0.04})`;ctx.lineWidth=0.5;ctx.stroke();
    }
    for(let i=0;i<n;i++){const a=step*i-Math.PI/2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+R*Math.cos(a),cy+R*Math.sin(a));ctx.strokeStyle=t.border;ctx.lineWidth=0.5;ctx.stroke();}
    const hasData=vals&&vals.length===n&&vals.some(v=>v>0);
    if(hasData){
      const norm=vals.map(v=>v/100);
      ctx.beginPath();
      norm.forEach((v,i)=>{const a=step*i-Math.PI/2;const x=cx+R*v*Math.cos(a),y=cy+R*v*Math.sin(a);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
      ctx.closePath();ctx.fillStyle=t.accentFaint;ctx.fill();ctx.strokeStyle=t.accent;ctx.lineWidth=1.5;ctx.stroke();
      norm.forEach((v,i)=>{const a=step*i-Math.PI/2;const x=cx+R*v*Math.cos(a),y=cy+R*v*Math.sin(a);ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fillStyle=t.accent;ctx.fill();});
    }
    RADAR_LABELS.forEach((lbl,i)=>{
      const a=step*i-Math.PI/2;const x=cx+(R+17)*Math.cos(a),y=cy+(R+17)*Math.sin(a);
      ctx.fillStyle=t.accentDim;ctx.font=`8px 'Courier New'`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(lbl,x,y);
    });
  },[t,vals,size]);
  return <canvas ref={ref} width={size} height={size} style={{width:size,height:size}}/>;
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({t,active,onNav,guildName}){
  const sections=[...new Set(NAV_ITEMS.map(i=>i.section))];
  return(
    <div style={{width:196,flexShrink:0,background:t.navBg,borderRight:`1px solid ${t.navBorder}`,display:"flex",flexDirection:"column",transition:TR}}>
      <div style={{padding:"14px 12px 12px",borderBottom:`1px solid ${t.navBorder}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none" style={{flexShrink:0}}>
            <polygon points="14,2 24,8 24,20 14,26 4,20 4,8" stroke={t.accent} strokeWidth="1" fill={t.accentFaint}/>
            <polygon points="14,7 20,10.5 20,17.5 14,21 8,17.5 8,10.5" stroke={t.accent} strokeWidth="0.5" fill={t.accentFainter}/>
            <circle cx="14" cy="14" r="3" fill={t.accent} opacity="0.9"/>
          </svg>
          <div style={{minWidth:0}}>
            <div style={{fontSize:14,fontWeight:500,color:t.accent,letterSpacing:"0.08em",whiteSpace:"nowrap"}}>GUILD INSIGHT</div>
            <div style={{fontSize:9,color:t.textMuted,letterSpacing:"0.1em",marginTop:1,whiteSpace:"nowrap"}}>운영자 대시보드</div>
          </div>
        </div>
      </div>
      <div style={{flex:1,padding:"8px 8px",overflowY:"auto"}}>
        {sections.map(sec=>(
          <div key={sec}>
            <div style={{fontSize:9,color:t.textMuted,padding:"10px 8px 3px",letterSpacing:"0.12em",textTransform:"uppercase"}}>{sec}</div>
            {NAV_ITEMS.filter(i=>i.section===sec).map(item=>(
              <div key={item.id} onClick={()=>onNav(item.id)}
                style={{display:"flex",alignItems:"center",gap:9,padding:"7px 10px",borderRadius:7,fontSize:11,color:active===item.id?t.accent:t.textSub,background:active===item.id?t.sideActive:"transparent",cursor:"pointer",marginBottom:1,fontWeight:active===item.id?500:400,transition:"all 0.15s"}}>
                <span style={{fontSize:11,opacity:0.75}}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{padding:"10px 8px 14px",borderTop:`1px solid ${t.navBorder}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:t.accentFaint,borderRadius:8}}>
          <div style={{width:26,height:26,borderRadius:6,background:t.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:t.bg,fontWeight:700,flexShrink:0}}>{guildName.slice(0,2).toUpperCase()}</div>
          <div><div style={{fontSize:11,fontWeight:500,color:t.text}}>{guildName}</div><div style={{fontSize:9,color:t.textMuted}}>마스터 권한</div></div>
        </div>
      </div>
    </div>
  );
}

function Topbar({t,dark,setDark,title,sub,onLogout,onNav}){
  return(
    <div style={{background:t.navBg,borderBottom:`1px solid ${t.navBorder}`,padding:"11px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,transition:TR}}>
      <div>
        <div style={{fontSize:14,fontWeight:500,color:t.text}}>{title}</div>
        {sub&&<div style={{fontSize:10,color:t.textMuted,marginTop:1}}>{sub}</div>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:t.textMuted}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:t.up,display:"inline-block"}}/>실시간
        </div>
        <button onClick={()=>setDark(d=>!d)} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",border:`1px solid ${t.borderStrong}`,borderRadius:7,background:t.accentFaint,color:t.accent,fontSize:10,fontFamily:"'Courier New',monospace",cursor:"pointer",letterSpacing:"0.08em",fontWeight:500,transition:TR}}>
          {dark?"☀ LIGHT":"☽ DARK"}
        </button>
        {/* OCR 버튼 → ocr_upload 페이지로 이동 */}
        <button onClick={()=>onNav("ocr_upload")} style={{fontSize:10,padding:"5px 11px",border:`1px solid ${t.border}`,borderRadius:7,background:t.accentFainter,color:t.accentDim,fontFamily:"'Courier New',monospace",cursor:"pointer"}}>OCR</button>
        <button onClick={()=>onNav("gptreport")} style={{fontSize:10,padding:"5px 11px",border:`1px solid ${t.borderStrong}`,borderRadius:7,background:t.accentFaint,color:t.accent,fontFamily:"'Courier New',monospace",cursor:"pointer",fontWeight:500}}>GPT 리포트</button>
        {/* 구분선 */}
        <div style={{width:1,height:18,background:t.border,margin:"0 2px"}}/>
        {/* 로그아웃 버튼 */}
        <button onClick={onLogout}
          style={{display:"flex",alignItems:"center",gap:5,fontSize:10,padding:"5px 12px",border:"1px solid rgba(255,91,91,0.3)",borderRadius:7,background:"rgba(255,91,91,0.06)",color:"#ff7070",fontFamily:"'Courier New',monospace",cursor:"pointer",transition:"all 0.2s"}}>
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
            <path d="M9 2H12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9" stroke="#ff7070" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M6 10l3-3-3-3" stroke="#ff7070" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="9" y1="7" x2="1" y2="7" stroke="#ff7070" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          로그아웃
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
// 컨텐츠별 더미 점수 데이터 (실제 서비스에서는 scoresData 집계로 대체)
const DASH_SCORES_BY_CONTENT = {
  "총력전":  [1820,2010,1950,2200,2530,2841],
  "결투장":  [1200,1380,1250,1500,1620,1740],
  "공성전":  [ 980,1050, 990,1200,1350,1480],
  "길드전":  [2100,2250,2180,2400,2550,2700],
  "강림":    [ 650, 710, 680, 800, 870, 950],
  "개인 컨텐츠":[300, 340, 320, 380, 410, 450],
};

function Dashboard({t,guild}){
  const [chartContent,setChartContent]=useState("총력전");
  const scores=DASH_SCORES_BY_CONTENT[chartContent]||DASH_SCORES_BY_CONTENT["총력전"];
  const latestScore=scores[scores.length-1];
  const prevScore=scores[scores.length-2];
  const scoreDelta=latestScore-prevScore;
  const scoreDeltaPct=((scoreDelta/prevScore)*100).toFixed(1);

  const mets=[
    {label:"GUILD MEMBERS",val:guild.members+"",delta:"▲ +3 이번 주",up:true},
    {label:`WEEKLY SCORE (${chartContent})`,val:latestScore.toLocaleString(),delta:`▲ +${scoreDeltaPct}%`,up:true},
    {label:"SERVER RANK",val:"#"+guild.rank,delta:"▲ 2단계 상승",up:true},
    {label:"ACTIVITY RATE",val:"87%",delta:"▼ -3% 감소",up:false},
  ];
  const weeks=["3/17","3/24","3/31","4/7","4/14","4/21"];
  const cvRef=useRef(null);
  useEffect(()=>{
    const cv=cvRef.current;if(!cv)return;
    const dpr=window.devicePixelRatio||1;
    const W=cv.offsetWidth,H=cv.offsetHeight;if(!W||!H)return;
    cv.width=W*dpr;cv.height=H*dpr;
    const ctx=cv.getContext("2d");ctx.scale(dpr,dpr);
    const pad=28,top=10,bot=20;
    const minV=Math.floor(Math.min(...scores)*0.85);
    const maxV=Math.ceil(Math.max(...scores)*1.1);
    ctx.clearRect(0,0,W,H);
    for(let i=0;i<5;i++){const y=top+(H-top-bot)*i/4;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-6,y);ctx.strokeStyle=t.chartGrid;ctx.lineWidth=0.5;ctx.stroke();}
    const pts=scores.map((v,i)=>({x:pad+i*(W-pad-6)/(scores.length-1),y:top+(H-top-bot)*(1-(v-minV)/(maxV-minV))}));
    ctx.beginPath();pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
    ctx.strokeStyle=t.chartLine;ctx.lineWidth=1.5;ctx.stroke();
    ctx.lineTo(pts[pts.length-1].x,H-bot);ctx.lineTo(pts[0].x,H-bot);ctx.closePath();
    ctx.fillStyle=t.chartFill;ctx.fill();
    pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,Math.PI*2);ctx.fillStyle=t.chartLine;ctx.fill();});
    weeks.forEach((l,i)=>{ctx.fillStyle=t.chartLabel;ctx.font=`8px 'Courier New'`;ctx.textAlign="center";ctx.fillText(l,pts[i].x,H-5);});
  },[t,chartContent]);
  return(
    <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
      <div style={{fontSize:15,fontWeight:500,color:t.text,marginBottom:3}}>{guild.name} 대시보드</div>
      <div style={{fontSize:10,color:t.textMuted,marginBottom:16}}>{guild.game} · 랭킹 #{guild.rank} · 등록일 {guild.created}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {mets.map((m,i)=>(
          <div key={i} style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:10,padding:"13px 15px",transition:TR}}>
            <div style={{fontSize:9,color:t.textMuted,letterSpacing:"0.12em",marginBottom:4}}>{m.label}</div>
            <div style={{fontSize:21,fontWeight:500,color:t.text,lineHeight:1}}>{m.val}</div>
            <div style={{fontSize:10,marginTop:4,color:m.up?t.up:t.dn}}>{m.delta}</div>
          </div>
        ))}
      </div>
      <div style={{background:t.rptBg,border:`1px solid ${t.rptBorder}`,borderRadius:10,padding:"13px 16px",marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:500,color:t.accent,marginBottom:6}}>✦ GPT 주간 리포트</div>
        <div style={{fontSize:12,color:t.rptText,lineHeight:1.7}}>이번 주 길드 <strong style={{color:t.accent}}>{guild.name}</strong>은 전주 대비 12.4% 상승, 랭킹 <strong style={{color:t.accent}}>#{guild.rank}</strong>로 진입. 상위 5인이 전체 점수의 61%를 담당. 목표 #5 진입까지 <strong style={{color:t.up}}>340점</strong> 필요.</div>
        <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
          {["MVP: Zephyr","목표까지 340점","참여 개선 7명"].map(c=><span key={c} style={{fontSize:10,padding:"2px 9px",background:t.accentFaint,border:`1px solid ${t.border}`,color:t.accentDim,borderRadius:20}}>{c}</span>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:12,marginBottom:14}}>
        <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:11,padding:"14px 16px"}}>
          {/* 컨텐츠 선택 헤더 */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:500,color:t.text}}>
              주간 점수 추이
              <span style={{fontSize:10,color:t.textMuted,fontWeight:400,marginLeft:6}}>최근 6주</span>
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
              {Object.keys(DASH_SCORES_BY_CONTENT).map(c=>(
                <button key={c} onClick={()=>setChartContent(c)}
                  style={{fontSize:9,padding:"2px 8px",borderRadius:20,border:`1px solid ${c===chartContent?t.borderStrong:t.border}`,background:c===chartContent?t.accentFaint:"transparent",color:c===chartContent?t.accent:t.textMuted,cursor:"pointer",fontFamily:"'Courier New',monospace",transition:"all 0.15s"}}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          {/* 현재 선택 컨텐츠 배지 */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:10,padding:"2px 10px",background:t.accentFaint,border:`1px solid ${t.borderStrong}`,color:t.accent,borderRadius:20,fontWeight:500}}>{chartContent} 기준</span>
            <span style={{fontSize:10,color:t.textMuted}}>최신: <strong style={{color:t.up}}>{latestScore.toLocaleString()}</strong></span>
            <span style={{fontSize:10,color:scoreDelta>=0?t.up:t.dn}}>{scoreDelta>=0?"▲":"▼"} {Math.abs(scoreDelta)} ({scoreDeltaPct}%)</span>
          </div>
          <div style={{height:120}}><canvas ref={cvRef} style={{width:"100%",height:"100%",display:"block"}}/></div>
        </div>
        <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:11,padding:"14px 16px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:500,color:t.text}}>서버 랭킹 현황</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:9,padding:"2px 8px",background:t.accentFaint,border:`1px solid ${t.border}`,color:t.accent,borderRadius:20}}>{guild.game}</span>
              <span style={{fontSize:9,padding:"2px 8px",background:t.accentFaint,border:`1px solid ${t.borderStrong}`,color:t.accent,borderRadius:20,fontWeight:500}}>{chartContent}</span>
            </div>
          </div>
          {(()=>{
            const gameRanks = SERVER_RANKS_BY_GAME[guild.game] || SERVER_RANKS_BY_GAME["로스트아크"];
            // 이전 주 랭킹: 총력전 기준 순서를 prevRank로 사용 (실제 서비스에서는 DB에서)
            const baseOrder = [...gameRanks]
              .map(r=>({name:r.name,score:r.scores["총력전"]??0}))
              .sort((a,b)=>b.score-a.score)
              .reduce((acc,r,i)=>({...acc,[r.name]:i+1}),{});
            const ranked = [...gameRanks]
              .map(r=>({...r, displayScore: r.scores[chartContent] ?? r.scores["총력전"] ?? 0}))
              .sort((a,b)=>b.displayScore-a.displayScore);
            return ranked.slice(0,6).map((r,i)=>{
              const curRank = i+1;
              const prevRank = baseOrder[r.name] ?? curRank;
              const diff = prevRank - curRank; // 양수=상승, 음수=하락
              return (
                <div key={r.name} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:6,background:r.ours?t.accentFaint:t.bgAlt,border:r.ours?`1px solid ${t.borderStrong}`:`0.5px solid ${t.border}`,marginBottom:4}}>
                  <span style={{width:16,fontSize:11,fontWeight:500,color:i===0?"#d4a017":r.ours?t.accent:t.textMuted}}>{curRank}</span>
                  {/* 순위 변화 아이콘 */}
                  <span style={{width:26,fontSize:10,textAlign:"center",flexShrink:0}}>
                    {diff>0
                      ? <span style={{color:t.up}}>▲{diff}</span>
                      : diff<0
                        ? <span style={{color:t.dn}}>▼{Math.abs(diff)}</span>
                        : <span style={{color:t.textMuted,fontSize:12}}>—</span>
                    }
                  </span>
                  <span style={{flex:1,fontSize:11,color:r.ours?t.accent:t.text,fontWeight:r.ours?500:400}}>{r.name}{r.ours?" ★":""}</span>
                  <span style={{fontSize:11,color:r.ours?t.accent:t.text}}>{r.displayScore.toLocaleString()}</span>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. GUILD MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
function GuildManagement({t,guilds,setGuilds,onSelectGuild,contribsData}){
  const [modal,setModal]=useState(null);
  const [editTarget,setEditTarget]=useState(null);
  const [form,setForm]=useState({name:"",game:""});
  const [delConfirm,setDelConfirm]=useState(null);

  const openAdd=()=>{setForm({name:"",game:""});setModal("add");};
  const openEdit=(g)=>{setEditTarget(g);setForm({name:g.name,game:g.game});setModal("edit");};
  const save=()=>{
    if(!form.name.trim())return;
    if(modal==="add") setGuilds(p=>[...p,{id:Date.now(),name:form.name,game:form.game,members:0,rank:"-",prevRank:"-",score:0,weeklyContrib:0,created:new Date().toLocaleDateString("ko-KR")}]);
    else setGuilds(p=>p.map(g=>g.id===editTarget.id?{...g,name:form.name,game:form.game}:g));
    setModal(null);
  };

  // 길드별 주간 기여도 합산 (contribsData에서 계산)
  const getWeeklyContrib=(gId)=>{
    const list=contribsData[gId]||[];
    return list.reduce((sum,c)=>sum+c.score,0);
  };

  // 랭킹 변화 표시
  const RankChange=({rank,prevRank})=>{
    if(rank==="-"||prevRank==="-") return <span style={{color:t.textMuted,fontSize:12}}>—</span>;
    const diff=Number(prevRank)-Number(rank); // 양수 = 상승
    if(diff>0) return <span style={{color:t.up,fontSize:11}}>▲ {diff}</span>;
    if(diff<0) return <span style={{color:t.dn,fontSize:11}}>▼ {Math.abs(diff)}</span>;
    return <span style={{color:t.textMuted,fontSize:12}}>—</span>;
  };

  return(
    <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <div style={{fontSize:15,fontWeight:500,color:t.text}}>길드 관리</div>
          <div style={{fontSize:10,color:t.textMuted,marginTop:2}}>관리 중인 길드 {guilds.length}개</div>
        </div>
        <button onClick={openAdd} style={{fontSize:12,padding:"7px 16px",border:`1px solid ${t.borderStrong}`,borderRadius:8,background:t.accentFaint,color:t.accent,cursor:"pointer",fontFamily:"'Courier New',monospace",fontWeight:500}}>+ 길드 등록</button>
      </div>

      {guilds.map(g=>{
        const weeklyContrib=getWeeklyContrib(g.id)||g.weeklyContrib||0;
        return(
          <div key={g.id} style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:12,padding:"16px 18px",marginBottom:12,transition:TR}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:11,background:t.accentFaint,border:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:t.accent,fontWeight:700,flexShrink:0}}>{g.name.slice(0,2).toUpperCase()}</div>
              <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>onSelectGuild(g)}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:14,fontWeight:500,color:t.text}}>{g.name}</span>
                  <Tag bg={t.accentFaint} color={t.accent}>{g.game}</Tag>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
                  <span style={{fontSize:10,color:t.textMuted}}>길드원 {g.members}명</span>
                  <span style={{fontSize:10,color:t.textMuted}}>·</span>
                  <span style={{fontSize:10,color:t.textMuted}}>랭킹 #{g.rank}</span>
                  <RankChange rank={g.rank} prevRank={g.prevRank}/>
                  <span style={{fontSize:10,color:t.textMuted}}>·</span>
                  <span style={{fontSize:10,color:t.textMuted}}>등록 {g.created}</span>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>onSelectGuild(g)} style={{fontSize:11,padding:"5px 11px",border:`1px solid ${t.border}`,borderRadius:6,background:t.accentFaint,color:t.accent,cursor:"pointer",fontFamily:"'Courier New',monospace"}}>대시보드</button>
                <button onClick={()=>openEdit(g)} style={{fontSize:11,padding:"5px 11px",border:`1px solid ${t.border}`,borderRadius:6,background:"transparent",color:t.textSub,cursor:"pointer",fontFamily:"'Courier New',monospace"}}>수정</button>
                <button onClick={()=>setDelConfirm(g.id)} style={{fontSize:11,padding:"5px 11px",border:"1px solid rgba(255,91,91,0.3)",borderRadius:6,background:"rgba(255,91,91,0.06)",color:"#ff5b5b",cursor:"pointer",fontFamily:"'Courier New',monospace"}}>삭제</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:14,paddingTop:12,borderTop:`0.5px solid ${t.border}`}}>
              <div style={{textAlign:"center",padding:"8px",background:t.bgAlt,borderRadius:7}}>
                <div style={{fontSize:9,color:t.textMuted,letterSpacing:"0.1em",marginBottom:2}}>MEMBERS</div>
                <div style={{fontSize:16,fontWeight:500,color:t.text}}>{g.members}명</div>
              </div>
              <div style={{textAlign:"center",padding:"8px",background:t.bgAlt,borderRadius:7}}>
                <div style={{fontSize:9,color:t.textMuted,letterSpacing:"0.1em",marginBottom:2}}>RANK</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <span style={{fontSize:16,fontWeight:500,color:t.text}}>#{g.rank}</span>
                  <RankChange rank={g.rank} prevRank={g.prevRank}/>
                </div>
              </div>
              <div style={{textAlign:"center",padding:"8px",background:t.accentFaint,borderRadius:7,border:`1px solid ${t.border}`}}>
                <div style={{fontSize:9,color:t.accentDim,letterSpacing:"0.1em",marginBottom:2}}>주간 기여도</div>
                <div style={{fontSize:16,fontWeight:500,color:t.accent}}>{weeklyContrib.toLocaleString()}</div>
              </div>
            </div>
          </div>
        );
      })}

      <Modal open={!!modal} onClose={()=>setModal(null)} t={t} title={modal==="add"?"길드 등록":"길드 수정"}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[["길드명","name","ShadowFang"],["게임명","game","로스트아크"]].map(([label,key,ph])=>(
            <div key={key}>
              <div style={{fontSize:10,color:t.textMuted,marginBottom:4}}>{label}</div>
              <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph} style={iStyle(t)}/>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={()=>setModal(null)} style={btnGhost(t)}>취소</button>
            <button onClick={save} style={btnPrimary(t)}>저장</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!delConfirm} onClose={()=>setDelConfirm(null)} t={t} title="길드 삭제 확인">
        <div style={{fontSize:12,color:t.textSub,lineHeight:1.7,marginBottom:16}}>해당 길드와 모든 관련 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setDelConfirm(null)} style={btnGhost(t)}>취소</button>
          <button onClick={()=>{setGuilds(p=>p.filter(g=>g.id!==delConfirm));setDelConfirm(null);}} style={btnDanger()}>삭제 확인</button>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. MEMBER MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
function MemberManagement({t,guilds,membersData,setMembersData,contribsData}){
  const [guildId,setGuildId]=useState(guilds[0]?.id);
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState(null);
  const [modal,setModal]=useState(null);
  const [editTarget,setEditTarget]=useState(null);
  const [form,setForm]=useState({nick:"",server:"",job:"",joined:"",left:""});
  const [delConfirm,setDelConfirm]=useState(null);

  const members=(membersData[guildId]||[]).filter(m=>m.nick.toLowerCase().includes(search.toLowerCase()));
  const selMember=members.find(m=>m.id===selected?.id)||selected;

  const openAdd=()=>{setForm({nick:"",server:"",job:"",joined:"",left:""});setModal("add");};
  const openEdit=(m)=>{setEditTarget(m);setForm({nick:m.nick,server:m.server,job:m.job,joined:m.joined,left:m.left});setModal("edit");};
  const save=()=>{
    if(!form.nick.trim())return;
    if(modal==="add") setMembersData(p=>({...p,[guildId]:[...(p[guildId]||[]),{id:Date.now(),...form,score:0,radar:[],pct:0}]}));
    else setMembersData(p=>({...p,[guildId]:p[guildId].map(m=>m.id===editTarget.id?{...m,...form}:m)}));
    setModal(null);
  };
  const deleteMember=(id)=>{
    setMembersData(p=>({...p,[guildId]:p[guildId].filter(m=>m.id!==id)}));
    if(selected?.id===id)setSelected(null);
    setDelConfirm(null);
  };

  return(
    <div style={{display:"flex",flex:1,overflow:"hidden"}}>
      {/* LEFT */}
      <div style={{width:320,flexShrink:0,borderRight:`1px solid ${t.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${t.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:500,color:t.text}}>길드원 관리</div>
            <button onClick={openAdd} style={{fontSize:11,padding:"5px 12px",border:`1px solid ${t.borderStrong}`,borderRadius:7,background:t.accentFaint,color:t.accent,cursor:"pointer",fontFamily:"'Courier New',monospace",fontWeight:500}}>+ 추가</button>
          </div>
          <select value={guildId} onChange={e=>{setGuildId(+e.target.value);setSelected(null);}}
            style={{...selectStyle(t),width:"100%",marginBottom:8}}>
            {guilds.map(g=><option key={g.id} value={g.id} style={optionStyle(t)}>{g.name} ({g.game})</option>)}
          </select>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:t.textMuted,fontSize:12,pointerEvents:"none"}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="닉네임 검색..."
              style={{...iStyle(t),paddingLeft:28}}/>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"8px 10px"}}>
          {members.length===0&&<div style={{textAlign:"center",color:t.textMuted,fontSize:12,marginTop:40}}>결과 없음</div>}
          {members.map((m,i)=>(
            <div key={m.id} onClick={()=>setSelected(m)}
              style={{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:8,background:selected?.id===m.id?t.sideActive:t.bgCard,border:`1px solid ${selected?.id===m.id?t.borderStrong:t.border}`,marginBottom:6,cursor:"pointer",transition:"all 0.15s"}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:t.avColors[i%6][0],color:t.avColors[i%6][1],display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:600,flexShrink:0}}>{m.nick.slice(0,2).toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:500,color:selected?.id===m.id?t.accent:t.text}}>{m.nick}</div>
                <div style={{fontSize:10,color:t.textMuted}}>{m.job} · {m.server}</div>
              </div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={e=>{e.stopPropagation();openEdit(m);}} style={{fontSize:9,padding:"3px 7px",border:`1px solid ${t.border}`,borderRadius:5,background:"transparent",color:t.textMuted,cursor:"pointer"}}>수정</button>
                <button onClick={e=>{e.stopPropagation();setDelConfirm(m.id);}} style={{fontSize:9,padding:"3px 7px",border:"1px solid rgba(255,91,91,0.2)",borderRadius:5,background:"transparent",color:"#ff5b5b",cursor:"pointer"}}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{flex:1,padding:"20px 22px",overflowY:"auto"}}>
        {!selMember?(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:t.textMuted,gap:10}}>
            <div style={{fontSize:36,opacity:0.4}}>◈</div>
            <div style={{fontSize:13}}>길드원을 선택하면 상세 정보가 표시됩니다</div>
          </div>
        ):(
          <>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
              <div style={{width:50,height:50,borderRadius:13,background:t.accentFaint,border:`1px solid ${t.borderStrong}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,color:t.accent,fontWeight:700}}>{selMember.nick.slice(0,2).toUpperCase()}</div>
              <div>
                <div style={{fontSize:17,fontWeight:500,color:t.text}}>{selMember.nick}</div>
                <div style={{fontSize:11,color:t.textMuted,marginTop:2}}>{selMember.job} · {selMember.server} · 가입 {selMember.joined}</div>
              </div>
              {selMember.left&&<Tag bg="rgba(255,91,91,0.08)" color="#ff5b5b">탈퇴 {selMember.left}</Tag>}
            </div>

            {/* RADAR */}
            <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:12,padding:"16px 18px",marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:500,color:t.text,marginBottom:12}}>역량 레이더 (컨텐츠별 점수)</div>
              {selMember.radar&&selMember.radar.length===6&&selMember.radar.some(v=>v>0)?(
                <div style={{display:"flex",gap:20,alignItems:"center"}}>
                  <RadarCanvas t={t} vals={selMember.radar} size={160}/>
                  <div style={{flex:1}}>
                    {RADAR_LABELS.map((lbl,i)=>(
                      <div key={lbl} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <div style={{fontSize:11,color:t.textSub,width:60,flexShrink:0}}>{lbl}</div>
                        <div style={{flex:1,height:4,background:t.pBg,borderRadius:2}}>
                          <div style={{height:4,width:`${selMember.radar[i]||0}%`,background:t.pBar,borderRadius:2,transition:"width 0.4s"}}/>
                        </div>
                        <div style={{fontSize:11,color:t.accent,width:28,textAlign:"right"}}>{selMember.radar[i]||0}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ):(
                <div style={{textAlign:"center",padding:"28px 0",color:t.textMuted,fontSize:12,border:`1px dashed ${t.border}`,borderRadius:8}}>
                  <div style={{fontSize:28,marginBottom:8,opacity:0.4}}>📊</div>
                  데이터 정보 없음 — 점수 관리에서 컨텐츠별 점수를 입력해주세요
                </div>
              )}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {(()=>{
                // contribsData에서 현재 선택된 길드 + 길드원 ID로 누적 기여도 조회
                const gId = guildId;
                const contribEntry = (contribsData[gId]||[]).find(c=>c.id===selMember.id||c.nick===selMember.nick);
                const contribScore = contribEntry ? contribEntry.score.toLocaleString() : "—";
                const contribPct   = contribEntry ? contribEntry.pct+"%" : "—";
                return [
                  ["닉네임",  selMember.nick],
                  ["서버명",  selMember.server],
                  ["직업",    selMember.job],
                  ["가입일",  selMember.joined],
                  ["탈퇴일",  selMember.left||"—"],
                  ["누적 기여도", contribScore],
                ].map(([k,v])=>(
                  <div key={k} style={{background:t.bgAlt,borderRadius:8,padding:"10px 13px"}}>
                    <div style={{fontSize:9,color:t.textMuted,letterSpacing:"0.1em",marginBottom:3}}>{k}</div>
                    <div style={{fontSize:k==="누적 기여도"?15:14,fontWeight:500,color:k==="누적 기여도"?t.accent:t.text}}>{v}</div>
                    {k==="누적 기여도"&&contribEntry&&(
                      <div style={{fontSize:9,color:t.textMuted,marginTop:2}}>전체 기여도 {contribPct}</div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </>
        )}
      </div>

      <Modal open={!!modal} onClose={()=>setModal(null)} t={t} title={modal==="add"?"길드원 추가":"길드원 수정"}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[["닉네임","nick","닉네임"],["서버명","server","서버명"],["직업","job","전사/딜러/힐러..."],["가입일","joined","2025.01.01"],["탈퇴일","left","비어있으면 현역"]].map(([label,key,ph])=>(
            <div key={key}>
              <div style={{fontSize:10,color:t.textMuted,marginBottom:3}}>{label}</div>
              <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph} style={iStyle(t)}/>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <button onClick={()=>setModal(null)} style={btnGhost(t)}>취소</button>
            <button onClick={save} style={btnPrimary(t)}>저장</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!delConfirm} onClose={()=>setDelConfirm(null)} t={t} title="길드원 삭제 확인">
        <div style={{fontSize:12,color:t.textSub,marginBottom:16}}>해당 길드원의 모든 기록이 삭제됩니다.</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setDelConfirm(null)} style={btnGhost(t)}>취소</button>
          <button onClick={()=>deleteMember(delConfirm)} style={btnDanger()}>삭제</button>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. SCORE MANAGEMENT  (hook-safe: no useState inside map)
// ══════════════════════════════════════════════════════════════════════════════
function ScoreRow({t,m,idx,content,scoresData,guildId,onSave,onDelete,onHistory,isSelected,onSelect,contents}){
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState("");
  const sc=(scoresData[guildId]?.[content]||[]).find(s=>s.memberId===m.id);
  const diff=sc?sc.score-sc.prev:null;
  return(
    <div onClick={onSelect}
      style={{display:"grid",gridTemplateColumns:"1fr 64px 80px 90px 80px 130px",padding:"9px 14px",borderBottom:idx>0?`0.5px solid ${t.border}`:"none",background:isSelected?t.sideActive:"transparent",cursor:"pointer",alignItems:"center",transition:"background 0.15s"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:24,height:24,borderRadius:"50%",background:t.avColors[idx%6][0],color:t.avColors[idx%6][1],display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:600,flexShrink:0}}>{m.nick.slice(0,2).toUpperCase()}</div>
        <span style={{fontSize:12,color:t.text,fontWeight:500}}>{m.nick}</span>
      </div>
      <div style={{fontSize:11,color:t.textMuted}}>{m.job}</div>
      <div>
        {editing?(
          <input autoFocus value={val} onChange={e=>setVal(e.target.value)} onClick={e=>e.stopPropagation()}
            style={{...iStyle(t),width:70,padding:"3px 7px"}}
            onKeyDown={e=>{if(e.key==="Enter"){onSave(m.id,m.nick,val);setEditing(false);}if(e.key==="Escape")setEditing(false);}}/>
        ):(
          <span style={{fontSize:13,fontWeight:500,color:sc?t.text:t.textMuted}}>{sc?sc.score:"—"}</span>
        )}
      </div>
      <div>{diff!==null?<span style={{fontSize:11,color:diff>=0?t.up:t.dn}}>{diff>=0?"+":""}{diff}</span>:<span style={{fontSize:11,color:t.textMuted}}>—</span>}</div>
      <div style={{fontSize:10,color:t.textMuted}}>{sc?.date||"—"}</div>
      <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
        {editing?(
          <>
            <button onClick={()=>{onSave(m.id,m.nick,val);setEditing(false);}} style={{fontSize:10,padding:"3px 7px",borderRadius:5,border:`1px solid ${t.borderStrong}`,background:t.accentFaint,color:t.accent,cursor:"pointer"}}>저장</button>
            <button onClick={()=>setEditing(false)} style={{fontSize:10,padding:"3px 7px",borderRadius:5,border:`1px solid ${t.border}`,background:"transparent",color:t.textMuted,cursor:"pointer"}}>취소</button>
          </>
        ):(
          <>
            <button onClick={()=>{setVal(sc?.score?.toString()||"");setEditing(true);}} style={{fontSize:10,padding:"3px 7px",borderRadius:5,border:`1px solid ${t.border}`,background:"transparent",color:t.textSub,cursor:"pointer"}}>{sc?"수정":"입력"}</button>
            {sc&&<button onClick={()=>onDelete(m.id)} style={{fontSize:10,padding:"3px 7px",borderRadius:5,border:"1px solid rgba(255,91,91,0.25)",background:"transparent",color:"#ff5b5b",cursor:"pointer"}}>삭제</button>}
            <button onClick={()=>onHistory(m)} style={{fontSize:10,padding:"3px 7px",borderRadius:5,border:`1px solid ${t.border}`,background:"transparent",color:t.textMuted,cursor:"pointer"}}>히스토리</button>
          </>
        )}
      </div>
    </div>
  );
}

function ScoreManagement({t,guilds,membersData,scoresData,setScoresData,contents,setContents}){
  const [guildId,setGuildId]=useState(guilds[0]?.id);
  const [content,setContent]=useState(contents[0]||CONTENTS_INIT[0]);
  const [selected,setSelected]=useState(null);
  const [histModal,setHistModal]=useState(null);
  const [addModal,setAddModal]=useState(false);
  const [newContent,setNewContent]=useState("");
  const [guildScore,setGuildScore]=useState("");
  const [simSaved,setSimSaved]=useState(false);
  const [delContentConfirm,setDelContentConfirm]=useState(null);
  const [delContentAlert,setDelContentAlert]=useState(false);
  // 컨텐츠 이름 수정용
  const [renameModal,setRenameModal]=useState(false);
  const [renameVal,setRenameVal]=useState("");

  const members=membersData[guildId]||[];
  const getScore=(memberId)=>(scoresData[guildId]?.[content]||[]).find(s=>s.memberId===memberId);

  // 현재 컨텐츠 모든 길드원 총점 계산
  const contentTotal=(scoresData[guildId]?.[content]||[]).reduce((sum,s)=>sum+s.score,0);

  const saveScore=(memberId,nick,val)=>{
    const num=parseInt(val,10);if(isNaN(num))return;
    setScoresData(prev=>{
      const arr=(prev[guildId]?.[content]||[]).filter(s=>s.memberId!==memberId);
      const ex=(prev[guildId]?.[content]||[]).find(s=>s.memberId===memberId);
      return{...prev,[guildId]:{...(prev[guildId]||{}),[content]:[...arr,{memberId,nick,score:num,prev:ex?.score||0,date:new Date().toLocaleDateString("ko-KR")}]}};
    });
  };
  const deleteScore=(memberId)=>{
    setScoresData(p=>({...p,[guildId]:{...(p[guildId]||{}),[content]:(p[guildId]?.[content]||[]).filter(s=>s.memberId!==memberId)}}));
  };
  const addContent=()=>{
    if(!newContent.trim())return;
    setContents(p=>[...p,newContent.trim()]);setNewContent("");setAddModal(false);
  };
  const deleteContent=(c)=>{
    if(CONTENTS_INIT.includes(c)){setDelContentAlert(true);return;}
    setContents(p=>p.filter(x=>x!==c));
    if(content===c) setContent(contents.find(x=>x!==c)||CONTENTS_INIT[0]);
    setScoresData(p=>({...p,[guildId]:{...p[guildId],[c]:undefined}}));
  };
  // 컨텐츠 이름 수정 (기본 포함 모두 가능)
  const renameContent=()=>{
    const newName=renameVal.trim();
    if(!newName||newName===content){setRenameModal(false);return;}
    // 이름 변경: contents 배열 + scoresData 키 이전
    setContents(p=>p.map(c=>c===content?newName:c));
    setScoresData(p=>{
      const gData={...(p[guildId]||{})};
      if(gData[content]){gData[newName]=gData[content];delete gData[content];}
      return{...p,[guildId]:gData};
    });
    setContent(newName);
    setRenameModal(false);setRenameVal("");
  };

  return(
    <div style={{display:"flex",flex:1,overflow:"hidden"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* CONTROLS */}
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:t.navBg}}>
          <select value={guildId} onChange={e=>{setGuildId(+e.target.value);setSelected(null);}} style={{...selectStyle(t),width:"auto",minWidth:140}}>
            {guilds.map(g=><option key={g.id} value={g.id} style={optionStyle(t)}>{g.name}</option>)}
          </select>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {contents.map(c=>(
              <div key={c} style={{display:"flex",alignItems:"center",gap:0}}>
                <button onClick={()=>{setContent(c);setSelected(null);}}
                  style={{fontSize:11,padding:"4px 10px",borderRadius:c===content?"20px 0 0 20px":20,border:`1px solid ${c===content?t.borderStrong:t.border}`,borderRight:c===content?"none":"",background:c===content?t.accentFaint:"transparent",color:c===content?t.accent:t.textSub,cursor:"pointer",fontFamily:"'Courier New',monospace",transition:"all 0.15s"}}>
                  {c}
                </button>
                {c===content&&(
                  <button
                    onClick={()=>setDelContentConfirm(c)}
                    title={CONTENTS_INIT.includes(c)?"기본 컨텐츠는 삭제 불가":"컨텐츠 삭제"}
                    style={{fontSize:9,padding:"4px 7px",borderRadius:"0 20px 20px 0",border:`1px solid ${t.borderStrong}`,borderLeft:"none",background:CONTENTS_INIT.includes(c)?"rgba(100,100,100,0.1)":"rgba(255,91,91,0.12)",color:CONTENTS_INIT.includes(c)?t.textMuted:"#ff5b5b",cursor:"pointer",lineHeight:1}}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* 선택 컨텐츠 이름 수정 버튼 — 기본/추가 컨텐츠 모두 가능 */}
          <button onClick={()=>{setRenameVal(content);setRenameModal(true);}}
            style={{fontSize:11,padding:"4px 11px",border:`1px solid ${t.border}`,borderRadius:20,background:"transparent",color:t.textMuted,cursor:"pointer",fontFamily:"'Courier New',monospace"}}>
            ✏ 이름 수정
          </button>
          <button onClick={()=>setAddModal(true)} style={{fontSize:11,padding:"4px 11px",border:`1px solid ${t.borderStrong}`,borderRadius:20,background:t.accentFaint,color:t.accent,cursor:"pointer",fontFamily:"'Courier New',monospace"}}>+ 컨텐츠 등록</button>
        </div>

        {/* TABLE */}
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:500,color:t.text}}>{content} — 점수 현황</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:t.textMuted}}>시뮬 총점:</span>
              <input value={guildScore} onChange={e=>{setGuildScore(e.target.value);setSimSaved(false);}}
                placeholder={contentTotal>0?`현재 총점 ${contentTotal.toLocaleString()}`:"점수 없음"}
                style={{...iStyle(t),width:140,padding:"5px 9px"}}/>
              <button onClick={()=>{if(guildScore)setSimSaved(true);}} style={{fontSize:11,padding:"5px 10px",border:`1px solid ${t.border}`,borderRadius:6,background:simSaved?t.upBg:t.accentFainter,color:simSaved?t.up:t.accentDim,cursor:"pointer",fontFamily:"'Courier New',monospace"}}>
                {simSaved?"✓ 저장됨":"시뮬 저장"}
              </button>
            </div>
          </div>
          <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:11,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 64px 80px 90px 80px 130px",padding:"8px 14px",background:t.bgAlt,borderBottom:`1px solid ${t.border}`}}>
              {["닉네임","직업","점수","전주 대비","입력일","액션"].map(h=><div key={h} style={{fontSize:10,color:t.textMuted,letterSpacing:"0.07em"}}>{h}</div>)}
            </div>
            {members.map((m,i)=>(
              <ScoreRow key={m.id} t={t} m={m} idx={i} content={content} scoresData={scoresData} guildId={guildId}
                onSave={saveScore} onDelete={deleteScore} onHistory={setHistModal}
                isSelected={selected?.id===m.id} onSelect={()=>setSelected(m)} contents={contents}/>
            ))}
            {members.length===0&&<div style={{textAlign:"center",padding:"30px",color:t.textMuted,fontSize:12}}>이 길드에 등록된 길드원이 없습니다</div>}
          </div>
        </div>
      </div>

      {/* SIDE PANEL */}
      {selected&&(
        <div style={{width:220,flexShrink:0,borderLeft:`1px solid ${t.border}`,padding:"16px",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:500,color:t.text}}>{selected.nick}</div>
            <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:t.textMuted,cursor:"pointer",fontSize:14}}>✕</button>
          </div>
          <div style={{fontSize:10,color:t.textMuted,marginBottom:8}}>컨텐츠별 최신 점수</div>
          {contents.map(c=>{
            const sc2=(scoresData[guildId]?.[c]||[]).find(s=>s.memberId===selected.id);
            return(
              <div key={c} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 9px",background:c===content?t.sideActive:t.bgAlt,borderRadius:6,marginBottom:4,border:`0.5px solid ${c===content?t.borderStrong:t.border}`}}>
                <span style={{fontSize:11,color:c===content?t.accent:t.textSub}}>{c}</span>
                <span style={{fontSize:12,fontWeight:500,color:sc2?t.text:t.textMuted}}>{sc2?sc2.score:"—"}</span>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!histModal} onClose={()=>setHistModal(null)} t={t} title={`${histModal?.nick} 히스토리`}>
        <div style={{fontSize:11,color:t.textMuted,marginBottom:10}}>{content} 점수 변경 이력</div>
        <div style={{maxHeight:220,overflowY:"auto"}}>
          {[{date:"2025.04.28",score:getScore(histModal?.id)?.score||0,note:"최신"},{date:"2025.04.21",score:Math.max(0,(getScore(histModal?.id)?.score||0)-33),note:"전주"},{date:"2025.04.14",score:Math.max(0,(getScore(histModal?.id)?.score||0)-71),note:"-"}].map((h,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",background:t.bgAlt,borderRadius:7,marginBottom:5}}>
              <span style={{fontSize:11,color:t.textSub}}>{h.date}</span>
              <span style={{fontSize:12,fontWeight:500,color:t.text}}>{h.score}</span>
              <span style={{fontSize:10,color:t.textMuted}}>{h.note}</span>
            </div>
          ))}
        </div>
      </Modal>
      <Modal open={addModal} onClose={()=>setAddModal(false)} t={t} title="컨텐츠 등록">
        <div>
          <div style={{fontSize:10,color:t.textMuted,marginBottom:6}}>컨텐츠명</div>
          <input value={newContent} onChange={e=>setNewContent(e.target.value)} placeholder="새 컨텐츠명" style={{...iStyle(t),marginBottom:14}}/>
          <div style={{display:"flex",gap:8}}><button onClick={()=>setAddModal(false)} style={btnGhost(t)}>취소</button><button onClick={addContent} style={btnPrimary(t)}>등록</button></div>
        </div>
      </Modal>

      {/* 컨텐츠 이름 수정 모달 */}
      <Modal open={renameModal} onClose={()=>setRenameModal(false)} t={t} title={`"${content}" 이름 수정`}>
        <div>
          <div style={{fontSize:11,color:t.textSub,marginBottom:10,lineHeight:1.6}}>
            게임에 맞게 컨텐츠 이름을 변경할 수 있습니다.<br/>
            <span style={{color:t.accent,fontSize:10}}>예) 총력전 → 레이드, 결투장 → 아레나</span>
          </div>
          <div style={{fontSize:10,color:t.textMuted,marginBottom:5}}>새 컨텐츠명</div>
          <input value={renameVal} onChange={e=>setRenameVal(e.target.value)} placeholder={content}
            style={{...iStyle(t),marginBottom:14}}
            onKeyDown={e=>{if(e.key==="Enter")renameContent();}}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setRenameModal(false)} style={btnGhost(t)}>취소</button>
            <button onClick={renameContent} style={btnPrimary(t)}>이름 변경</button>
          </div>
        </div>
      </Modal>

      {/* 컨텐츠 삭제 확인 모달 */}
      <Modal open={!!delContentConfirm} onClose={()=>setDelContentConfirm(null)} t={t} title="컨텐츠 삭제 확인">
        <div>
          <div style={{fontSize:12,color:t.textSub,lineHeight:1.7,marginBottom:6}}>
            <strong style={{color:t.accent}}>"{delContentConfirm}"</strong> 컨텐츠를 삭제하면
          </div>
          <div style={{fontSize:12,color:"#ff5b5b",marginBottom:16}}>해당 컨텐츠의 모든 점수 데이터가 함께 삭제됩니다.</div>
          {CONTENTS_INIT.includes(delContentConfirm||"")
            ? <div style={{fontSize:12,color:t.textMuted,marginBottom:16,padding:"8px 12px",background:t.bgAlt,borderRadius:7}}>⚠ 기본 제공 컨텐츠는 삭제할 수 없습니다.</div>
            : null
          }
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setDelContentConfirm(null)} style={btnGhost(t)}>취소</button>
            {!CONTENTS_INIT.includes(delContentConfirm||"") &&
              <button onClick={()=>{deleteContent(delContentConfirm);setDelContentConfirm(null);}} style={btnDanger()}>삭제 확인</button>
            }
          </div>
        </div>
      </Modal>

      {/* 기본 컨텐츠 삭제 불가 알림 */}
      <Modal open={delContentAlert} onClose={()=>setDelContentAlert(false)} t={t} title="삭제 불가">
        <div style={{fontSize:12,color:t.textSub,marginBottom:16}}>기본 제공 컨텐츠(총력전, 결투장 등)는 삭제할 수 없습니다. 직접 추가한 컨텐츠만 삭제 가능합니다.</div>
        <button onClick={()=>setDelContentAlert(false)} style={btnPrimary(t)}>확인</button>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. CONTRIBUTION ANALYSIS (hook-safe row)
// ══════════════════════════════════════════════════════════════════════════════
function ContribRow({t,c,idx,isSelected,onSelect,onDelete,onHistory,onSaved}){
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
              <button onClick={()=>{onSaved(c.id,val,note);setEditing(false);setVal("");setNote("");}} style={{fontSize:10,padding:"3px 7px",borderRadius:5,border:`1px solid ${t.borderStrong}`,background:t.accentFaint,color:t.accent,cursor:"pointer"}}>저장</button>
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

function ContribAnalysis({t,guilds,contribsData,setContribsData}){
  const [guildId,setGuildId]=useState(guilds[0]?.id);
  const [selected,setSelected]=useState(null);
  const [histModal,setHistModal]=useState(null);
  const [delConfirm,setDelConfirm]=useState(null);

  const contribs=contribsData[guildId]||[];
  const total=contribs.reduce((a,c)=>a+c.score,0);
  const sorted=[...contribs].sort((a,b)=>b.score-a.score);

  const saveContrib=(id,val,note)=>{
    const num=parseInt(val,10);if(isNaN(num))return;
    setContribsData(p=>({...p,[guildId]:p[guildId].map(c=>c.id===id?{...c,score:num,pct:+((num/total)*100).toFixed(1),history:[{date:new Date().toLocaleDateString("ko-KR"),delta:num>c.score?`+${num-c.score}`:`${num-c.score}`,note:note||"수정"},...(c.history||[])]}:c)}));
  };
  const deleteContrib=(id)=>{setContribsData(p=>({...p,[guildId]:p[guildId].filter(c=>c.id!==id)}));if(selected?.id===id)setSelected(null);setDelConfirm(null);};
  const selC=contribs.find(c=>c.id===selected?.id)||selected;

  return(
    <div style={{display:"flex",flex:1,overflow:"hidden"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",gap:12,background:t.navBg}}>
          <select value={guildId} onChange={e=>{setGuildId(+e.target.value);setSelected(null);}} style={{...selectStyle(t),width:"auto",minWidth:140}}>
            {guilds.map(g=><option key={g.id} value={g.id} style={optionStyle(t)}>{g.name}</option>)}
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

// ══════════════════════════════════════════════════════════════════════════════
// 6. RANKING SIMULATION
// ══════════════════════════════════════════════════════════════════════════════
function SimBarChart({t,data}){
  const ref=useRef(null);
  useEffect(()=>{
    const cv=ref.current;if(!cv)return;
    const dpr=window.devicePixelRatio||1;
    const W=cv.offsetWidth,H=cv.offsetHeight;if(!W||!H)return;
    cv.width=W*dpr;cv.height=H*dpr;
    const ctx=cv.getContext("2d");ctx.scale(dpr,dpr);
    ctx.clearRect(0,0,W,H);
    const max=Math.max(...data.map(d=>Math.max(d.score,d.sim||d.score)))+200;
    const bw=Math.floor((W-48)/(data.length*2+1));
    const gap=bw;const top=18,bot=30,hh=H-top-bot;
    data.forEach((d,i)=>{
      const x=24+i*(bw*2+gap);
      const barH=Math.floor((d.score/max)*hh);
      ctx.fillStyle=d.ours?t.accent:`rgba(${t.radarRgb},0.28)`;
      if(typeof ctx.roundRect==="function") ctx.roundRect(x,top+hh-barH,bw,barH,3);
      else ctx.rect(x,top+hh-barH,bw,barH);
      ctx.fill();
      if(d.sim&&d.sim!==d.score){
        const sH=Math.floor((d.sim/max)*hh);
        ctx.fillStyle=d.ours?"rgba(76,255,145,0.7)":`rgba(${t.radarRgb},0.12)`;
        if(typeof ctx.roundRect==="function") ctx.roundRect(x+bw+1,top+hh-sH,bw,sH,3);
        else ctx.rect(x+bw+1,top+hh-sH,bw,sH);
        ctx.fill();
      }
      ctx.fillStyle=d.ours?t.accent:t.chartLabel;ctx.font=`8px 'Courier New'`;ctx.textAlign="center";
      ctx.fillText(d.name.slice(0,5),x+bw/2,H-6);
      ctx.fillStyle=t.text;ctx.font=`9px 'Courier New'`;
      ctx.fillText(d.score,x+bw/2,top+hh-barH-4);
    });
  },[t,data]);
  return <canvas ref={ref} style={{width:"100%",height:"100%",display:"block"}}/>;
}

function RankingSimulation({t,guilds,activeGuild}){
  const [guildId,setGuildId]=useState(guilds[0]?.id);
  const [content,setContent]=useState(SIM_CONTENTS[0]);
  const [simScores,setSimScores]=useState({});
  const [guildSim,setGuildSim]=useState("");
  const [savedSims,setSavedSims]=useState([]);
  const [saveModal,setSaveModal]=useState(false);
  const [saveName,setSaveName]=useState("");

  // 선택 길드의 게임 기준으로 랭킹 데이터 결정
  const currentGuild = guilds.find(g=>g.id===guildId) || guilds[0];
  const gameRanks = SERVER_RANKS_BY_GAME[currentGuild?.game] || SERVER_RANKS_BY_GAME["로스트아크"];
  const ourEntry  = gameRanks.find(r=>r.ours);
  const ourBase   = ourEntry?.scores[content] ?? 2841;
  const ourSim    = guildSim ? parseInt(guildSim)||ourBase : ourBase;

  const chartData = gameRanks.map(r=>({
    ...r,
    score: r.scores[content] ?? 0,
    sim: r.ours ? ourSim : (r.scores[content]??0)+(simScores[r.name]||0),
  }));
  const sorted    = [...chartData].sort((a,b)=>(b.sim||b.score)-(a.sim||a.score));
  const ourRank   = sorted.findIndex(r=>r.ours)+1;
  const nextAbove = sorted[ourRank-2];
  const needed    = nextAbove ? Math.max(0,(nextAbove.sim||nextAbove.score)-ourSim+1) : 0;
  const curRankNow= gameRanks.map(r=>({...r,score:r.scores[content]??0})).sort((a,b)=>b.score-a.score).findIndex(r=>r.ours)+1;

  const saveSim=()=>{
    if(!saveName.trim())return;
    setSavedSims(p=>[...p,{name:saveName,game:currentGuild?.game,content,ourScore:ourSim,rank:ourRank,date:new Date().toLocaleDateString("ko-KR")}]);
    setSaveModal(false);setSaveName("");
  };

  return(
    <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div>
          <div style={{fontSize:15,fontWeight:500,color:t.text}}>랭킹 시뮬레이션</div>
          <div style={{fontSize:10,color:t.textMuted,marginTop:2}}>같은 게임 내 길드 간 점수 예상 순위 확인</div>
        </div>
        <button onClick={()=>setSaveModal(true)} style={{fontSize:11,padding:"7px 16px",border:`1px solid ${t.borderStrong}`,borderRadius:8,background:t.accentFaint,color:t.accent,cursor:"pointer",fontFamily:"'Courier New',monospace",fontWeight:500}}>시뮬 저장</button>
      </div>

      {/* 길드(게임) 선택 */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 14px",background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:9}}>
        <div style={{fontSize:11,color:t.textMuted,flexShrink:0}}>비교 기준 길드:</div>
        <select value={guildId} onChange={e=>{setGuildId(+e.target.value);setSimScores({});setGuildSim("");}}
          style={{...selectStyle(t),flex:1,maxWidth:200}}>
          {guilds.map(g=><option key={g.id} value={g.id} style={optionStyle(t)}>{g.name} ({g.game})</option>)}
        </select>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:10,color:t.textMuted}}>게임:</span>
          <span style={{fontSize:11,padding:"3px 10px",background:t.accentFaint,border:`1px solid ${t.borderStrong}`,color:t.accent,borderRadius:20,fontWeight:500}}>{currentGuild?.game}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:10,color:t.textMuted}}>같은 게임 길드:</span>
          <span style={{fontSize:11,fontWeight:500,color:t.text}}>{gameRanks.length}개</span>
        </div>
      </div>

      {/* CONTENT TABS */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {SIM_CONTENTS.map(c=>(
          <button key={c} onClick={()=>{setContent(c);setSimScores({});setGuildSim("");}}
            style={{fontSize:11,padding:"5px 14px",borderRadius:20,border:`1px solid ${content===c?t.borderStrong:t.border}`,background:content===c?t.accentFaint:"transparent",color:content===c?t.accent:t.textSub,cursor:"pointer",fontFamily:"'Courier New',monospace",transition:"all 0.15s"}}>
            {c}
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        {/* INPUT */}
        <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:12,padding:"16px 18px"}}>
          <div style={{fontSize:12,fontWeight:500,color:t.text,marginBottom:14}}>점수 입력 ({content})</div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:t.textMuted,marginBottom:5}}>
              우리 길드 ({currentGuild?.name}) 예상 점수
            </div>
            <input value={guildSim} onChange={e=>setGuildSim(e.target.value)} placeholder={`현재: ${ourBase.toLocaleString()}`} style={iStyle(t)}/>
          </div>
          <div style={{fontSize:10,color:t.textMuted,marginBottom:8}}>타 길드 점수 조정 (±)</div>
          {gameRanks.filter(r=>!r.ours).map(r=>(
            <div key={r.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{fontSize:11,color:t.textSub,width:90,flexShrink:0}}>{r.name}</div>
              <input value={simScores[r.name]?.toString()||""}
                onChange={e=>setSimScores(p=>({...p,[r.name]:parseInt(e.target.value)||0}))}
                placeholder={`현재 ${(r.scores[content]||0).toLocaleString()}`}
                style={{...iStyle(t),flex:1,padding:"5px 9px"}}/>
            </div>
          ))}
        </div>

        {/* RESULT */}
        <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:12,padding:"16px 18px"}}>
          <div style={{fontSize:12,fontWeight:500,color:t.text,marginBottom:14}}>시뮬레이션 결과</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
            <div style={{background:t.bgAlt,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:9,color:t.textMuted,marginBottom:4}}>현재 순위</div>
              <div style={{fontSize:22,fontWeight:500,color:t.text}}>#{curRankNow}</div>
            </div>
            <div style={{background:t.accentFaint,borderRadius:8,padding:"10px 12px",textAlign:"center",border:`1px solid ${t.borderStrong}`}}>
              <div style={{fontSize:9,color:t.accentDim,marginBottom:4}}>예상 순위</div>
              <div style={{fontSize:22,fontWeight:500,color:t.accent}}>#{ourRank}</div>
            </div>
            <div style={{background:t.upBg,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:9,color:t.up,marginBottom:4}}>필요 점수</div>
              <div style={{fontSize:22,fontWeight:500,color:t.up}}>+{needed}</div>
            </div>
          </div>
          <div style={{fontSize:10,color:t.textMuted,marginBottom:8}}>예상 순위표 ({currentGuild?.game} · {content})</div>
          <div style={{maxHeight:200,overflowY:"auto"}}>
            {sorted.map((r,i)=>(
              <div key={r.name} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:6,background:r.ours?t.accentFaint:t.bgAlt,border:r.ours?`1px solid ${t.borderStrong}`:`0.5px solid ${t.border}`,marginBottom:4}}>
                <span style={{width:18,fontSize:11,fontWeight:500,color:i===0?"#d4a017":r.ours?t.accent:t.textMuted}}>{i+1}</span>
                <span style={{flex:1,fontSize:11,color:r.ours?t.accent:t.text,fontWeight:r.ours?500:400}}>{r.name}{r.ours?" ★":""}</span>
                <span style={{fontSize:11,fontWeight:500,color:r.ours?t.accent:t.text}}>{(r.sim||r.score).toLocaleString()}</span>
                {r.sim&&r.sim!==r.score&&<span style={{fontSize:10,color:t.up}}>+{r.sim-r.score}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BAR CHART */}
      <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:12,padding:"16px 18px",marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:500,color:t.text,marginBottom:4}}>점수 비교 그래프</div>
        <div style={{fontSize:10,color:t.textMuted,marginBottom:10}}>■ 현재  ■ 시뮬레이션</div>
        <div style={{height:180}}><SimBarChart t={t} data={chartData}/></div>
      </div>

      {/* SAVED LIST — 항상 표시 */}
      <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:12,padding:"16px 18px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div>
            <div style={{fontSize:12,fontWeight:500,color:t.text}}>저장된 시뮬레이션</div>
            <div style={{fontSize:10,color:t.textMuted,marginTop:2}}>시뮬 저장 버튼으로 현재 설정을 기록할 수 있습니다</div>
          </div>
          <span style={{fontSize:11,color:t.accent,fontWeight:500}}>{savedSims.length}건</span>
        </div>

        {savedSims.length===0 ? (
          <div style={{textAlign:"center",padding:"24px 0",color:t.textMuted,fontSize:12,border:`1px dashed ${t.border}`,borderRadius:8}}>
            <div style={{fontSize:22,marginBottom:6,opacity:0.4}}>📋</div>
            저장된 시뮬레이션이 없습니다.<br/>
            <span style={{fontSize:10}}>상단 "시뮬 저장" 버튼을 눌러 현재 설정을 저장하세요.</span>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 60px 90px 90px 36px",gap:4,padding:"6px 10px",background:t.bgAlt,borderRadius:"7px 7px 0 0",marginBottom:1}}>
              {["이름","게임","컨텐츠","예상순위","우리점수","저장일",""].map(h=><div key={h} style={{fontSize:9,color:t.textMuted,letterSpacing:"0.07em"}}>{h}</div>)}
            </div>
            {savedSims.map((s,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 60px 90px 90px 36px",gap:4,alignItems:"center",padding:"9px 10px",background:i%2===0?t.bgAlt:t.bgCard,borderRadius:i===savedSims.length-1?"0 0 7px 7px":0,borderBottom:i<savedSims.length-1?`0.5px solid ${t.border}`:"none"}}>
                <span style={{fontSize:11,fontWeight:500,color:t.text}}>{s.name}</span>
                <span style={{fontSize:10,color:t.accentDim}}>{s.game||"—"}</span>
                <span style={{fontSize:10,color:t.textMuted}}>{s.content}</span>
                <span style={{fontSize:12,fontWeight:500,color:t.accent}}>#{s.rank}</span>
                <span style={{fontSize:11,color:t.text}}>{s.ourScore.toLocaleString()}</span>
                <span style={{fontSize:10,color:t.textMuted}}>{s.date}</span>
                <button onClick={()=>setSavedSims(p=>p.filter((_,j)=>j!==i))}
                  style={{fontSize:10,padding:"3px 6px",borderRadius:5,border:"1px solid rgba(255,91,91,0.25)",background:"transparent",color:"#ff5b5b",cursor:"pointer"}}>✕</button>
              </div>
            ))}
          </>
        )}
      </div>

      <Modal open={saveModal} onClose={()=>setSaveModal(false)} t={t} title="시뮬레이션 저장">
        <div>
          <div style={{fontSize:10,color:t.textMuted,marginBottom:6}}>저장 이름</div>
          <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="시뮬레이션 이름" style={{...iStyle(t),marginBottom:14}}/>
          <div style={{display:"flex",gap:8}}><button onClick={()=>setSaveModal(false)} style={btnGhost(t)}>취소</button><button onClick={saveSim} style={btnPrimary(t)}>저장</button></div>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OCR IMAGE UPLOAD PAGE (이미지 업로드 → 스캔 시작)
// ── Topbar의 "OCR" 버튼 클릭 시 진입, 스캔 완료 후 OcrUpload(결과 화면)로 이동
// ══════════════════════════════════════════════════════════════════════════════
function OcrImageUpload({t,onScanComplete}){
  const [dragOver,setDragOver]=useState(false);
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState(null);
  const [scanning,setScanning]=useState(false);
  const [scanProgress,setScanProgress]=useState(0);
  const fileRef=useRef(null);

  const handleFile=(f)=>{
    if(!f)return;
    const allowed=["image/jpeg","image/png"];
    if(!allowed.includes(f.type)){alert("JPG 또는 PNG 파일만 업로드 가능합니다.");return;}
    if(f.size>10*1024*1024){alert("파일 크기는 최대 10MB까지 가능합니다.");return;}
    setFile(f);
    const reader=new FileReader();
    reader.onload=e=>setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const onDrop=(e)=>{
    e.preventDefault();setDragOver(false);
    const f=e.dataTransfer.files[0];
    handleFile(f);
  };

  const startScan=()=>{
    if(!file){alert("이미지를 먼저 업로드해주세요.");return;}
    setScanning(true);setScanProgress(0);
    const iv=setInterval(()=>{
      setScanProgress(p=>{
        if(p>=100){clearInterval(iv);setTimeout(()=>onScanComplete(),400);return 100;}
        return p+Math.floor(Math.random()*8)+3;
      });
    },120);
  };

  const removeFile=()=>{setFile(null);setPreview(null);setScanProgress(0);setScanning(false);};

  const formatSize=(bytes)=>{
    if(bytes<1024)return bytes+"B";
    if(bytes<1024*1024)return (bytes/1024).toFixed(1)+"KB";
    return (bytes/(1024*1024)).toFixed(1)+"MB";
  };

  return(
    <div style={{flex:1,overflowY:"auto",padding:"24px 28px",display:"flex",flexDirection:"column",gap:18}}>
      {/* 페이지 헤더 */}
      <div>
        <div style={{fontSize:16,fontWeight:500,color:t.text,marginBottom:4}}>OCR 이미지 업로드</div>
        <div style={{fontSize:11,color:t.textMuted}}>길드 점수 스크린샷을 업로드하면 AI가 자동으로 점수를 인식합니다</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>

        {/* ── 좌측: 업로드 존 ── */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:12,padding:"16px 18px"}}>
            <div style={{fontSize:12,fontWeight:500,color:t.text,marginBottom:12}}>이미지 업로드</div>

            {/* 드래그 앤 드롭 존 */}
            <div
              onDragOver={e=>{e.preventDefault();setDragOver(true);}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={onDrop}
              onClick={()=>!file&&fileRef.current?.click()}
              style={{
                position:"relative",
                border:`2px dashed ${dragOver?t.accent:file?t.borderStrong:t.border}`,
                borderRadius:10,
                background:dragOver?t.accentFaint:file?t.accentFainter:t.bgAlt,
                minHeight:220,
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                cursor:file?"default":"pointer",
                transition:"all 0.2s",
                overflow:"hidden",
                padding:16,
              }}>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png"
                onChange={e=>handleFile(e.target.files[0])}
                style={{display:"none"}}/>

              {!file?(
                /* 업로드 전 — 안내 문구 */
                <>
                  {/* 업로드 아이콘 */}
                  <div style={{width:56,height:56,borderRadius:14,background:t.accentFaint,border:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div style={{fontSize:13,fontWeight:500,color:t.text,marginBottom:6,textAlign:"center"}}>
                    이미지를 드래그하거나 클릭하여 업로드
                  </div>
                  <div style={{fontSize:11,color:t.textMuted,textAlign:"center",lineHeight:1.7}}>
                    JPG, PNG · 최대 10MB
                  </div>
                  {dragOver&&(
                    <div style={{position:"absolute",inset:0,background:t.accentFaint,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:9}}>
                      <div style={{fontSize:14,fontWeight:500,color:t.accent}}>여기에 놓으세요 ↓</div>
                    </div>
                  )}
                </>
              ):(
                /* 업로드 후 — 미리보기 */
                <div style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                  <div style={{position:"relative",width:"100%",borderRadius:8,overflow:"hidden",border:`1px solid ${t.border}`}}>
                    <img src={preview} alt="preview" style={{width:"100%",maxHeight:160,objectFit:"contain",background:"#000",display:"block"}}/>
                    {/* 스캔 라인 애니메이션 */}
                    {scanning&&(
                      <div style={{position:"absolute",left:0,right:0,height:2,background:t.accent,opacity:0.8,animation:"scanLine 1.5s ease-in-out infinite",top:`${scanProgress}%`,boxShadow:`0 0 8px ${t.accent}`}}/>
                    )}
                    <button onClick={e=>{e.stopPropagation();removeFile();}}
                      style={{position:"absolute",top:6,right:6,width:22,height:22,borderRadius:"50%",background:"rgba(0,0,0,0.6)",border:"none",color:"#fff",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,width:"100%"}}>
                    <div style={{width:28,height:28,borderRadius:6,background:t.accentFaint,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke={t.accent} strokeWidth="1.2"/><path d="M5 8h6M5 5.5h6M5 10.5h4" stroke={t.accent} strokeWidth="1" strokeLinecap="round"/></svg>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:500,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</div>
                      <div style={{fontSize:10,color:t.textMuted}}>{formatSize(file.size)}</div>
                    </div>
                    <div style={{fontSize:10,padding:"2px 8px",background:t.upBg,color:t.up,borderRadius:20,border:`1px solid ${t.up}44`}}>준비됨</div>
                  </div>
                </div>
              )}
            </div>

            {/* 스캔 진행바 */}
            {scanning&&(
              <div style={{marginTop:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:11,color:t.accent,fontWeight:500}}>
                    {scanProgress<30?"이미지 분석 중...":scanProgress<60?"텍스트 인식 중...":scanProgress<90?"데이터 파싱 중...":"인식 완료!"}
                  </span>
                  <span style={{fontSize:11,color:t.accent,fontWeight:500}}>{Math.min(scanProgress,100)}%</span>
                </div>
                <div style={{height:5,background:t.pBg,borderRadius:3}}>
                  <div style={{height:5,width:`${Math.min(scanProgress,100)}%`,background:t.pBar,borderRadius:3,transition:"width 0.15s",boxShadow:`0 0 6px ${t.accent}66`}}/>
                </div>
              </div>
            )}
          </div>

          {/* 업로드 가이드 */}
          <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:10,padding:"13px 16px"}}>
            <div style={{fontSize:11,fontWeight:500,color:t.text,marginBottom:8}}>인식 정확도를 높이는 팁</div>
            {[
              ["화면 전체","길드 점수 목록이 전체 보이도록 캡처하세요"],
              ["고해상도","해상도가 높을수록 인식률이 높아집니다"],
              ["텍스트 선명","흐릿하거나 잘린 텍스트는 인식 오류가 발생할 수 있습니다"],
            ].map(([t1,t2])=>(
              <div key={t1} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}>
                <span style={{color:t.up,fontSize:12,flexShrink:0,marginTop:1}}>✓</span>
                <div>
                  <span style={{fontSize:11,color:t.text,fontWeight:500}}>{t1} — </span>
                  <span style={{fontSize:11,color:t.textMuted}}>{t2}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 스캔 시작 버튼 */}
          <button onClick={startScan} disabled={!file||scanning}
            style={{
              width:"100%",padding:"13px",
              border:`1px solid ${file&&!scanning?t.borderStrong:t.border}`,
              borderRadius:10,
              background:file&&!scanning?t.accentFaint:t.bgAlt,
              color:file&&!scanning?t.accent:t.textMuted,
              fontSize:14,fontWeight:500,fontFamily:"'Courier New',monospace",
              cursor:file&&!scanning?"pointer":"not-allowed",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              transition:"all 0.2s",
              letterSpacing:"0.08em",
            }}>
            {scanning?(
              <><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> 스캔 중...</>
            ):(
              <>
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke={file?t.accent:t.textMuted} strokeWidth="1.8" strokeLinecap="round">
                  <path d="M3 7V4a1 1 0 0 1 1-1h3M13 3h3a1 1 0 0 1 1 1v3M17 13v3a1 1 0 0 1-1 1h-3M7 17H4a1 1 0 0 1-1-1v-3"/>
                  <rect x="7" y="7" width="6" height="6" rx="1"/>
                </svg>
                스캔 시작
              </>
            )}
          </button>
        </div>

        {/* ── 우측: 결과 미리보기 (대기 상태) ── */}
        <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:12,padding:"16px 18px",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:500,color:t.text}}>인식 결과 미리보기</div>
            {scanning&&<span style={{fontSize:10,padding:"2px 9px",background:t.accentFaint,border:`1px solid ${t.borderStrong}`,color:t.accent,borderRadius:20}}>● 분석 중</span>}
          </div>

          {/* 워터마크 메시지 */}
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:320,position:"relative"}}>

            {/* 격자 배경 */}
            <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(${t.gridLine||"rgba(0,200,255,0.04)"} 1px, transparent 1px), linear-gradient(90deg, ${t.gridLine||"rgba(0,200,255,0.04)"} 1px, transparent 1px)`,backgroundSize:"24px 24px",borderRadius:8,opacity:0.6}}/>

            {/* 워터마크 아이콘 + 문구 */}
            <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
              <div style={{width:64,height:64,borderRadius:16,background:t.accentFainter,border:`1px dashed ${t.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="4" width="10" height="10" rx="2" stroke={t.textMuted} strokeWidth="1.2" strokeDasharray="3 2"/>
                  <rect x="18" y="4" width="10" height="10" rx="2" stroke={t.textMuted} strokeWidth="1.2" strokeDasharray="3 2"/>
                  <rect x="4" y="18" width="10" height="10" rx="2" stroke={t.textMuted} strokeWidth="1.2" strokeDasharray="3 2"/>
                  <rect x="18" y="18" width="10" height="10" rx="2" stroke={t.textMuted} strokeWidth="1.2" strokeDasharray="3 2"/>
                  <line x1="16" y1="9" x2="16" y2="9" stroke={t.accent} strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="16" cy="16" r="3" stroke={t.textMuted} strokeWidth="1" strokeDasharray="2 2"/>
                </svg>
              </div>

              <div style={{textAlign:"center"}}>
                <div style={{fontSize:13,color:t.textMuted,marginBottom:6,letterSpacing:"0.02em"}}>
                  인식된 이미지 내용이 여기에 표시됩니다
                </div>
                <div style={{fontSize:11,color:t.textMuted,opacity:0.6,lineHeight:1.6}}>
                  좌측에서 이미지를 업로드하고<br/>
                  스캔 시작 버튼을 눌러주세요
                </div>
              </div>

              {/* 더미 행 시각화 */}
              <div style={{width:240,display:"flex",flexDirection:"column",gap:6,opacity:0.18}}>
                {[90,70,80,60,75,50].map((w,i)=>(
                  <div key={i} style={{display:"flex",gap:6,alignItems:"center"}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:t.accent}}/>
                    <div style={{height:8,borderRadius:4,background:t.accent,flex:1,maxWidth:`${w}%`}}/>
                    <div style={{height:8,borderRadius:4,background:t.accent,width:36}}/>
                  </div>
                ))}
              </div>
            </div>

            {/* 스캔 중 오버레이 */}
            {scanning&&(
              <div style={{position:"absolute",inset:0,background:`${t.bgCard}cc`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,borderRadius:8,zIndex:2}}>
                <div style={{width:48,height:48,borderRadius:12,background:t.accentFaint,border:`1px solid ${t.borderStrong}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                </div>
                <div style={{fontSize:12,color:t.accent,fontWeight:500}}>
                  {scanProgress<30?"OCR 엔진 초기화 중...":scanProgress<60?"텍스트 패턴 인식 중...":scanProgress<90?"점수 데이터 추출 중...":"인식 결과 정리 중..."}
                </div>
                <div style={{fontSize:10,color:t.textMuted}}>{Math.min(scanProgress,100)}% 완료</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanLine { 0%{top:0%} 50%{top:95%} 100%{top:0%} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. OCR UPLOAD (full implementation)
// ══════════════════════════════════════════════════════════════════════════════
const OCR_MOCK_ROWS = [
  {id:1,nick:"Zephyr",    job:"딜러",  weekly:523, accum:4820, grade:"S", conf:97, warn:false},
  {id:2,nick:"NightClaw", job:"탱커",  weekly:441, accum:4210, grade:"S", conf:95, warn:false},
  {id:3,nick:"LunaX",     job:"힐러",  weekly:368, accum:3780, grade:"A", conf:93, warn:false},
  {id:4,nick:"Strix",     job:"궁수",  weekly:311, accum:3540, grade:"A", conf:91, warn:false},
  {id:5,nick:"Vortex",    job:"마법사",weekly:272, accum:3120, grade:"A", conf:88, warn:false},
  {id:6,nick:"IceWolf",   job:"전사",  weekly:241, accum:2870, grade:"B", conf:86, warn:false},
  {id:7,nick:"Kr1pt0",    job:"?",     weekly:198, accum:1980, grade:"B", conf:67, warn:true},
  {id:8,nick:"SunBlade",  job:"딜러",  weekly:183, accum:2100, grade:"B", conf:84, warn:false},
  {id:9,nick:"0rion",     job:"마법사",weekly:148, accum:1430, grade:"C", conf:72, warn:true},
  {id:10,nick:"Tera",     job:"힐러",  weekly:599, accum:5100, grade:"S", conf:96, warn:false},
];

function OcrRow({t,row,idx,checked,onCheck,onEdit}){
  const [editing,setEditing]=useState(false);
  const [wVal,setWVal]=useState(row.weekly.toString());
  const confColor=c=>c>=90?t.up:c>=80?"#d4a017":t.dn;
  const gradeColor=g=>g==="S"?t.accent:g==="A"?t.up:g==="B"?"#d4a017":t.textMuted;
  return(
    <tr style={{background:row.warn?"rgba(239,159,39,0.04)":checked?"rgba(0,200,255,0.04)":"transparent"}}>
      <td style={{padding:"8px 10px",width:32}}><input type="checkbox" checked={checked} onChange={e=>onCheck(row.id,e.target.checked)} style={{cursor:"pointer"}}/></td>
      <td style={{padding:"8px 6px",color:t.textMuted,fontSize:11}}>{idx+1}</td>
      <td style={{padding:"8px 10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:t.avColors[idx%6][0],color:t.avColors[idx%6][1],display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:600,flexShrink:0}}>{row.nick.slice(0,2).toUpperCase()}</div>
          <span style={{fontSize:12,fontWeight:500,color:t.text}}>{row.nick}</span>
        </div>
      </td>
      <td style={{padding:"8px 6px",fontSize:11,color:t.textSub}}>{row.job}</td>
      <td style={{padding:"8px 6px"}}>
        {editing
          ? <input autoFocus value={wVal} onChange={e=>setWVal(e.target.value)}
              style={{width:64,padding:"3px 6px",borderRadius:5,border:`1px solid ${t.borderStrong}`,background:t.inputBg,color:t.text,fontSize:12,fontFamily:"'Courier New',monospace",outline:"none"}}
              onKeyDown={e=>{if(e.key==="Enter"){onEdit(row.id,wVal);setEditing(false);}if(e.key==="Escape")setEditing(false);}}/>
          : <span style={{fontSize:13,fontWeight:500,color:t.text,cursor:"pointer"}} onDoubleClick={()=>setEditing(true)}>{row.weekly}{row.warn&&<span style={{fontSize:9,color:"#d4a017",marginLeft:4}}>확인필요</span>}</span>
        }
      </td>
      <td style={{padding:"8px 6px",fontSize:12,color:t.textSub}}>{row.accum.toLocaleString()}</td>
      <td style={{padding:"8px 6px"}}>
        <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:`${gradeColor(row.grade)}18`,color:gradeColor(row.grade),fontWeight:500,border:`1px solid ${gradeColor(row.grade)}44`}}>{row.grade}</span>
      </td>
      <td style={{padding:"8px 10px",minWidth:120}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{flex:1,height:4,background:t.pBg,borderRadius:2}}>
            <div style={{height:4,width:`${row.conf}%`,background:confColor(row.conf),borderRadius:2}}/>
          </div>
          <span style={{fontSize:11,fontWeight:500,color:confColor(row.conf),minWidth:28}}>{row.conf}%</span>
        </div>
      </td>
      <td style={{padding:"8px 6px"}}>
        {row.warn
          ? <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(239,159,39,0.12)",color:"#d4a017",border:"1px solid rgba(239,159,39,0.3)"}}>검토 필요</span>
          : <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:t.upBg,color:t.up,border:`1px solid ${t.up}44`}}>정상</span>
        }
      </td>
    </tr>
  );
}

function OcrUpload({t,guilds,contents,setScoresData,membersData}){
  const [rows,setRows]=useState(OCR_MOCK_ROWS);
  const [checked,setChecked]=useState({});
  const [saveContent,setSaveContent]=useState(contents[0]||"총력전");
  const [saveGuildId,setSaveGuildId]=useState(guilds[0]?.id);
  const [saved,setSaved]=useState(false);
  const [filterWarn,setFilterWarn]=useState(false);
  const warnCount=rows.filter(r=>r.warn).length;
  const checkedIds=Object.keys(checked).filter(k=>checked[k]).map(Number);
  const allChecked=rows.length>0&&checkedIds.length===rows.length;
  const displayRows=filterWarn?rows.filter(r=>r.warn):rows;
  const avgConf=Math.round(rows.reduce((s,r)=>s+r.conf,0)/rows.length);

  const toggleAll=()=>{
    if(allChecked) setChecked({});
    else setChecked(Object.fromEntries(rows.map(r=>[r.id,true])));
  };
  const toggleOne=(id,v)=>setChecked(p=>({...p,[id]:v}));
  const editRow=(id,val)=>{
    const num=parseInt(val,10);if(isNaN(num))return;
    setRows(p=>p.map(r=>r.id===id?{...r,weekly:num}:r));
  };

  const handleSave=()=>{
    const toSave=rows.filter(r=>checkedIds.includes(r.id));
    if(!toSave.length){alert("저장할 항목을 선택해주세요.");return;}
    // scoresData에 반영
    const newEntries=toSave.map(r=>({memberId:r.id,nick:r.nick,score:r.weekly,prev:0,date:new Date().toLocaleDateString("ko-KR")}));
    setScoresData(p=>({...p,[saveGuildId]:{...(p[saveGuildId]||{}),[saveContent]:newEntries}}));
    setSaved(true);
    setTimeout(()=>setSaved(false),2500);
  };

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* TOP BAR */}
      <div style={{padding:"12px 20px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:t.navBg,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:13,fontWeight:500,color:t.text}}>OCR 인식 결과</div>
          <div style={{fontSize:10,color:t.textMuted}}>guild_score_0428.png · 2025.04.28 14:32</div>
        </div>
        <div style={{flex:1}}/>
        <button onClick={()=>setFilterWarn(v=>!v)} style={{fontSize:11,padding:"5px 12px",border:`1px solid ${filterWarn?t.borderStrong:t.border}`,borderRadius:7,background:filterWarn?t.accentFaint:"transparent",color:filterWarn?t.accent:t.textSub,cursor:"pointer",fontFamily:"'Courier New',monospace"}}>
          오류만 보기 {warnCount>0&&`(${warnCount})`}
        </button>
        <button style={{fontSize:11,padding:"5px 12px",border:`1px solid ${t.border}`,borderRadius:7,background:"transparent",color:t.textSub,cursor:"pointer",fontFamily:"'Courier New',monospace"}}>다시 업로드</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
        {/* WARNING BANNER */}
        {warnCount>0&&(
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(239,159,39,0.08)",border:"1px solid rgba(239,159,39,0.3)",borderRadius:9,marginBottom:14}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:"#d4a017",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700,flexShrink:0}}>!</div>
            <div style={{fontSize:12,color:"#8a5200"}}>신뢰도 80% 미만 항목 <strong>{warnCount}개</strong>가 있습니다. 저장 전 수동으로 확인해 주세요.</div>
            <button onClick={()=>setFilterWarn(true)} style={{marginLeft:"auto",fontSize:11,color:"#8a5200",background:"none",border:"none",cursor:"pointer",fontWeight:500}}>항목 보기 →</button>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          {/* IMAGE PREVIEW */}
          <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:11,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:500,color:t.text}}>업로드 이미지</div>
              <span style={{fontSize:10,padding:"2px 8px",background:t.accentFaint,border:`1px solid ${t.border}`,color:t.accent,borderRadius:20}}>PNG · 1.2MB</span>
            </div>
            <div style={{position:"relative",background:t.bgAlt,border:`1px solid ${t.border}`,borderRadius:8,aspectRatio:"4/3",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
              <div style={{position:"absolute",top:8,right:8,fontSize:10,padding:"3px 9px",background:t.accent,color:t.bg,borderRadius:20,fontWeight:500,zIndex:2}}>● OCR 완료</div>
              {/* Simulated scan grid */}
              <div style={{width:"85%",border:`1px solid ${t.border}`,borderRadius:4,background:t.bgCard,overflow:"hidden"}}>
                {[...Array(8)].map((_,i)=>(
                  <div key={i} style={{height:10,borderBottom:`0.5px solid ${t.border}`,display:"flex",alignItems:"center",padding:"0 6px",gap:8}}>
                    <div style={{height:4,borderRadius:2,background:i===0?t.accent:`${t.accent}44`,width:i===0?"40%":"55px"}}/>
                    <div style={{height:4,borderRadius:2,background:i===3||i===6?"rgba(255,91,91,0.5)":t.accentFaint,width:"30px"}}/>
                    <div style={{height:4,borderRadius:2,background:t.accentFaint,width:"35px"}}/>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10,padding:"8px 12px",background:t.bgAlt,borderRadius:7}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:t.up,display:"inline-block"}}/>
                <span style={{fontSize:11,color:t.textSub}}>인식 완료 · Google Vision API</span>
              </div>
              <span style={{fontSize:11,fontWeight:500,color:t.up}}>평균 신뢰도 {avgConf}%</span>
            </div>
          </div>

          {/* SUMMARY */}
          <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:11,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:500,color:t.text}}>인식 요약</div>
              <span style={{fontSize:10,padding:"2px 8px",background:t.upBg,color:t.up,border:`1px solid ${t.up}44`,borderRadius:20}}>정상 처리</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
              {[["인식된 항목",rows.length+"명"],["높은 신뢰도",(rows.length-warnCount)+"  90%+"],["확인 필요",warnCount+"  80%미만"]].map(([l,v],i)=>(
                <div key={l} style={{background:t.bgAlt,borderRadius:7,padding:"9px 10px"}}>
                  <div style={{fontSize:9,color:t.textMuted,marginBottom:3}}>{l}</div>
                  <div style={{fontSize:16,fontWeight:500,color:i===2&&warnCount>0?"#d4a017":t.text}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
              {[["총 인식 점수",rows.reduce((s,r)=>s+r.weekly,0).toLocaleString()],["전주 대비","+15%"],["처리 시간","1.8s"]].map(([l,v])=>(
                <div key={l} style={{background:t.bgAlt,borderRadius:7,padding:"9px 10px"}}>
                  <div style={{fontSize:9,color:t.textMuted,marginBottom:3}}>{l}</div>
                  <div style={{fontSize:16,fontWeight:500,color:t.text}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:t.textMuted,marginBottom:6}}>인식 필드 감지</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {[["닉네임","green"],["주간 점수","green"],["누적 점수","green"],["등급","green"],["직업 (부분)","amber"],["서버명 (무시)","gray"]].map(([l,c])=>(
                  <span key={l} style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:c==="green"?t.upBg:c==="amber"?"rgba(239,159,39,0.1)":t.bgAlt,color:c==="green"?t.up:c==="amber"?"#d4a017":t.textMuted,border:`1px solid ${c==="green"?t.up+"44":c==="amber"?"rgba(239,159,39,0.3)":t.border}`}}>{l}</span>
                ))}
              </div>
            </div>
            <div style={{paddingTop:10,borderTop:`0.5px solid ${t.border}`}}>
              <div style={{fontSize:10,color:t.textMuted,marginBottom:4}}>OCR 엔진</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,fontWeight:500,color:t.text}}>Google Vision API</span>
                <span style={{fontSize:10,padding:"2px 7px",background:t.accentFaint,color:t.accent,borderRadius:20}}>v1.0</span>
                <span style={{fontSize:10,color:t.textMuted,marginLeft:"auto",cursor:"pointer"}}>CLOVA로 전환 →</span>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:11,overflow:"hidden",marginBottom:14}}>
          <div style={{padding:"11px 14px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:12,fontWeight:500,color:t.text}}>인식 데이터 검토 및 수정</div>
              <div style={{fontSize:10,color:t.textMuted,marginTop:2}}>더블클릭으로 점수 수정 가능 · 저장 전 최종 확인</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:t.textMuted}}>{rows.length}개 항목</span>
              <button onClick={toggleAll} style={{fontSize:11,padding:"4px 10px",border:`1px solid ${t.border}`,borderRadius:6,background:"transparent",color:t.textSub,cursor:"pointer",fontFamily:"'Courier New',monospace"}}>
                {allChecked?"전체 해제":"전체 선택"}
              </button>
            </div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:t.bgAlt}}>
                  <th style={{padding:"7px 10px",textAlign:"left"}}><input type="checkbox" checked={allChecked} onChange={toggleAll} style={{cursor:"pointer"}}/></th>
                  {["#","닉네임","직업","주간 점수","누적 점수","등급","신뢰도","상태"].map(h=>(
                    <th key={h} style={{padding:"7px 8px",textAlign:"left",fontSize:10,color:t.textMuted,fontWeight:500,letterSpacing:"0.06em",borderBottom:`0.5px solid ${t.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row,i)=>(
                  <OcrRow key={row.id} t={t} row={row} idx={i} checked={!!checked[row.id]} onCheck={toggleOne} onEdit={editRow}/>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ACTION BAR */}
        <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:11,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{fontSize:11,color:t.textMuted}}>{checkedIds.length}개 선택됨</div>
          <div style={{flex:1}}/>
          {/* 저장 경로 선택 — 길드 */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10,color:t.textMuted,flexShrink:0}}>저장 길드:</span>
            <select value={saveGuildId} onChange={e=>setSaveGuildId(+e.target.value)}
              style={{...selectStyle(t),padding:"5px 9px",fontSize:11,minWidth:120}}>
              {guilds.map(g=><option key={g.id} value={g.id} style={optionStyle(t)}>{g.name}</option>)}
            </select>
          </div>
          {/* 저장 경로 선택 — 컨텐츠 ← 핵심 추가 */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10,color:t.textMuted,flexShrink:0}}>저장 컨텐츠:</span>
            <select value={saveContent} onChange={e=>setSaveContent(e.target.value)}
              style={{...selectStyle(t),padding:"5px 9px",fontSize:11,minWidth:100}}>
              {contents.map(c=><option key={c} value={c} style={optionStyle(t)}>{c}</option>)}
            </select>
          </div>
          <button onClick={()=>{}} style={{fontSize:11,padding:"6px 13px",border:`1px solid ${t.border}`,borderRadius:7,background:"transparent",color:t.textSub,cursor:"pointer",fontFamily:"'Courier New',monospace"}}>선택 항목 분석 ↗</button>
          <button onClick={()=>{}} style={{fontSize:11,padding:"6px 13px",border:`1px solid ${t.border}`,borderRadius:7,background:"transparent",color:t.textSub,cursor:"pointer",fontFamily:"'Courier New',monospace"}}>기여도 반영 ↗</button>
          <button onClick={handleSave}
            style={{fontSize:12,padding:"6px 16px",border:`1px solid ${saved?"rgba(76,255,145,0.5)":t.borderStrong}`,borderRadius:7,background:saved?t.upBg:t.accentFaint,color:saved?t.up:t.accent,cursor:"pointer",fontFamily:"'Courier New',monospace",fontWeight:500,transition:"all 0.3s"}}>
            {saved?`✓ ${saveContent}에 저장됨`:`선택 항목 → ${saveContent} 저장`}
          </button>
        </div>
      </div>
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// 리포트의 컨텐츠별 분석 섹션 데이터 (실제 서비스에서는 API 연동)
const GPT_CONTENT_ANALYSIS = {
  "총력전":  { mvp:"Zephyr (523점)", trend:"▲ +33점", note:"상위 3인이 전체의 52% 기여. 하위 참여자 독려 필요." },
  "결투장":  { mvp:"Zephyr (481점)", trend:"▲ +21점", note:"NightClaw와 격차 좁혀짐. 결투장 특화 파티 구성 권장." },
  "공성전":  { mvp:"NightClaw",       trend:"▲ +15점", note:"탱커 중심 참여 우수. 딜러진 참여율 70% → 개선 필요." },
  "길드전":  { mvp:"LunaX",           trend:"▲ +18점", note:"힐러 기여도 1위. 길드전 전략 유지 권장." },
  "강림":    { mvp:"Strix",           trend:"▼ -5점",  note:"강림 참여율 65%로 하락. 일정 공지 강화 필요." },
  "개인 컨텐츠":{ mvp:"Vortex",       trend:"▲ +8점",  note:"개인 컨텐츠 참여 증가 추세. 유지 권장." },
};

function GPTReport({t}){
  const [selected,setSelected]=useState(GPT_REPORTS[0]);
  const [generating,setGenerating]=useState(false);
  const [progress,setProgress]=useState(0);
  const [rptContent,setRptContent]=useState("전체");   // ← 추가: 리포트 기준 컨텐츠 선택
  const [pdfBusy,setPdfBusy]=useState(false);
  const reportPdfRef=useRef(null);

  const contentOptions=["전체",...Object.keys(GPT_CONTENT_ANALYSIS)];
  const analysis=rptContent!=="전체"?GPT_CONTENT_ANALYSIS[rptContent]:null;

  const generate=()=>{
    setGenerating(true);setProgress(0);
    const interval=setInterval(()=>setProgress(p=>{if(p>=100){clearInterval(interval);setGenerating(false);return 100;}return p+4;}),80);
  };

  const handlePdfExport=async()=>{
    if(!reportPdfRef.current||!selected||pdfBusy)return;
    setPdfBusy(true);
    try{
      reportPdfRef.current.scrollIntoView({block:"start",behavior:"instant"});
      await new Promise((r)=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const safeName=(selected.title||"report").replace(/[\\/:*?"<>|]/g,"").trim()||"report";
      await exportElementToPdf(reportPdfRef.current,`${safeName}.pdf`,{backgroundColor:t.bg});
    }catch(err){
      alert(err?.message||"PDF 저장에 실패했습니다.");
    }finally{
      setPdfBusy(false);
    }
  };

  return(
    <div style={{display:"flex",flex:1,overflow:"hidden"}}>
      {/* LIST */}
      <div style={{width:270,flexShrink:0,borderRight:`1px solid ${t.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"14px 14px 10px",borderBottom:`1px solid ${t.border}`}}>
          <div style={{fontSize:13,fontWeight:500,color:t.text,marginBottom:10}}>GPT 리포트</div>

          {/* 컨텐츠 기준 선택 */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:t.textMuted,marginBottom:5,letterSpacing:"0.08em"}}>분석 기준 컨텐츠</div>
            <select value={rptContent} onChange={e=>setRptContent(e.target.value)}
              style={{...selectStyle(t),width:"100%",fontSize:11}}>
              {contentOptions.map(c=><option key={c} value={c} style={optionStyle(t)}>{c==="전체"?"전체 통합":"▶ "+c}</option>)}
            </select>
            {rptContent!=="전체"&&(
              <div style={{marginTop:6,padding:"6px 10px",background:t.accentFaint,border:`1px solid ${t.borderStrong}`,borderRadius:7,fontSize:10,color:t.accentDim}}>
                ⚡ <strong style={{color:t.accent}}>{rptContent}</strong> 기준 분석 리포트가 생성됩니다
              </div>
            )}
          </div>

          <button onClick={generate} disabled={generating}
            style={{width:"100%",padding:"8px",border:`1px solid ${t.borderStrong}`,borderRadius:8,background:t.accentFaint,color:t.accent,cursor:generating?"wait":"pointer",fontFamily:"'Courier New',monospace",fontSize:12,fontWeight:500,transition:"all 0.2s"}}>
            {generating?`⟳ 생성 중... ${progress}%`:`✦ GPT 리포트 생성 ${rptContent!=="전체"?"("+rptContent+")":""}`}
          </button>
          {generating&&(
            <div style={{marginTop:8,height:3,background:t.pBg,borderRadius:2}}>
              <div style={{height:3,width:`${progress}%`,background:t.pBar,borderRadius:2,transition:"width 0.1s"}}/>
            </div>
          )}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"10px 10px"}}>
          {GPT_REPORTS.map(r=>(
            <div key={r.id} onClick={()=>setSelected(r)}
              style={{padding:"11px 12px",borderRadius:9,background:selected?.id===r.id?t.sideActive:t.bgCard,border:`1px solid ${selected?.id===r.id?t.borderStrong:t.border}`,cursor:"pointer",marginBottom:8,transition:"all 0.15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:500,color:selected?.id===r.id?t.accent:t.text,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</span>
                {r.badge&&<Tag bg={t.accentFaint} color={t.accent}>{r.badge}</Tag>}
              </div>
              <div style={{fontSize:10,color:t.textMuted,marginBottom:4}}>{r.date} · {r.guild}</div>
              <div style={{fontSize:10,color:t.textSub,lineHeight:1.4}}>{r.summary.slice(0,55)}...</div>
            </div>
          ))}
        </div>
      </div>

      {/* DETAIL */}
      <div style={{flex:1,overflowY:"auto",padding:"22px 26px"}}>
        {selected&&(
          <>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:12}}>
              <button type="button" onClick={handlePdfExport} disabled={pdfBusy}
                style={{fontSize:11,padding:"6px 13px",border:`1px solid ${t.borderStrong}`,borderRadius:7,background:pdfBusy?t.bgAlt:t.accentFaint,color:pdfBusy?t.textMuted:t.accent,cursor:pdfBusy?"wait":"pointer",fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"}}>
                {pdfBusy?"⟳ PDF 생성 중...":"PDF 출력"}
              </button>
              <button type="button" style={{fontSize:11,padding:"6px 13px",border:`1px solid ${t.border}`,borderRadius:7,background:"transparent",color:t.textSub,cursor:"pointer",fontFamily:"'Courier New',monospace"}}>공유</button>
            </div>

            <div ref={reportPdfRef} data-gi-report-pdf style={{display:"block",width:"100%",boxSizing:"border-box",background:t.bg,padding:"16px 18px",borderRadius:11,border:`1px solid ${t.rptBorder}`}}>
                <div style={{fontSize:17,fontWeight:500,color:t.text,marginBottom:4}}>{selected.title}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:12}}>
                  <span style={{fontSize:11,color:t.textMuted}}>{selected.date} · {selected.guild} · AI 자동 생성</span>
                  <span style={{fontSize:10,padding:"2px 9px",background:rptContent==="전체"?t.bgAlt:t.accentFaint,border:`1px solid ${rptContent==="전체"?t.border:t.borderStrong}`,color:rptContent==="전체"?t.textMuted:t.accent,borderRadius:20,fontWeight:500}}>
                    {rptContent==="전체"?"📊 전체 통합 기준":"⚡ "+rptContent+" 기준"}
                  </span>
                </div>
            {/* 컨텐츠별 상세 분석 박스 (전체가 아닌 경우) */}
            {analysis&&(
              <div style={{background:t.accentFaint,border:`1px solid ${t.borderStrong}`,borderRadius:11,padding:"14px 18px",marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:500,color:t.accent,marginBottom:10}}>
                  ⚡ {rptContent} 컨텐츠 분석
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:10}}>
                  <div style={{background:t.bgCard,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{fontSize:9,color:t.textMuted,marginBottom:4,letterSpacing:"0.08em"}}>MVP</div>
                    <div style={{fontSize:13,fontWeight:500,color:t.text}}>{analysis.mvp}</div>
                  </div>
                  <div style={{background:t.bgCard,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{fontSize:9,color:t.textMuted,marginBottom:4,letterSpacing:"0.08em"}}>전주 대비</div>
                    <div style={{fontSize:13,fontWeight:500,color:analysis.trend.startsWith("▲")?t.up:t.dn}}>{analysis.trend}</div>
                  </div>
                  <div style={{background:t.bgCard,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{fontSize:9,color:t.textMuted,marginBottom:4,letterSpacing:"0.08em"}}>컨텐츠 기준</div>
                    <div style={{fontSize:13,fontWeight:500,color:t.accent}}>{rptContent}</div>
                  </div>
                </div>
                <div style={{fontSize:11,color:t.rptText,lineHeight:1.6,padding:"8px 12px",background:t.bgCard,borderRadius:7}}>
                  💡 {analysis.note}
                </div>
              </div>
            )}

            <div style={{background:t.rptBg,border:`1px solid ${t.rptBorder}`,borderRadius:11,padding:"14px 18px",marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:500,color:t.accent,marginBottom:8}}>요약</div>
              <div style={{fontSize:12,color:t.rptText,lineHeight:1.7}}>{selected.summary}</div>
              <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                {selected.chips.map(c=><span key={c} style={{fontSize:10,padding:"3px 10px",background:t.accentFaint,border:`1px solid ${t.border}`,color:t.accentDim,borderRadius:20}}>{c}</span>)}
              </div>
            </div>

            {selected.sections.map((sec,i)=>(
              <div key={i} style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:11,padding:"14px 18px",marginBottom:i<selected.sections.length-1?10:0}}>
                <div style={{fontSize:13,fontWeight:500,color:t.text,marginBottom:8}}>{sec.title}</div>
                <div style={{fontSize:12,color:t.textSub,lineHeight:1.7}}>{sec.content}</div>
              </div>
            ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
export function GuildInsightDemoApp({ initialPage = "dashboard" }) {
  const router = useRouter();
  const [dark,setDark]=useState(true);
  const t=dark?THEMES.dark:THEMES.light;
  const [page,setPage]=useState(initialPage);
  const [guilds,setGuilds]=useState(GUILDS_INIT);
  const [membersData,setMembersData]=useState(MEMBERS_INIT);
  const [scoresData,setScoresData]=useState(SCORES_INIT);
  const [contribsData,setContribsData]=useState(CONTRIBS_INIT);
  const [activeGuild,setActiveGuild]=useState(GUILDS_INIT[0]);
  const [logoutModal,setLogoutModal]=useState(false);
  // 앱 전역 컨텐츠 목록 — ScoreManagement와 OcrUpload가 공유
  const [contents,setContents]=useState(CONTENTS_INIT);

  const PAGE_TITLES={
    dashboard:["대시보드 개요",activeGuild.name+" · "+activeGuild.game],
    guild:["길드 관리","관리 중인 길드 목록"],
    members:["길드원 관리","길드원 등록 / 수정 / 삭제"],
    scores:["점수 관리","컨텐츠별 점수 입력 및 조회"],
    contribution:["기여도 분석","누적 기여도 현황"],
    simulation:["랭킹 시뮬레이션","같은 게임 내 길드 점수 비교"],
    gptreport:["GPT 리포트","AI 자동 생성 주간 운영 리포트"],
    ocr_upload:["OCR 업로드","이미지 업로드 → 스캔 시작"],
    ocr:["OCR 인식 결과","인식된 점수 검토 및 컨텐츠 저장"],
  };
  const [ptitle,psub]=PAGE_TITLES[page]||["대시보드",""];

  const handleSelectGuild=(g)=>{setActiveGuild(g);setPage("dashboard");};

  const handleLogout=()=>setLogoutModal(true);
  const confirmLogout=()=>{
    setLogoutModal(false);
    router.push("/");
  };

  // 스캔 완료 → 결과 화면(ocr)으로 전환
  const handleScanComplete=()=>setPage("ocr");

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0,background:t.bg,color:t.text,fontFamily:"'Courier New',monospace",transition:TR,overflow:"hidden"}}>
      <Topbar t={t} dark={dark} setDark={setDark} title={ptitle} sub={psub} onLogout={handleLogout} onNav={setPage}/>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <Sidebar t={t} active={page} onNav={setPage} guildName={activeGuild.name}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:t.bg}}>
          {page==="dashboard"    && <Dashboard t={t} guild={activeGuild}/>}
          {page==="guild"        && <GuildManagement t={t} guilds={guilds} setGuilds={setGuilds} onSelectGuild={handleSelectGuild} contribsData={contribsData}/>}
          {page==="members"      && <MemberManagement t={t} guilds={guilds} membersData={membersData} setMembersData={setMembersData} contribsData={contribsData}/>}
          {page==="scores"       && <ScoreManagement t={t} guilds={guilds} membersData={membersData} scoresData={scoresData} setScoresData={setScoresData} contents={contents} setContents={setContents}/>}
          {page==="contribution" && <ContribAnalysis t={t} guilds={guilds} contribsData={contribsData} setContribsData={setContribsData}/>}
          {page==="simulation"   && <RankingSimulation t={t} guilds={guilds} activeGuild={activeGuild}/>}
          {page==="gptreport"    && <GPTReport t={t}/>}
          {/* OCR 업로드 (이미지 선택 + 스캔 시작) */}
          {page==="ocr_upload"   && <OcrImageUpload t={t} onScanComplete={handleScanComplete}/>}
          {/* OCR 결과 (인식 데이터 검토 + 저장) */}
          {page==="ocr"          && <OcrUpload t={t} guilds={guilds} contents={contents} setScoresData={setScoresData} membersData={membersData}/>}
        </div>
      </div>

      <Modal open={logoutModal} onClose={()=>setLogoutModal(false)} t={t} title="데모 종료">
        <div>
          <div style={{fontSize:12,color:t.textSub,lineHeight:1.7,marginBottom:6}}>
            데모 체험을 종료하고 메인 페이지로 돌아갑니다.
          </div>
          <div style={{fontSize:11,color:t.textMuted,marginBottom:18}}>정식 가입 후 실제 길드 데이터를 연동할 수 있습니다.</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setLogoutModal(false)} style={btnGhost(t)}>취소</button>
            <button onClick={confirmLogout} style={{...btnDanger(),fontWeight:500}}>로그아웃</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
