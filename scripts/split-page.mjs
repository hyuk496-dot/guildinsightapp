import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const src = fs.readFileSync(path.join(root, "app/page.jsx"), "utf8");
const lines = src.split("\n");

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

ensureDir(path.join(root, "lib"));

// lib/theme.js
fs.writeFileSync(
  path.join(root, "lib/theme.js"),
  slice(5, 42).replace(/^const THEMES/, "export const THEMES") +
    '\nexport const TR = "background 0.3s, color 0.3s, border-color 0.3s";\n'
);

// lib/mock-data.js
let mock = slice(45, 152);
mock = mock.replace(/^const /gm, "export const ");
fs.writeFileSync(path.join(root, "lib/mock-data.js"), mock);

// lib/constants.js
const constants =
  slice(154, 164).replace(/^const NAV_ITEMS/, "export const NAV_ITEMS") +
  "\n" +
  slice(100, 101).replace(/^const /gm, "export const ") +
  '\nexport const SIM_CONTENTS = ["총력전","결투장","공성전","길드전","강림"];\n';
fs.writeFileSync(path.join(root, "lib/constants.js"), constants);

// lib/navigation.js
fs.writeFileSync(
  path.join(root, "lib/navigation.js"),
  `export const ROUTES = {
  dashboard: "/dashboard",
  guild: "/guild",
  members: "/members",
  scores: "/scores",
  contribution: "/contribution",
  simulation: "/simulation",
  gptreport: "/gptreport",
  ocr: "/ocr",
  ocrResults: "/ocr/results",
};

export const NAV_ROUTE_MAP = {
  dashboard: ROUTES.dashboard,
  guild: ROUTES.guild,
  members: ROUTES.members,
  scores: ROUTES.scores,
  contribution: ROUTES.contribution,
  simulation: ROUTES.simulation,
  gptreport: ROUTES.gptreport,
  ocr: ROUTES.ocr,
};

export const PAGE_TITLES = {
  dashboard: (g) => ["대시보드 개요", g.name + " · " + g.game],
  guild: () => ["길드 관리", "관리 중인 길드 목록"],
  members: () => ["길드원 관리", "길드원 등록 / 수정 / 삭제"],
  scores: () => ["점수 관리", "컨텐츠별 점수 입력 및 조회"],
  contribution: () => ["기여도 분석", "누적 기여도 현황"],
  simulation: () => ["랭킹 시뮬레이션", "같은 게임 내 길드 점수 비교"],
  gptreport: () => ["GPT 리포트", "AI 자동 생성 주간 운영 리포트"],
  ocr: () => ["OCR 업로드", "이미지 업로드 → 스캔 시작"],
  ocrResults: () => ["OCR 인식 결과", "인식된 점수 검토 및 컨텐츠 저장"],
};

export function pathnameToPageKey(pathname) {
  if (pathname === ROUTES.dashboard) return "dashboard";
  if (pathname === ROUTES.guild) return "guild";
  if (pathname === ROUTES.members) return "members";
  if (pathname === ROUTES.scores) return "scores";
  if (pathname === ROUTES.contribution) return "contribution";
  if (pathname === ROUTES.simulation) return "simulation";
  if (pathname === ROUTES.gptreport) return "gptreport";
  if (pathname === ROUTES.ocr) return "ocr";
  if (pathname === ROUTES.ocrResults) return "ocrResults";
  return "dashboard";
}
`
);

// lib/styles.js
fs.writeFileSync(
  path.join(root, "lib/styles.js"),
  "'use client';\n" +
    slice(184, 187)
      .replace(/^const iStyle/, "export const iStyle")
      .replace(/^const btnPrimary/, "export const btnPrimary")
      .replace(/^const btnGhost/, "export const btnGhost")
      .replace(/^const btnDanger/, "export const btnDanger")
);

const sharedHeader = `'use client';
import { useState, useEffect, useRef } from "react";
import { TR } from "@/lib/theme";
import { RADAR_LABELS } from "@/lib/constants";
`;

// Tag, Modal
ensureDir(path.join(root, "components/shared"));
fs.writeFileSync(
  path.join(root, "components/shared/Tag.jsx"),
  sharedHeader +
    slice(167, 167).replace("function Tag", "export function Tag")
);
fs.writeFileSync(
  path.join(root, "components/shared/Modal.jsx"),
  sharedHeader.replace("useRef", "useRef") +
    slice(169, 182).replace("function Modal", "export function Modal")
);
fs.writeFileSync(
  path.join(root, "components/shared/RadarCanvas.jsx"),
  sharedHeader + slice(189, 217).replace("function RadarCanvas", "export function RadarCanvas")
);

// Layout
ensureDir(path.join(root, "components/layout"));
const layoutHeader = `'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TR } from "@/lib/theme";
import { NAV_ITEMS } from "@/lib/constants";
import { NAV_ROUTE_MAP, ROUTES } from "@/lib/navigation";
`;

fs.writeFileSync(
  path.join(root, "components/layout/Sidebar.jsx"),
  layoutHeader +
    slice(220, 259)
      .replace("function Sidebar", "export function Sidebar")
      .replace(
        /<motion[^>]*>|<\/motion>/g,
        ""
      )
      .replace(
        /onClick=\{\(\)=>onNav\(item\.id\)\}/g,
        ""
      )
);

// Fix Sidebar manually - the script replace for onClick won't work well. Let me read and fix Sidebar after.

console.log("Partial split done - continuing component extraction...");

