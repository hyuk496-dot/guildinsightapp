'use client';
import Link from "next/link";
import { useGuildInsight } from "@/context/GuildInsightProvider";

const FEATURE_ROWS = [
  { label: "월 비용", local: "무료", premium: "구독제 (Free trial 제공)", highlight: true },
  { label: "문장 생성 방식", local: "고정 템플릿 채우기", premium: "GPT-4o 자연어 생성" },
  { label: "유저 맥락 이해", local: "통계 수치 나열", premium: "직업/역할/추세 통합 추론" },
  { label: "MVP/이슈 분석", local: "1위 멤버 표시", premium: "기여 패턴/리스크 멤버 자동 식별" },
  { label: "전략 제안", local: "사전 룰 기반 (정형)", premium: "길드 상황 맞춤 전략 + 우선순위" },
  { label: "톤/뉘앙스", local: "기계적", premium: "운영자 친화적, 자연스러운 한국어" },
  { label: "리포트 분량", local: "요약 4섹션", premium: "심층 분석 4섹션 + 인사이트 칩" },
  { label: "히스토리 분석", local: "이번주/전주", premium: "최근 4주 추세 + 모멘텀 추론" },
  { label: "PDF/공유", local: "기본", premium: "브랜딩 PDF · Slack/Discord 연동(예정)" },
];

const SELLING_POINTS = [
  {
    icon: "✦",
    title: "문장 창작력",
    body:
      "AI가 단순한 수치 나열을 넘어, 길드 운영자에게 보고하듯 자연스러운 한국어 문장으로 한 주를 풀어냅니다. " +
      "운영진 회의 자료, 공지사항, 카톡 요약까지 그대로 활용 가능합니다.",
    bullet: ["딱딱한 통계 → 친근한 운영 보고", "분위기/톤 자동 조절", "공유 즉시 사용 가능"],
  },
  {
    icon: "◈",
    title: "유저 맥락 분석",
    body:
      "닉네임·직업·점수 추세를 통합 추론해 ‘왜’ 이런 점수가 나왔는지를 설명합니다. " +
      "단순 1위 표기가 아닌 ‘딜러진 정체, 힐러 기여 상승’ 같은 구조적 인사이트를 발굴합니다.",
    bullet: ["직업/역할 기반 평가", "하락 모멘텀 자동 포착", "리스크 멤버 조기 알림"],
  },
  {
    icon: "✧",
    title: "맞춤형 전략 제시",
    body:
      "길드의 이번 주 약점·모멘텀에 맞춘 다음 주 전략을 우선순위와 함께 제시합니다. " +
      "‘참여율 +5%’ 같은 정량 목표와 함께 실행 가능한 액션 리스트를 받아보세요.",
    bullet: ["우선순위가 매겨진 액션", "정량 목표 자동 설정", "콘텐츠별 회복 전략"],
  },
];

