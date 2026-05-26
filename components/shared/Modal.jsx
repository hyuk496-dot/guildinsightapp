'use client';

export function Modal({ open, onClose, t, title, children }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: t.modalBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.bgCard,
          border: `1px solid ${t.borderStrong}`,
          borderRadius: 14,
          padding: "22px 24px",
          minWidth: 340,
          maxWidth: 480,
          width: "90%",
          boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: t.accent, letterSpacing: "0.06em" }}>{title}</span>
          <span onClick={onClose} style={{ cursor: "pointer", color: t.textMuted, fontSize: 16, lineHeight: 1 }}>
            ✕
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
