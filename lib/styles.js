'use client';

export const iStyle = (t) => ({
  width: "100%",
  padding: "8px 12px",
  borderRadius: 7,
  border: `1px solid ${t.inputBorder}`,
  background: t.inputBg,
  color: t.text,
  outline: "none",
  fontSize: 12,
  fontFamily: "'Courier New',monospace",
  boxSizing: "border-box",
});

/** select — 다크 모드에서 OS 기본 흰 배경·흰 글자 방지 */
export const selectStyle = (t, overrides = {}) => ({
  padding: "8px 12px",
  borderRadius: 7,
  border: `1px solid ${t.borderStrong}`,
  background: t.bgCard,
  color: t.accent,
  outline: "none",
  fontSize: 12,
  fontFamily: "'Courier New',monospace",
  boxSizing: "border-box",
  fontWeight: 500,
  cursor: "pointer",
  ...overrides,
});

export const optionStyle = (t) => ({
  background: t.bgCard,
  color: t.accent,
});

export const btnPrimary = (t) => ({
  padding: "8px 0",
  border: `1px solid ${t.borderStrong}`,
  borderRadius: 7,
  background: t.accentFaint,
  color: t.accent,
  cursor: "pointer",
  fontFamily: "'Courier New',monospace",
  fontSize: 12,
  fontWeight: 500,
  width: "100%",
});

export const btnGhost = (t) => ({
  padding: "8px 0",
  border: `1px solid ${t.border}`,
  borderRadius: 7,
  background: "transparent",
  color: t.textSub,
  cursor: "pointer",
  fontFamily: "'Courier New',monospace",
  fontSize: 12,
  width: "100%",
});

export const btnDanger = () => ({
  padding: "8px 0",
  border: "1px solid rgba(255,91,91,0.4)",
  borderRadius: 7,
  background: "rgba(255,91,91,0.07)",
  color: "#ff5b5b",
  cursor: "pointer",
  fontFamily: "'Courier New',monospace",
  fontSize: 12,
  width: "100%",
});
