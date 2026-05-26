'use client';

import Link from "next/link";
import { useGuildInsight } from "@/context/GuildInsightProvider";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    note: "데모 리포트 무제한",
    perks: ["로컬 데모 리포트", "최근 4주 통계", "수동 점수 입력", "기본 OCR"],
    cta: "현재 플랜",
    disabled: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9",
    period: "/월",
    note: "운영자 1인 · 길드 1개",
    perks: [
      "AI 프리미엄 리포트 50회/월",
      "GPT-4o 기반 맥락 분석",
      "PDF 출력 · Slack/Discord 공유 (예정)",
      "Premium 지원",
    ],
    cta: "✦ Pro 시작하기",
    highlighted: true,
  },
  {
    id: "guild",
    name: "Guild",
    price: "$29",
    period: "/월",
    note: "운영팀 5인 · 길드 3개",
    perks: [
      "AI 프리미엄 리포트 무제한",
      "다중 길드 동시 분석",
      "팀원 권한 관리",
      "우선 신기능 액세스",
    ],
    cta: "Guild 문의하기",
  },
];

export default function BillingPage() {
  const { t } = useGuildInsight();
  const gradient = `linear-gradient(135deg, ${t.accent} 0%, ${t.up} 100%)`;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px", background: t.bg }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 22,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: t.accent, letterSpacing: "0.08em", fontWeight: 500, marginBottom: 6 }}>
              BILLING · 요금제
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: t.text, margin: 0, marginBottom: 6 }}>
              Guild Insight 구독 플랜
            </h1>
            <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>
              결제 시스템(Stripe / Toss Payments)은 통합 작업 중입니다. 현재 페이지는 플랜 미리보기입니다.
            </p>
          </div>
          <Link
            href="/gptreport/compare"
            style={{
              fontSize: 11,
              color: t.textSub,
              textDecoration: "none",
              padding: "8px 14px",
              border: `1px solid ${t.border}`,
              borderRadius: 8,
            }}
          >
            ← 기능 비교 보기
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {PLANS.map((p) => (
            <div
              key={p.id}
              style={{
                position: "relative",
                padding: "24px 24px 22px",
                borderRadius: 16,
                background: t.bgCard,
                border: `1px solid ${p.highlighted ? t.borderStrong : t.border}`,
                overflow: "hidden",
                boxShadow: p.highlighted
                  ? "0 10px 40px rgba(0,200,255,0.12), 0 2px 10px rgba(0,0,0,0.25)"
                  : "0 2px 10px rgba(0,0,0,0.15)",
              }}
            >
              {p.highlighted && (
                <>
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: gradient,
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 14,
                      fontSize: 10,
                      padding: "2px 9px",
                      borderRadius: 20,
                      background: gradient,
                      color: "#04101c",
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                    }}
                  >
                    추천
                  </span>
                </>
              )}
              <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.08em", marginBottom: 6 }}>
                {p.name.toUpperCase()}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: p.highlighted ? t.accent : t.text,
                  }}
                >
                  {p.price}
                </span>
                {p.period && <span style={{ fontSize: 12, color: t.textMuted }}>{p.period}</span>}
              </div>
              <div style={{ fontSize: 11, color: t.textSub, marginBottom: 16 }}>{p.note}</div>

              <ul style={{ margin: 0, padding: 0, listStyle: "none", marginBottom: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                {p.perks.map((perk) => (
                  <li
                    key={perk}
                    style={{
                      fontSize: 12,
                      color: t.textSub,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: t.up, marginTop: 1 }}>✓</span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={p.disabled}
                onClick={() => {
                  alert(
                    `${p.name} 플랜은 결제 통합(Stripe/Toss) 완료 후 활성화됩니다.\n사전 신청을 원하시면 운영자에게 문의 주세요.`
                  );
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: p.highlighted ? "none" : `1px solid ${t.borderStrong}`,
                  borderRadius: 10,
                  background: p.highlighted ? gradient : "transparent",
                  color: p.highlighted ? "#04101c" : t.accent,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: p.disabled ? "default" : "pointer",
                  opacity: p.disabled ? 0.6 : 1,
                  fontFamily: "'Courier New',monospace",
                  letterSpacing: "0.04em",
                }}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 22,
            padding: "14px 18px",
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 11,
            fontSize: 11,
            color: t.textSub,
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: t.text }}>FAQ</strong>
          <br />
          · 결제 통합 전까지는 모든 기능이 데모 모드(로컬 fallback) 또는 본인 OpenAI 키로 동작합니다.
          <br />
          · OpenAI 사용량 한도 초과 시 자동으로 데모 리포트로 fallback 됩니다.
          <br />
          · 학교/스터디용 무료 라이선스가 필요하면 별도 문의 주세요.
        </div>
      </div>
    </div>
  );
}
