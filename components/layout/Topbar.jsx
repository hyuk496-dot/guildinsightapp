'use client';

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TR } from "@/lib/theme";
import { ROUTES } from "@/lib/navigation";
import { useGuildInsight } from "@/context/GuildInsightProvider";

const ZOOM_MIN = 0.9;
const ZOOM_MAX = 1.5;

function ZoomIcon({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.25" stroke={color} strokeWidth="1.75" />
      <path d="M15.2 15.2L20 20" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M10.5 7.5v6M7.5 10.5h6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Topbar({ t, dark, setDark, title, sub, onLogout }) {
  const router = useRouter();
  const pathname = usePathname();
  const { guilds, zoom, zoomIn, zoomOut, setZoom } = useGuildInsight();
  const [mounted, setMounted] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const zoomWrapRef = useRef(null);

  const zoomLevel = mounted ? (zoom ?? 1) : 1;
  const zoomPct = Math.round(zoomLevel * 100);
  const atMin = zoomLevel <= ZOOM_MIN;
  const atMax = zoomLevel >= ZOOM_MAX;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!zoomOpen) return;
    const onPointerDown = (e) => {
      if (zoomWrapRef.current && !zoomWrapRef.current.contains(e.target)) {
        setZoomOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [zoomOpen]);

  const zoomBtn = {
    padding: "4px 10px",
    border: `1px solid ${t.borderStrong}`,
    borderRadius: 6,
    background: t.accentFaint,
    color: t.accent,
    fontSize: 11,
    fontFamily: "'Courier New',monospace",
    cursor: "pointer",
    transition: TR,
    lineHeight: 1,
    minWidth: 28,
  };

  const hasNoGuild = (guilds?.length ?? 0) === 0;

  const guardedNav = (target) => () => {
    if (hasNoGuild) {
      alert("길드 생성 후 이용 가능합니다.");
      if (pathname !== "/guild/new") {
        router.replace("/guild/new?welcome=1");
      }
      return;
    }
    router.push(target);
  };

  return (
    <div
      style={{
        background: t.navBg,
        borderBottom: `1px solid ${t.navBorder}`,
        padding: "11px 22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        transition: TR,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>{title}</div>
        {sub && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: t.textMuted }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.up, display: "inline-block" }} />
          실시간
        </div>
        <button
          onClick={() => setDark((d) => !d)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            border: `1px solid ${t.borderStrong}`,
            borderRadius: 7,
            background: t.accentFaint,
            color: t.accent,
            fontSize: 10,
            fontFamily: "'Courier New',monospace",
            cursor: "pointer",
            letterSpacing: "0.08em",
            fontWeight: 500,
            transition: TR,
          }}
        >
          {dark ? "☀ LIGHT" : "☽ DARK"}
        </button>
        <button
          onClick={guardedNav(ROUTES.ocrUpload)}
          disabled={hasNoGuild}
          title={hasNoGuild ? "길드 생성 후 이용 가능합니다." : undefined}
          style={{
            fontSize: 10,
            padding: "5px 11px",
            border: `1px solid ${t.border}`,
            borderRadius: 7,
            background: t.accentFainter,
            color: t.accentDim,
            fontFamily: "'Courier New',monospace",
            cursor: hasNoGuild ? "not-allowed" : "pointer",
            opacity: hasNoGuild ? 0.45 : 1,
          }}
        >
          OCR
        </button>
        <button
          onClick={guardedNav(ROUTES.gptreport)}
          disabled={hasNoGuild}
          title={hasNoGuild ? "길드 생성 후 이용 가능합니다." : undefined}
          style={{
            fontSize: 10,
            padding: "5px 11px",
            border: `1px solid ${t.borderStrong}`,
            borderRadius: 7,
            background: t.accentFaint,
            color: t.accent,
            fontFamily: "'Courier New',monospace",
            cursor: hasNoGuild ? "not-allowed" : "pointer",
            fontWeight: 500,
            opacity: hasNoGuild ? 0.45 : 1,
          }}
        >
          GPT 리포트
        </button>

        <div ref={zoomWrapRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setZoomOpen((o) => !o)}
            title="화면 확대/축소"
            aria-label="화면 확대/축소"
            aria-expanded={zoomOpen}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              padding: 0,
              border: `1px solid ${zoomOpen ? t.accent : t.border}`,
              borderRadius: 7,
              background: zoomOpen ? t.accentFaint : t.accentFainter,
              color: t.accent,
              cursor: "pointer",
              transition: TR,
            }}
          >
            <ZoomIcon color={t.accent} />
          </button>
          {zoomOpen && (
            <div
              role="dialog"
              aria-label="화면 배율 조절"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                zIndex: 50,
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${t.borderStrong}`,
                background: t.navBg,
                boxShadow: `0 8px 24px ${dark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.12)"}`,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <button
                type="button"
                onClick={zoomOut}
                disabled={atMin}
                style={{
                  ...zoomBtn,
                  opacity: atMin ? 0.35 : 1,
                  cursor: atMin ? "not-allowed" : "pointer",
                }}
                aria-label="축소"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                style={{ ...zoomBtn, minWidth: 52, fontWeight: 500 }}
                aria-label="100%로 초기화"
                suppressHydrationWarning
              >
                {zoomPct}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={atMax}
                style={{
                  ...zoomBtn,
                  opacity: atMax ? 0.35 : 1,
                  cursor: atMax ? "not-allowed" : "pointer",
                }}
                aria-label="확대"
              >
                +
              </button>
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 18, background: t.border, margin: "0 2px" }} />
        <button
          onClick={onLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 10,
            padding: "5px 12px",
            border: "1px solid rgba(255,91,91,0.3)",
            borderRadius: 7,
            background: "rgba(255,91,91,0.06)",
            color: "#ff7070",
            fontFamily: "'Courier New',monospace",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
            <path d="M9 2H12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9" stroke="#ff7070" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M6 10l3-3-3-3" stroke="#ff7070" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="9" y1="7" x2="1" y2="7" stroke="#ff7070" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          로그아웃
        </button>
      </div>
    </div>
  );
}
