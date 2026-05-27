'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { THEMES, TR } from "@/lib/theme";
import { ToastProvider, useToast, LOGIN_REQUIRED_TOAST } from "@/components/shared/Toast";

const t = THEMES.dark;

function GuestBillingShellInner({ children }) {
  const router = useRouter();
  const { showToast } = useToast();
  const sections = [...new Set(NAV_ITEMS.map((i) => i.section))];

  const requireLogin = () => {
    showToast(LOGIN_REQUIRED_TOAST);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: t.bg,
        color: t.text,
        fontFamily: "'Courier New',monospace",
        colorScheme: "dark",
      }}
    >
      <header
        style={{
          padding: "12px 22px",
          borderBottom: `1px solid ${t.navBorder}`,
          background: t.navBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: t.accent,
          }}
        >
          <svg width={28} height={28} viewBox="0 0 28 28" fill="none" aria-hidden>
            <polygon
              points="14,2 24,8 24,20 14,26 4,20 4,8"
              stroke={t.accent}
              strokeWidth="1"
              fill="rgba(0,200,255,0.06)"
            />
            <polygon
              points="14,7 20,10.5 20,17.5 14,21 8,17.5 8,10.5"
              stroke={t.accent}
              strokeWidth="0.5"
              fill="rgba(0,200,255,0.08)"
            />
            <circle cx="14" cy="14" r="3" fill={t.accent} opacity="0.9" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.06em" }}>GUILD INSIGHT</span>
        </Link>
        <button
          type="button"
          onClick={() => router.push("/?login=1")}
          style={{
            fontSize: 11,
            padding: "6px 14px",
            border: `1px solid ${t.borderStrong}`,
            borderRadius: 7,
            background: t.accentFaint,
            color: t.accent,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          로그인
        </button>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside
          style={{
            width: 196,
            flexShrink: 0,
            background: t.navBg,
            borderRight: `1px solid ${t.navBorder}`,
            display: "flex",
            flexDirection: "column",
            transition: TR,
          }}
        >
          <div style={{ padding: "14px 12px 12px", borderBottom: `1px solid ${t.navBorder}` }}>
            <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.1em" }}>미리보기</div>
            <div style={{ fontSize: 12, color: t.textSub, marginTop: 4 }}>로그인 후 대시보드 이용</div>
          </div>
          <div style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
            {sections.map((sec) => (
              <div key={sec}>
                <div
                  style={{
                    fontSize: 9,
                    color: t.textMuted,
                    padding: "10px 8px 3px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {sec}
                </div>
                {NAV_ITEMS.filter((i) => i.section === sec).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={requireLogin}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 7,
                      fontSize: 11,
                      color: t.textSub,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      marginBottom: 1,
                      textAlign: "left",
                      fontFamily: "inherit",
                      opacity: 0.75,
                    }}
                  >
                    <span style={{ fontSize: 11, opacity: 0.75 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function GuestBillingShell({ children }) {
  return (
    <ToastProvider>
      <GuestBillingShellInner>{children}</GuestBillingShellInner>
    </ToastProvider>
  );
}
