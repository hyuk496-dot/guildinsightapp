export function Tag({ bg, color, children }) {
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 8px",
        background: bg,
        color,
        borderRadius: 20,
        fontWeight: 500,
        border: `1px solid ${color}33`,
      }}
    >
      {children}
    </span>
  );
}
