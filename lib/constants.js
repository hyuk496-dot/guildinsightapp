export const NAV_ITEMS = [
  { id: "dashboard", label: "대시보드", icon: "◼", section: "메인" },
  { id: "guild", label: "길드 관리", icon: "◎", section: "메인" },
  { id: "members", label: "길드원 관리", icon: "◈", section: "분석" },
  { id: "scores", label: "점수 관리", icon: "▲", section: "분석" },
  { id: "contribution", label: "기여도 분석", icon: "◆", section: "분석" },
  { id: "rankingGoals", label: "랭킹 목표", icon: "▶", section: "전략" },
  { id: "gptreport", label: "GPT 리포트", icon: "✦", section: "AI" },
  { id: "ocr", label: "OCR 업로드", icon: "◑", section: "AI" },
];

/** 기본(1번) 컨텐츠 — DB content_name·OCR 저장 명칭과 동일 */
export const PRIMARY_CONTENT_NAME = "주간 활약";

/** 구 DB·목업 데이터에 남아 있을 수 있는 이전 명칭 */
export const LEGACY_PRIMARY_CONTENT_NAME = "총력전";

export const RADAR_LABELS = [
  PRIMARY_CONTENT_NAME,
  "결투장",
  "공성전",
  "길드전",
  "강림",
  "개인",
];

/** 역량 레이더 백분율 환산용 컨텐츠별 만점 */
export const CONTENT_MAX_SCORES = {
  [PRIMARY_CONTENT_NAME]: 8000,
  [LEGACY_PRIMARY_CONTENT_NAME]: 8000,
  결투장: 8000,
  공성전: 5000,
  길드전: 5000,
  강림: 3000,
  "개인 컨텐츠": 5000,
};

/** @deprecated 랭킹 목표 화면은 CONTENTS_INIT 사용 */
export const SIM_CONTENTS = [
  PRIMARY_CONTENT_NAME,
  "결투장",
  "공성전",
  "길드전",
  "강림",
];

export {
  contentNameDbFilter,
  matchesContentName,
} from "@/lib/content-utils";

/** 구 랭킹 시뮬레이션 — 사이드바 비노출, /simulation/legacy 로 복구 */
export const NAV_ITEM_SIMULATION_LEGACY = {
  id: "simulation",
  label: "랭킹 시뮬레이션 (구)",
  icon: "▶",
  section: "전략",
};
