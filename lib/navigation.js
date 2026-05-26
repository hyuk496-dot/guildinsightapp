/** 페이지 라우팅 — GUILD_INSIGHT_PROJECT.md §3 라우팅 키 기준 */

export const ROUTES = {
  dashboard: "/dashboard",
  guild: "/guild",
  members: "/members",
  scores: "/scores",
  contribution: "/contribution",
  simulation: "/simulation",
  gptreport: "/gptreport",
  /** OcrUpload — 사이드바 "OCR 업로드", 스캔 완료 후 이동 */
  ocr: "/ocr",
  /** OcrImageUpload — Topbar "OCR" 버튼 전용 */
  ocrUpload: "/ocr/upload",
};

/** 사이드바 NAV id → URL */
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
  dashboard: (g) => [
    "대시보드 개요",
    `${g?.name || "로딩 중..."} · ${g?.game_name || g?.game || ""}`,
  ],
  guild: () => ["길드 관리", "관리 중인 길드 목록"],
  members: () => ["길드원 관리", "길드원 등록 / 수정 / 삭제"],
  scores: () => ["점수 관리", "컨텐츠별 점수 입력 및 조회"],
  contribution: () => ["기여도 분석", "누적 기여도 현황"],
  simulation: () => ["랭킹 시뮬레이션", "같은 게임 내 길드 점수 비교"],
  gptreport: () => ["GPT 리포트", "AI 자동 생성 주간 운영 리포트"],
  ocr_upload: () => ["OCR 업로드", "이미지 업로드 → 스캔 시작"],
  ocr: () => ["OCR 인식 결과", "인식된 점수 검토 및 컨텐츠 저장"],
};

export function pathnameToPageKey(pathname) {
  if (pathname === ROUTES.ocrUpload) return "ocr_upload";
  if (pathname === ROUTES.ocr) return "ocr";
  if (pathname === ROUTES.dashboard) return "dashboard";
  if (pathname === ROUTES.guild) return "guild";
  if (pathname === ROUTES.members) return "members";
  if (pathname === ROUTES.scores) return "scores";
  if (pathname === ROUTES.contribution) return "contribution";
  if (pathname === ROUTES.simulation) return "simulation";
  if (pathname === ROUTES.gptreport) return "gptreport";
  return "dashboard";
}
