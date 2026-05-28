import Link from "next/link";
import { HexLogo } from "@/components/branding/HexLogo";
import { LegalMarkdown } from "@/components/legal/LegalMarkdown";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata = {
  title: "개인정보처리방침 | Guild Insight",
  description: "Guild Insight 개인정보처리방침",
};

const MD = `# 개인정보처리방침

최종 업데이트: 2026-05-28

Guild Insight(이하 “운영자”)는 「개인정보 보호법」 등 대한민국의 관련 법령을 준수하며, 이용자의 개인정보를 안전하게 보호하기 위해 본 개인정보처리방침을 수립·공개합니다.

---

## 1. 서비스 개요

- Guild Insight는 Next.js 기반의 MMORPG 길드 운영 SaaS 플랫폼입니다.
- 핵심 기능: Google/Discord 로그인 연동, 길드 점수 스크린샷 OCR 자동 인식, GPT 기반 전략 리포트 제공
- 중요: 이용자가 업로드한 OCR 이미지(스크린샷)는 **Supabase Storage 또는 서버에 저장하지 않으며**, 텍스트 추출(인식) 처리 후 **메모리에서 즉시 파기**됩니다.

---

## 2. 수집하는 개인정보 항목

운영자는 서비스 제공을 위해 아래 개인정보를 수집·이용합니다.

### 2.1 필수 수집 항목

- 소셜 로그인 식별 정보: 이메일(제공되는 경우), 사용자 고유 식별자(UID), 프로필 정보(이름/닉네임/프로필 이미지 URL 등 제공 범위 내)
- 서비스 이용 기록: 접속 로그, 이용 일시, IP 주소(보안 및 운영 목적), 쿠키/세션 정보

### 2.2 선택 수집 항목

- 고객 문의 시: 문의 내용, 회신을 위한 연락처(이메일 등)

### 2.3 수집하지 않는 항목(원칙)

- OCR 이미지 파일 원본: 저장하지 않음(텍스트 추출 즉시 파기)
- 민감정보(건강/사상/정치/종교 등): 수집하지 않음

---

## 3. 개인정보의 수집·이용 목적

- 회원 식별 및 인증(로그인 세션 유지 포함)
- 길드 운영 데이터 관리(길드/길드원/점수/기여도 등) 및 기능 제공
- OCR 텍스트 추출 결과 기반 점수 입력 보조
- GPT 리포트 생성 및 제공(요약, 전략 제안 등)
- 보안(부정 이용 탐지, 접근 통제, 로그 분석) 및 서비스 품질 개선
- 고객 문의 응대 및 공지 전달

---

## 4. 처리 위탁 및 제3자 제공

운영자는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 서비스 제공을 위해 일부 처리를 외부 업체에 위탁할 수 있습니다.

### 4.1 처리 위탁

- Supabase: 로그인 인증, 세션 쿠키 처리, 데이터베이스/서버 인프라 제공(인증 위탁)
- OAuth 제공자(Google/Discord): 소셜 로그인 인증
- OpenAI(선택 기능): GPT 리포트 생성(환경 변수로 API 키가 설정된 경우)

※ 위탁 처리 시 운영자는 관련 법령에 따라 위탁계약을 체결하고, 개인정보가 안전하게 관리되도록 필요한 사항을 규정합니다.

---

## 5. 보유 및 이용기간

운영자는 개인정보의 수집·이용 목적이 달성되면 지체 없이 파기합니다. 다만, 관계 법령에 따라 보존이 필요한 경우 해당 법령에서 정한 기간 동안 보관할 수 있습니다.

- 계정 정보: 회원 탈퇴 시(또는 이용계약 종료 시) 지체 없이 파기
- 서비스 이용 기록: 부정 이용 방지 및 보안 목적의 최소 기간 보관 후 파기(내부 정책에 따름)

---

## 6. 개인정보의 파기 절차 및 방법

- 전자적 파일 형태: 복구 불가능한 방법으로 영구 삭제
- 출력물: 분쇄 또는 소각

### 6.1 OCR 이미지 파기(특이사항)

- OCR 스크린샷은 서버에 저장하지 않으며, 처리 과정에서 메모리로만 사용 후 즉시 파기됩니다.

---

## 7. 이용자의 권리(열람·정정·삭제 등) 및 행사 방법

이용자는 언제든지 본인의 개인정보에 대해 열람, 정정, 삭제, 처리정지 등을 요구할 수 있습니다.

- 계정 삭제: 서비스 내 계정 삭제 기능 또는 고객센터 문의를 통해 요청할 수 있습니다.

---

## 8. 개인정보의 안전성 확보 조치

운영자는 개인정보 보호를 위해 다음과 같은 조치를 시행합니다.

- 인증/인가: 로그인 기반 접근 통제, 세션 검증
- 접근 권한 최소화 및 관리
- 전송구간 암호화(HTTPS)
- 주요 비밀정보(API Key 등) 환경 변수 관리
- 로그 모니터링 및 보안 점검

---

## 9. 쿠키 및 세션

운영자는 로그인 세션 유지 및 보안 강화를 위해 쿠키를 사용할 수 있습니다. 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 일부 기능 이용이 제한될 수 있습니다.

---

## 10. 개인정보 보호책임자 및 문의

개인정보 관련 문의는 아래로 연락해 주세요.

- 이메일: support@guildinsight.app

---

## 11. 고지의 의무

본 방침은 법령/서비스 변경에 따라 개정될 수 있으며, 중요한 변경이 있는 경우 서비스 내 공지 또는 별도 수단으로 고지합니다.

`;

export default function PrivacyPolicyPage() {
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
            href="/terms"
            style={{
              color: "rgba(180, 210, 240, 0.75)",
              textDecoration: "none",
              fontSize: 11,
            }}
          >
            서비스 이용약관
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