export function PlanCompare({ inline = false, onClose }) {
  const { t } = useGuildInsight();

  const gradient = `linear-gradient(135deg, ${t.accent} 0%, ${t.up} 100%)`;
  const cardShadow = "0 10px 40px rgba(0,200,255,0.08), 0 2px 10px rgba(0,0,0,0.25)";

  const Pill = ({ children, tone = "muted" }) => (
    <span
      style={{
        fontSize: 10,
        padding: "3px 10px",
        borderRadius: 20,
        border: `1px solid ${tone === "premium" ? t.borderStrong : t.border}`,
        background: tone === "premium" ? t.accentFaint : t.bgAlt,
        color: tone === "premium" ? t.accent : t.textMuted,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: inline ? "16px 18px" : "32px 36px",
        background: t.bg,
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Hero */}
        <div
          style={{
            position: "relative",
            padding: "28px 28px 24px",
            borderRadius: 16,
            background: t.bgCard,
            border: `1px solid ${t.borderStrong}`,
            marginBottom: 22,
            overflow: "hidden",
            boxShadow: cardShadow,
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: gradient,
              opacity: 0.08,
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -60,
              right: -40,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: gradient,
              filter: "blur(80px)",
              opacity: 0.35,
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 20,
                background: t.accentFaint,
                border: `1px solid ${t.borderStrong}`,
                color: t.accent,
                fontSize: 11,
                fontWeight: 500,
                marginBottom: 12,
                letterSpacing: "0.06em",
              }}
            >
              GUILD INSIGHT · PREMIUM
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: t.text,
                margin: 0,
                marginBottom: 8,
                lineHeight: 1.3,
              }}
            >
              로컬 데모 vs <span style={{
                background: gradient,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>AI 프리미엄 리포트</span>
            </h1>
            <p style={{ color: t.textSub, fontSize: 13, lineHeight: 1.7, margin: 0, maxWidth: 720 }}>
              로컬 데모 리포트는 <strong style={{ color: t.text }}>점수 데이터를 빠르게 정리</strong>해주는 무료 도구입니다.
              하지만 길드 운영의 다음 단계 — <strong style={{ color: t.accent }}>맥락 해석 · 전략 수립 · 자연스러운 문장</strong> —
              은 GPT 기반 AI 프리미엄 리포트에서만 얻을 수 있습니다.
            </p>
          </div>
          {inline && onClose && (
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 28,
                height: 28,
                borderRadius: 14,
                border: `1px solid ${t.border}`,
                background: t.bgAlt,
                color: t.textMuted,
                cursor: "pointer",
                fontSize: 12,
                zIndex: 2,
              }}
              title="닫기"
            >
              ✕
            </button>
          )}
        </div>

        {/* Selling points */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
            marginBottom: 22,
          }}
        >
          {SELLING_POINTS.map((sp, i) => (
            <div
              key={sp.title}
              style={{
                position: "relative",
                padding: "20px 22px",
                borderRadius: 14,
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                overflow: "hidden",
                transition: "transform 0.2s, border-color 0.2s",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: gradient,
                  opacity: 0.7,
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: t.accentFaint,
                  border: `1px solid ${t.borderStrong}`,
                  color: t.accent,
                  fontSize: 18,
                  marginBottom: 12,
                }}
              >
                {sp.icon}
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4, letterSpacing: "0.08em" }}>
                STEP {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 8 }}>{sp.title}</div>
              <p style={{ fontSize: 12, color: t.textSub, lineHeight: 1.7, margin: 0, marginBottom: 12 }}>{sp.body}</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {sp.bullet.map((b) => (
                  <li
                    key={b}
                    style={{
                      fontSize: 11,
                      color: t.textSub,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: t.up, marginTop: 1 }}>✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Compare table */}
        <div
          style={{
            position: "relative",
            borderRadius: 16,
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            overflow: "hidden",
            boxShadow: cardShadow,
            marginBottom: 22,
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              padding: 1,
              borderRadius: 16,
              background: gradient,
              opacity: 0.18,
              maskImage:
                "linear-gradient(black, black) content-box, linear-gradient(black, black)",
              WebkitMaskImage:
                "linear-gradient(black, black) content-box, linear-gradient(black, black)",
              maskComposite: "exclude",
              WebkitMaskComposite: "xor",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative" }}>
            {/* header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 1fr",
                gap: 0,
                borderBottom: `1px solid ${t.border}`,
              }}
            >
              <div style={{ padding: "16px 22px", color: t.textMuted, fontSize: 11, letterSpacing: "0.08em" }}>
                기능 비교
              </div>
              <div
                style={{
                  padding: "16px 22px",
                  borderLeft: `1px solid ${t.border}`,
                  background: t.bgAlt,
                }}
              >
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>FREE</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>◇ 로컬 데모 리포트</div>
                <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>OpenAI 미사용 · 즉시 생성</div>
              </div>
              <div
                style={{
                  padding: "16px 22px",
                  borderLeft: `1px solid ${t.border}`,
                  background: t.accentFaint,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 12,
                    fontSize: 10,
                    padding: "2px 9px",
                    borderRadius: 20,
                    background: gradient,
                    color: "#fff",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  추천
                </span>
                <div style={{ fontSize: 11, color: t.accent, marginBottom: 4 }}>PREMIUM</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>✦ AI 프리미엄 리포트</div>
                <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>GPT-4o · 길드 맥락 분석</div>
              </div>
            </div>

            {/* feature rows */}
            {FEATURE_ROWS.map((row, idx) => (
              <div
                key={row.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1fr",
                  borderBottom: idx < FEATURE_ROWS.length - 1 ? `1px solid ${t.border}` : "none",
                  background: row.highlight ? t.bgAlt : "transparent",
                }}
              >
                <div
                  style={{
                    padding: "13px 22px",
                    fontSize: 12,
                    color: t.text,
                    fontWeight: row.highlight ? 600 : 500,
                  }}
                >
                  {row.label}
                </div>
                <div
                  style={{
                    padding: "13px 22px",
                    borderLeft: `1px solid ${t.border}`,
                    fontSize: 12,
                    color: t.textSub,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Pill tone="muted">FREE</Pill>
                  {row.local}
                </div>
                <div
                  style={{
                    padding: "13px 22px",
                    borderLeft: `1px solid ${t.border}`,
                    fontSize: 12,
                    color: t.text,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Pill tone="premium">PREMIUM</Pill>
                  {row.premium}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            position: "relative",
            padding: "28px 32px",
            borderRadius: 16,
            background: t.bgCard,
            border: `1px solid ${t.borderStrong}`,
            overflow: "hidden",
            boxShadow: cardShadow,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: gradient,
              opacity: 0.07,
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              bottom: -80,
              left: -40,
              width: 260,
              height: 260,
              borderRadius: "50%",
              background: gradient,
              filter: "blur(90px)",
              opacity: 0.25,
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", zIndex: 1, flex: "1 1 320px", minWidth: 280 }}>
            <div style={{ fontSize: 11, color: t.accent, marginBottom: 6, letterSpacing: "0.08em", fontWeight: 500 }}>
              READY TO LEVEL UP?
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: t.text, marginBottom: 6, lineHeight: 1.4 }}>
              지금 바로 AI 프리미엄으로 길드 운영을 자동화하세요.
            </div>
            <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.6 }}>
              7일 무료 체험 · 언제든 해지 가능 · 첫 결제 후에도 데모 모드는 계속 무료로 제공됩니다.
            </div>
          </div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <Link
              href="/billing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "14px 28px",
                borderRadius: 12,
                background: gradient,
                color: "#04101c",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.04em",
                textDecoration: "none",
                boxShadow: "0 6px 20px rgba(0,200,255,0.35)",
                whiteSpace: "nowrap",
                transition: "transform 0.15s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 10px 26px rgba(0,200,255,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,200,255,0.35)";
              }}
            >
              ✦ 프리미엄 구독하기
            </Link>
            <Link
              href="/gptreport"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 24px",
                borderRadius: 10,
                background: "transparent",
                color: t.textSub,
                fontSize: 11,
                textDecoration: "none",
                border: `1px solid ${t.border}`,
                whiteSpace: "nowrap",
              }}
            >
              우선 데모 리포트 체험
            </Link>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            padding: "12px 18px",
            fontSize: 11,
            color: t.textMuted,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          * 결제는 SaaS 백엔드(Stripe/Toss 예정) 연동 시 활성화됩니다. 현재 버튼은 안내 페이지로 이동합니다.
        </div>
      </div>
    </div>
  );
}
