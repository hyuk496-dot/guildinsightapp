'use client';

import Link from "next/link";

export function DemoStickyBanner() {
  return (
    <div
      role="status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 400,
        width: "100%",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        flexWrap: "wrap",
        background: "linear-gradient(90deg, rgba(0,200,255,0.12) 0%, rgba(8,18,32,0.98) 50%, rgba(0,200,255,0.12) 100%)",
        borderBottom: "1px solid rgba(0, 200, 255, 0.25)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
        fontFamily: "'Courier New', monospace",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#4cff91",
          boxShadow: "0 0 8px #4cff91",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 12, color: "#e8f4ff", textAlign: "center", lineHeight: 1.5 }}>
        현재 데모 체험 모드입니다. 데이터 저장 및 OCR 실제 스캔은 정식 가입 후 이용 가능합니다.
      </span>
      <Link
        href="/?login=1"
        style={{
          fontSize: 11,
          padding: "5px 12px",
          borderRadius: 6,
          border: "1px solid rgba(0, 200, 255, 0.4)",
          background: "rgba(0, 200, 255, 0.1)",
          color: "#00c8ff",
          textDecoration: "none",
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        정식 가입 →
      </Link>
    </div>
  );
}
