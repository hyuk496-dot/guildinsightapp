import { LandingPage } from "@/components/landing/LandingPage";

export const metadata = {
  title: "Guild Insight — 길드 운영, 데이터로 지배하라",
  description:
    "OCR 자동 점수 추출 · GPT 전략 리포트 · 실시간 랭킹 시뮬레이션. 엑셀과 카카오톡을 버리고 하나의 플랫폼으로.",
};

export default function HomePage() {
  return <LandingPage />;
}
