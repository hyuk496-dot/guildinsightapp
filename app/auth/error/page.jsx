'use client';

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * OAuth code 교환 실패 시 보여줄 에러 페이지.
 * Route Handler 가 ?error=...&code=...&desc=... 로 리다이렉트한다.
 */

function diagnose({ error, code, desc }) {
  const d = (desc || "").toLowerCase();
  const c = (code || "").toLowerCase();

  if (d.includes("invalid_client") || d.includes("client secret is invalid")) {
    return {
      title: "Supabase ↔ Google Client Secret 불일치",
      lines: [
        "Google이 invalid_client 로 거절했습니다.",
        "Supabase Dashboard → Authentication → Providers → Google 의 Client Secret 을 새로 발급받아 정확히 재입력하세요.",
      ],
    };
  }
  if (d.includes("pkce") || d.includes("code verifier")) {
    return {
      title: "PKCE verifier 누락",
      lines: [
        "OAuth 시작과 callback 사이에 쿠키가 유실되었습니다.",
        "브라우저의 쿠키/사이트 데이터를 지운 뒤 다시 시도하세요. " +
          "사파리/시크릿 모드의 일부 정책이 3rd-party 쿠키를 차단할 수 있으니, 일반 창에서 시도해 보세요.",
      ],
    };
  }
  if (d.includes("unable to exchange external code")) {
    return {
      title: "Supabase가 외부 코드 교환에 실패",
      lines: [
        "Supabase Dashboard → Providers → Google 의 Client ID / Secret 을 다시 확인하세요.",
        "특히 Client Secret 의 앞뒤 공백/줄바꿈 여부, 그리고 OAuth Client 타입이 'Web application' 인지 확인.",
      ],
    };
  }
  if (d.includes("redirect_uri") || d.includes("redirect_mismatch")) {
    return {
      title: "Redirect URI 불일치",
      lines: [
        "Google Cloud Console 의 Authorized redirect URIs 에",
        "https://<your-project>.supabase.co/auth/v1/callback 가 정확히 들어가 있어야 합니다.",
      ],
    };
  }
  if (c === "access_denied" || d.includes("access_denied")) {
    return {
      title: "사용자가 권한 요청을 거절했습니다",
      lines: ["다시 시도해서 권한을 허용해 주세요."],
    };
  }
  return null;
}

function ErrorViewInner() {
  const router = useRouter();
  const params = useSearchParams();
  const errorParam = params.get("error");
  const codeParam = params.get("code");
  const descParam = params.get("desc");

  const diag = diagnose({ error: errorParam, code: codeParam, desc: descParam });

  const raw = {
    error: errorParam,
    code: codeParam,
    desc: descParam,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#080c14",
        fontFamily: "'Courier New',monospace",
        padding: 24,
        textAlign: "center",
        color: "#e8f4ff",
      }}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 18 }}>
        <circle cx="24" cy="24" r="20" stroke="#ff5b5b" strokeWidth="1.5" opacity="0.4" />
        <line x1="17" y1="17" x2="31" y2="31" stroke="#ff5b5b" strokeWidth="2" strokeLinecap="round" />
        <line x1="31" y1="17" x2="17" y2="31" stroke="#ff5b5b" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div
        style={{
          fontSize: 11,
          color: "rgba(0,200,255,0.5)",
          letterSpacing: "0.25em",
          marginBottom: 10,
        }}
      >
        AUTH · ERROR
      </div>
      <div
        style={{
          fontSize: 14,
          color: "#ff5b5b",
          letterSpacing: "0.05em",
          marginBottom: 6,
          fontWeight: 500,
        }}
      >
        로그인에 실패했습니다
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(180,210,240,0.7)",
          lineHeight: 1.7,
          maxWidth: 520,
          marginBottom: 12,
          wordBreak: "break-word",
        }}
      >
        {descParam || errorParam || "알 수 없는 오류"}
      </div>

      {diag && (
        <div
          style={{
            marginTop: 14,
            padding: "16px 20px",
            background: "rgba(255,176,46,0.08)",
            border: "1px solid rgba(255,176,46,0.35)",
            borderRadius: 10,
            fontSize: 11,
            color: "#ffd47a",
            maxWidth: 620,
            lineHeight: 1.7,
            textAlign: "left",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12 }}>⚠ {diag.title}</div>
          {diag.lines.map((line, i) => (
            <div key={i} style={{ color: "#ffe3a8" }}>
              {line}
            </div>
          ))}
        </div>
      )}

      <details style={{ marginTop: 14, maxWidth: 620, width: "100%" }}>
        <summary
          style={{
            fontSize: 10,
            color: "rgba(0,200,255,0.55)",
            cursor: "pointer",
            letterSpacing: "0.1em",
          }}
        >
          ▶ 원본 쿼리 파라미터 (디버그)
        </summary>
        <pre
          style={{
            marginTop: 8,
            padding: 10,
            background: "rgba(0,200,255,0.05)",
            border: "1px solid rgba(0,200,255,0.15)",
            borderRadius: 6,
            color: "rgba(180,210,240,0.75)",
            fontSize: 10,
            textAlign: "left",
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {JSON.stringify(raw, null, 2)}
        </pre>
      </details>

      <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
        <button
          onClick={() => router.replace("/")}
          style={{
            padding: "10px 20px",
            background: "transparent",
            color: "#00c8ff",
            border: "1px solid rgba(0,200,255,0.35)",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "'Courier New',monospace",
            fontSize: 11,
            letterSpacing: "0.1em",
          }}
        >
          ← 메인으로
        </button>
        <button
          onClick={() => {
            try {
              document.cookie.split(";").forEach((c) => {
                const eq = c.indexOf("=");
                const name = (eq > -1 ? c.substring(0, eq) : c).trim();
                if (name.startsWith("sb-")) {
                  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                }
              });
            } catch {}
            router.replace("/");
          }}
          style={{
            padding: "10px 20px",
            background: "rgba(0,200,255,0.08)",
            color: "#00c8ff",
            border: "1px solid rgba(0,200,255,0.5)",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "'Courier New',monospace",
            fontSize: 11,
            letterSpacing: "0.1em",
          }}
        >
          쿠키 초기화 후 메인으로
        </button>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#080c14" }} />}>
      <ErrorViewInner />
    </Suspense>
  );
}
