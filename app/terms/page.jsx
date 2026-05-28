import Link from "next/link";
import { HexLogo } from "@/components/branding/HexLogo";
import { LegalMarkdown } from "@/components/legal/LegalMarkdown";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata = {
  title: "서비스 이용약관 | Guild Insight",
  description: "Guild Insight 서비스 이용약관",
};

const MD = `# 서비스 이용약관

최종 업데이트: 2026-05-28

본 약관은 Guild Insight(이하 “운영자”)가 제공하는 Next.js 기반 MMORPG 길드 운영 SaaS 플랫폼(이하 “서비스”)의 이용과 관련하여 운영자와 이용자 간의 권리·의무 및 책임사항을 규정합니다.

---

## 1. 용어의 정의

- “서비스”: 운영자가 제공하는 Guild Insight 웹/앱 및 관련 기능 일체
- “이용자”: 본 약관에 따라 서비스를 이용하는 회원 및 비회원
- “회원”: Google/Discord 또는 이메일 등을 통해 인증을 완료하고 서비스를 이용하는 자
- “콘텐츠”: 이용자가 입력·업로드하거나 서비스가 생성·제공하는 데이터(점수, 리포트 등)

---

## 2. 약관의 효력 및 변경

- 본 약관은 서비스 화면에 게시하거나 기타 방법으로 공지함으로써 효력이 발생합니다.
- 운영자는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 중요한 변경은 사전에 공지합니다.

---

## 3. 회원가입 및 인증

- 회원은 Google/Discord OAuth 또는 이메일 등 운영자가 제공하는 방식으로 가입·로그인할 수 있습니다.
- 소셜 로그인 인증 및 세션 관리는 Supabase를 통해 처리될 수 있습니다.

---

## 4. 서비스의 제공 및 변경

운영자는 다음 기능을 포함한 서비스를 제공합니다.

- 길드/길드원/점수 데이터 관리
- 점수 스크린샷 OCR 자동 인식 및 점수 입력 보조
- GPT 기반 전략 리포트 제공
- 랭킹 시뮬레이션 및 대시보드 시각화

운영자는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경할 수 있습니다.

---

## 5. 이용자의 의무

이용자는 다음 행위를 하여서는 안 됩니다.

- 타인의 계정 또는 개인정보를 도용하는 행위
- 서비스의 정상 동작을 방해하거나 부정 접근을 시도하는 행위
- 법령 또는 공서양속에 반하는 콘텐츠를 게시·전송하는 행위
- 운영자의 사전 동의 없이 서비스를 영리 목적으로 복제/판매/재배포하는 행위

---

## 6. OCR 업로드 이미지 처리(특이사항)

- 이용자가 업로드한 OCR 이미지(스크린샷)는 **Supabase Storage 또는 서버에 저장되지 않으며**, 텍스트 추출(인식) 처리 후 **메모리에서 즉시 파기**됩니다.
- 다만, 이용자가 OCR 결과로 저장하는 “점수 데이터” 등은 서비스 제공을 위해 데이터베이스에 저장될 수 있습니다.

---

## 7. GPT 리포트 및 외부 API

- GPT 리포트는 이용자가 제공한 입력 데이터 및 서비스 내부 데이터에 기반하여 생성됩니다.
- 운영자는 생성 결과의 정확성/완전성을 보증하지 않으며, 이용자는 결과를 참고자료로 활용해야 합니다.
- 외부 API 제공자(OpenAI 등)의 정책/장애에 따라 기능이 제한될 수 있습니다.

---

## 8. 지식재산권

- 서비스 및 서비스 화면 구성, 로고, 디자인, 소프트웨어 등에 대한 권리는 운영자 또는 정당한 권리자에게 귀속됩니다.
- 이용자가 서비스 내에 업로드/입력한 데이터에 대한 권리는 이용자에게 귀속됩니다. 다만, 운영자는 서비스 제공·운영·개선 목적의 범위에서 해당 데이터를 처리할 수 있습니다.

---

## 9. 서비스 이용 제한 및 해지

운영자는 이용자가 본 약관 또는 관련 법령을 위반하는 경우, 서비스 이용을 제한하거나 계정을 해지할 수 있습니다.

---

## 10. 면책

운영자는 천재지변, 불가항력, 외부 서비스 장애 등 운영자의 합리적 통제 범위를 벗어난 사유로 인한 서비스 제공 불가에 대해 책임을 지지 않습니다.

---

## 11. 준거법 및 분쟁 해결

- 본 약관은 대한민국 법령에 따라 해석·적용됩니다.
- 서비스 이용과 관련하여 분쟁이 발생할 경우, 당사자 간 협의를 우선하며, 협의가 어려울 경우 관할 법원에 제기할 수 있습니다.

---

## 12. 문의

- 이메일: support@guildinsight.app

`;

export default function TermsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080c14",
        color: "#e8f4ff",
        fontFamily: "'Courier New', monospace",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 18px",
          borderBottom: "1px solid rgba(0, 200, 255, 0.12)",
          background: "rgba(8, 12, 20, 0.82)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            color: "#00c8ff",
            textDecoration: "none",
            letterSpacing: "0.12em",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          <HexLogo size={18} />
          GUILD INSIGHT
        </Link>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link
            href="/privacy"
            style={{
              color: "rgba(180, 210, 240, 0.75)",
              textDecoration: "none",
              fontSize: 11,
            }}
          >
            개인정보처리방침
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "22px 16px 64px" }}>
        <div
          style={{
            border: "1px solid rgba(0, 200, 255, 0.14)",
            borderRadius: 12,
            background: "rgba(0, 200, 255, 0.03)",
            padding: "18px 18px",
          }}
        >
          <LegalMarkdown markdown={MD} />
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

