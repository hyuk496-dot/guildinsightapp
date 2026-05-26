'use client';

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function UnauthorizedInner() {
  const router = useRouter();
  const params = useSearchParams();
  const guild = params.get("guild");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#080c14",
        color: "#e8f4ff",
        fontFamily: "'Courier New',monospace",
        padding: 24,
        textAlign: "center",
      }}
    >
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ marginBottom: 18 }}>
        <circle cx="28" cy="28" r="24" stroke="#ff5b5b" strokeWidth="1.5" opacity="0.35" />
        <path
          d="M20 24v-4a8 8 0 1 1 16 0v4"
          stroke="#ff5b5b"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <rect x="18" y="24" width="20" height="14" rx="2" stroke="#ff5b5b" strokeWidth="1.5" fill="rgba(255,91,91,0.08)" />
        <circle cx="28" cy="31" r="1.5" fill="#ff5b5b" />
      </svg>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.25em",
          color: "rgba(255,91,91,0.6)",
          marginBottom: 10,
        }}
      >
        ACCESS · DENIED
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "#ff8585",
          marginBottom: 10,
        }}
      >
        타 길드의 데이터에는 접근 권한이 없습니다.
      </div>
      <div
        style={{
          fontSize: 12,
          color: "rgba(180,210,240,0.7)",
          maxWidth: 520,
          lineHeight: 1.7,
          marginBottom: 22,
        }}
      >
        본인이 생성하거나 소속된 길드의 데이터만 조회/수정할 수 있습니다.
        {guild && (
          <>
            <br />
            <span style={{ color: "rgba(180,210,240,0.5)" }}>
              요청한 길드 ID: <code>{guild}</code>
            </span>
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => router.push("/dashboard")}
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
          ← 내 대시보드로
        </button>
        <button
          onClick={() => router.push("/")}
          style={{
            padding: "10px 20px",
            background: "transparent",
            color: "rgba(180,210,240,0.7)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "'Courier New',monospace",
            fontSize: 11,
            letterSpacing: "0.1em",
          }}
        >
          메인으로
        </button>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={null}>
      <UnauthorizedInner />
    </Suspense>
  );
}
