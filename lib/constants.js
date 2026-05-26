export const NAV_ITEMS = [
  { id: "dashboard", label: "대시보드", icon: "◼", section: "메인" },
  { id: "guild", label: "길드 관리", icon: "◎", section: "메인" },
  { id: "members", label: "길드원 관리", icon: "◈", section: "분석" },
  { id: "scores", label: "점수 관리", icon: "▲", section: "분석" },
  { id: "contribution", label: "기여도 분석", icon: "◆", section: "분석" },
  { id: "simulation", label: "랭킹 시뮬레이션", icon: "▶", section: "전략" },
  { id: "gptreport", label: "GPT 리포트", icon: "✦", section: "AI" },
  { id: "ocr", label: "OCR 업로드", icon: "◑", section: "AI" },
];

export const RADAR_LABELS = ["총력전", "결투장", "공성전", "길드전", "강림", "개인"];

/** 역량 레이더 백분율 환산용 컨텐츠별 만점 */
export const CONTENT_MAX_SCORES = {
  총력전: 8000,
  결투장: 8000,
  공성전: 5000,
  길드전: 5000,
  강림: 3000,
  "개인 컨텐츠": 5000,
};

export const SIM_CONTENTS = ["총력전", "결투장", "공성전", "길드전", "강림"];
