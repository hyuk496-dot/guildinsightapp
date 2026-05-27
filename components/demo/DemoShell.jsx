'use client';

import { DemoStickyBanner } from "@/components/demo/DemoStickyBanner";

/** 데모 라우트 전용 셸 — Supabase/실서비스 레이아웃과 분리 */
export function DemoShell({ children }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "#080c14",
      }}
    >
      <DemoStickyBanner />
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>{children}</div>
    </div>
  );
}
