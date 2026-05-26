'use client';
import { useState } from "react";
import { selectStyle, optionStyle } from "@/lib/styles";

export function OcrRow({ t, row, idx, checked, onCheck, onEdit, members = [], onPickMember }) {
  const [editing, setEditing] = useState(false);
  const [wVal, setWVal] = useState(row.weekly.toString());

  const confColor = (c) => (c >= 90 ? t.up : c >= 80 ? "#d4a017" : t.dn);
  const gradeColor = (g) =>
    g === "S" ? t.accent : g === "A" ? t.up : g === "B" ? "#d4a017" : t.textMuted;

  const isMatched = row.memberId != null;
  const isFuzzy = isMatched && row.matchKind === "fuzzy";
  const isUnmatched = !isMatched;

  const rowBg = row.warn
    ? "rgba(239,159,39,0.04)"
    : checked
      ? "rgba(0,200,255,0.04)"
      : "transparent";

  return (
    <tr style={{ background: rowBg }}>
      <td style={{ padding: "8px 10px", width: 32 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(row.id, e.target.checked)}
          style={{ cursor: "pointer" }}
        />
      </td>
      <td style={{ padding: "8px 6px", color: t.textMuted, fontSize: 11 }}>{idx + 1}</td>
      <td style={{ padding: "8px 10px", minWidth: 180 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: t.avColors[idx % 6][0],
              color: t.avColors[idx % 6][1],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {row.nick.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{row.nick}</span>

            {isUnmatched && onPickMember && members.length > 0 && (
              <select
                value=""
                onChange={(e) => e.target.value && onPickMember(row.id, e.target.value)}
                style={{
                  ...selectStyle(t),
                  fontSize: 10,
                  padding: "2px 6px",
                  marginTop: 3,
                  minWidth: 120,
                }}
              >
                <option value="" style={optionStyle(t)}>
                  길드원 선택...
                </option>
                {members.map((m) => (
                  <option key={m.id} value={m.id} style={optionStyle(t)}>
                    {m.nick}
                  </option>
                ))}
              </select>
            )}

            {isFuzzy && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <span style={{ fontSize: 9, color: t.accent }}>
                  → {row.matchedNick} ({row.matchScore}%)
                </span>
                {onPickMember && (
                  <button
                    onClick={() => onPickMember(row.id, "")}
                    style={{
                      fontSize: 9,
                      padding: "0 5px",
                      background: "transparent",
                      border: `0.5px solid ${t.border}`,
                      borderRadius: 3,
                      color: t.textMuted,
                      cursor: "pointer",
                    }}
                  >
                    변경
                  </button>
                )}
              </div>
            )}

            {isMatched && row.matchKind === "exact" && row.matchedNick && row.matchedNick !== row.nick && (
              <span style={{ fontSize: 9, color: t.textMuted, marginTop: 1 }}>
                → {row.matchedNick}
              </span>
            )}
          </div>
        </div>
      </td>
      <td style={{ padding: "8px 6px", fontSize: 11, color: t.textSub }}>{row.job}</td>
      <td style={{ padding: "8px 6px" }}>
        {editing ? (
          <input
            autoFocus
            value={wVal}
            onChange={(e) => setWVal(e.target.value)}
            style={{
              width: 64,
              padding: "3px 6px",
              borderRadius: 5,
              border: `1px solid ${t.borderStrong}`,
              background: t.inputBg,
              color: t.text,
              fontSize: 12,
              fontFamily: "'Courier New',monospace",
              outline: "none",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onEdit(row.id, wVal);
                setEditing(false);
              }
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <span
            style={{ fontSize: 13, fontWeight: 500, color: t.text, cursor: "pointer" }}
            onDoubleClick={() => setEditing(true)}
          >
            {row.weekly}
            {row.warn && (
              <span style={{ fontSize: 9, color: "#d4a017", marginLeft: 4 }}>확인필요</span>
            )}
          </span>
        )}
      </td>
      <td style={{ padding: "8px 6px", fontSize: 12, color: t.textSub }}>
        {row.accum.toLocaleString()}
      </td>
      <td style={{ padding: "8px 6px" }}>
        <span
          style={{
            fontSize: 10,
            padding: "2px 7px",
            borderRadius: 20,
            background: `${gradeColor(row.grade)}18`,
            color: gradeColor(row.grade),
            fontWeight: 500,
            border: `1px solid ${gradeColor(row.grade)}44`,
          }}
        >
          {row.grade}
        </span>
      </td>
      <td style={{ padding: "8px 10px", minWidth: 120 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ flex: 1, height: 4, background: t.pBg, borderRadius: 2 }}>
            <div
              style={{
                height: 4,
                width: `${row.conf}%`,
                background: confColor(row.conf),
                borderRadius: 2,
              }}
            />
          </div>
          <span
            style={{ fontSize: 11, fontWeight: 500, color: confColor(row.conf), minWidth: 28 }}
          >
            {row.conf}%
          </span>
        </div>
      </td>
      <td style={{ padding: "8px 6px" }}>
        {isUnmatched ? (
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 20,
              background: "rgba(255,91,91,0.12)",
              color: t.dn,
              border: `1px solid ${t.dn}44`,
            }}
          >
            매칭 필요
          </span>
        ) : row.warn ? (
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 20,
              background: "rgba(239,159,39,0.12)",
              color: "#d4a017",
              border: "1px solid rgba(239,159,39,0.3)",
            }}
          >
            검토 필요
          </span>
        ) : (
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 20,
              background: t.upBg,
              color: t.up,
              border: `1px solid ${t.up}44`,
            }}
          >
            정상
          </span>
        )}
      </td>
    </tr>
  );
}
