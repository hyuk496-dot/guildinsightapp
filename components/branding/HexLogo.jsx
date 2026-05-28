import React from "react";

export function HexLogo({ size = 18, color = "#00c8ff" }) {
  const s = Number(size) || 18;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      <polygon
        points="14,2 24,8 24,20 14,26 4,20 4,8"
        stroke={color}
        strokeWidth="1"
        fill="rgba(0,200,255,0.06)"
      />
      <polygon
        points="14,7 20,10.5 20,17.5 14,21 8,17.5 8,10.5"
        stroke={color}
        strokeWidth="0.5"
        fill="rgba(0,200,255,0.08)"
      />
      <circle cx="14" cy="14" r="3" fill={color} opacity="0.9" />
    </svg>
  );
}