const componentSpecs = [
  { dir: "dashboard", name: "Dashboard", start: 299, end: 432, extraImports: `import { SERVER_RANKS_BY_GAME } from "@/lib/mock-data";\nconst DASH_SCORES_BY_CONTENT = ${JSON.stringify({
    총력전: [1820, 2010, 1950, 2200, 2530, 2841],
    결투장: [1200, 1380, 1250, 1500, 1620, 1740],
    공성전: [980, 1050, 990, 1200, 1350, 1480],
    길드전: [2100, 2250, 2180, 2400, 2550, 2700],
    강림: [650, 710, 680, 800, 870, 950],
    "개인 컨텐츠": [300, 340, 320, 380, 410, 450],
  }, null, 2)};\n` },
];

// Extract main components with generic header
const blocks = [
  { file: "components/guild/GuildManagement.jsx", start: 437, end: 548, imports: `import { Tag } from "@/components/shared/Tag";\nimport { Modal } from "@/components/shared/Modal";\nimport { iStyle, btnPrimary, btnGhost, btnDanger } from "@/lib/styles";\n` },
  { file: "components/members/MemberManagement.jsx", start: 553, end: 714, imports: `import { Tag } from "@/components/shared/Tag";\nimport { Modal } from "@/components/shared/Modal";\nimport { RadarCanvas } from "@/components/shared/RadarCanvas";\nimport { RADAR_LABELS } from "@/lib/constants";\nimport { iStyle, btnPrimary, btnGhost, btnDanger } from "@/lib/styles";\n` },
  { file: "components/scores/ScoreRow.jsx", start: 719, end: 759, imports: `import { iStyle } from "@/lib/styles";\nimport { CONTENTS_INIT } from "@/lib/mock-data";\n` },
  { file: "components/scores/ScoreManagement.jsx", start: 761, end: 965, imports: `import { Modal } from "@/components/shared/Modal";\nimport { ScoreRow } from "./ScoreRow";\nimport { CONTENTS_INIT } from "@/lib/mock-data";\nimport { iStyle, btnPrimary, btnGhost, btnDanger } from "@/lib/styles";\n` },
  { file: "components/contribution/ContribRow.jsx", start: 970, end: 1011, imports: `import { iStyle } from "@/lib/styles";\n` },
  { file: "components/contribution/ContribAnalysis.jsx", start: 1013, end: 1096, imports: `import { Modal } from "@/components/shared/Modal";\nimport { ContribRow } from "./ContribRow";\nimport { iStyle, btnGhost, btnDanger } from "@/lib/styles";\n` },
  { file: "components/simulation/SimBarChart.jsx", start: 1101, end: 1134, imports: `` },
  { file: "components/simulation/RankingSimulation.jsx", start: 1136, end: 1313, imports: `import { Modal } from "@/components/shared/Modal";\nimport { SimBarChart } from "./SimBarChart";\nimport { SERVER_RANKS_BY_GAME } from "@/lib/mock-data";\nimport { SIM_CONTENTS } from "@/lib/constants";\nimport { iStyle, btnPrimary, btnGhost } from "@/lib/styles";\n` },
  { file: "components/ocr/OcrImageUpload.jsx", start: 1319, end: 1583, imports: `` },
  { file: "components/ocr/OcrRow.jsx", start: 1601, end: 1645, imports: `` },
  { file: "components/ocr/OcrUpload.jsx", start: 1647, end: 1838, imports: `import { OcrRow } from "./OcrRow";\nimport { OCR_MOCK_ROWS } from "@/lib/mock-data";\n` },
];

// Dashboard special
ensureDir(path.join(root, "components/dashboard"));
let dashBody = slice(308, 432);
fs.writeFileSync(
  path.join(root, "components/dashboard/Dashboard.jsx"),
  `'use client';
import { useState, useEffect, useRef } from "react";
import { TR } from "@/lib/theme";
import { SERVER_RANKS_BY_GAME } from "@/lib/mock-data";
` +
    slice(299, 306) +
    "\n" +
    dashBody.replace("function Dashboard", "export function Dashboard")
);

for (const b of blocks) {
  const dir = path.dirname(path.join(root, b.file));
  ensureDir(dir);
  let body = slice(b.start, b.end);
  const fnMatch = body.match(/^function (\w+)/);
  if (fnMatch) body = body.replace(`function ${fnMatch[1]}`, `export function ${fnMatch[1]}`);
  const constMatch = body.match(/^const (\w+)/);
  if (constMatch && !fnMatch) body = body.replace(`const ${constMatch[1]}`, `export const ${constMatch[1]}`);

  fs.writeFileSync(
    path.join(root, b.file),
    `'use client';
import { useState, useEffect, useRef } from "react";
import { TR } from "@/lib/theme";
${b.imports}` + body
  );
}

// GPT - includes GPT_CONTENT_ANALYSIS and GPTReport
ensureDir(path.join(root, "components/gpt"));
fs.writeFileSync(
  path.join(root, "components/gpt/GPTReport.jsx"),
  `'use client';
import { useState } from "react";
import { Tag } from "@/components/shared/Tag";
import { GPT_REPORTS } from "@/lib/mock-data";
import { iStyle } from "@/lib/styles";
` +
    slice(1841, 1976)
      .replace(/^const GPT_CONTENT_ANALYSIS/, "const GPT_CONTENT_ANALYSIS")
      .replace("function GPTReport", "export function GPTReport")
);

// OCR mock rows to mock-data - add export
let ocrMock = slice(1588, 1599);
ocrMock = ocrMock.replace(/^const OCR_MOCK_ROWS/, "export const OCR_MOCK_ROWS");
fs.appendFileSync(path.join(root, "lib/mock-data.js"), "\n" + ocrMock);

console.log("Split complete");
