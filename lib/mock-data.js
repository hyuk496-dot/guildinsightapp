export const GUILDS_INIT = [
  {id:1,name:"ShadowFang",game:"로스트아크",members:48,rank:7,prevRank:9,score:2841,weeklyContrib:2841,created:"2024.01.15"},
  {id:2,name:"IronValor",game:"블레이드&소울",members:32,rank:2,prevRank:2,score:3988,weeklyContrib:3988,created:"2024.03.08"},
  {id:3,name:"PhoenixRise",game:"메이플스토리",members:61,rank:4,prevRank:3,score:3540,weeklyContrib:3540,created:"2023.11.20"},
];

export const MEMBERS_INIT = {
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

export const CONTENTS_INIT = ["총력전","결투장","공성전","길드전","강림","개인 컨텐츠"];

export const SCORES_INIT = {
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

export const CONTRIBS_INIT = {
  1:[
    {id:1,nick:"Zephyr",score:2841,pct:18.8,history:[{date:"2025.04.28",delta:"+33",note:"총력전 갱신"},{date:"2025.04.21",delta:"+41",note:"보상 참여"}]},
    {id:2,nick:"NightClaw",score:2210,pct:14.6,history:[{date:"2025.04.28",delta:"+21",note:"공성 기여"}]},
    {id:3,nick:"LunaX",score:1980,pct:13.1,history:[{date:"2025.04.27",delta:"+18",note:"힐 기여 조정"}]},
    {id:4,nick:"Strix",score:1540,pct:10.2,history:[]},
    {id:5,nick:"Vortex",score:1320,pct:8.7,history:[{date:"2025.04.20",delta:"-10",note:"오입력 수정"}]},
    {id:6,nick:"IceWolf",score:1100,pct:7.3,history:[]},
  ],
};

export const RADAR_LABELS = ["총력전","결투장","공성전","길드전","강림","개인"];
export const SIM_CONTENTS = ["총력전","결투장","공성전","길드전","강림"];

// 게임별 서버 랭킹 데이터 (컨텐츠별 점수 포함)
export const SERVER_RANKS_BY_GAME = {
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
export const SERVER_RANKS = SERVER_RANKS_BY_GAME["로스트아크"].map(r=>({name:r.name,score:r.scores["총력전"],ours:r.ours}));
export const GPT_REPORTS = [
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
export const OCR_MOCK_ROWS = [
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