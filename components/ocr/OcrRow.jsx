'use client';
import { useState, useEffect } from "react";
import { selectStyle, optionStyle } from "@/lib/styles";

export function OcrRow({ t, row, idx, checked, onCheck, onEdit, members = [], onPickMember }) {
  const [editing, setEditing] = useState(false);
  const [wVal, setWVal] = useState(String(row.weekly ?? 0));

  // row.weekly 가 외부에서 갱신되거나(저장 / 새 스캔) 사용자가 편집을 새로 시작할 때
  // 인풋의 초기값을 다시 동기화한다.
  useEffect(() => {
    setWVal(String(row.weekly ?? 0));
  }, [row.weekly, editing]);

  const commitEdit = () => {
    // 사용자가 "10,300,222" 처럼 콤마 형태로 타이핑해도 안전하게 처리.
    // 알파벳 접미사(Q 등) 도 함께 제거.
    const cleaned = String(wVal || "").replace(/[^\d]/g, "");
    if (cleaned === "") {
      setWVal(String(row.weekly ?? 0));
      setEditing(false);
      return;
    }
    const num = parseInt(cleaned, 10);
    if (Number.isNaN(num) || num < 0) {
      setWVal(String(row.weekly ?? 0));
      setEditing(false);
      return;
    }
    if (num !== Number(row.weekly ?? 0)) {
      onEdit(row.id, num);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setWVal(String(row.weekly ?? 0));
    setEditing(false);
  };

  const confColor = (c) => (c >= 90 ? t.up : c >= 80 ? "#d4a017" : t.dn);

  const isMatched = row.memberId != null;
  const isFuzzy = isMatched && row.matchKind === "fuzzy";
  const isUnmatched = !isMatched;
  const isSaved = row.status === "saved";

  const rowBg = isSaved
    ? "rgba(52,211,153,0.06)"
    : row.warn
      ? "rgba(239,159,39,0.04)"
      : checked
        ? "rgba(0,200,255,0.04)"
        : "transparent";

  const rankDisplay = row.rank != null ? row.rank : idx + 1;
  const isOcrRank = row.rank != null;

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
      <td style={{ padding: "8px 6px", textAlign: "center", minWidth: 36 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: isOcrRank ? t.accent : t.textMuted,
            fontFamily: "'Courier New',monospace",
          }}
          title={isOcrRank ? "이미지에서 인식한 순위" : "행 인덱스 (이미지에 순위 표기 없음)"}
        >
          {rankDisplay}
        </span>
      </td>
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

            {isUnmatched && onPickMember && (
              members.length > 0 ? (
                <select
                  value=""
                  onChange={(e) => e.target.value && onPickMember(row.id, e.target.value)}
                  style={{
                    ...selectStyle(t),
                    fontSize: 10,
                    padding: "2px 6px",
                    marginTop: 3,
                    minWidth: 140,
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
              ) : (
                <span
                  style={{
                    fontSize: 9,
                    color: t.dn,
                    marginTop: 3,
                    lineHeight: 1.4,
                  }}
                  title="저장 길드에 등록된 길드원이 없습니다"
                >
                  길드원 미등록 — 사이드바 [길드원 관리]에서 추가
                </span>
              )
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
      <td style={{ padding: "8px 8px", minWidth: 120 }}>
        <span
          style={{
            fontSize: 11,
            color: row.serverGuild ? t.textSub : t.textMuted,
            wordBreak: "break-word",
          }}
        >
          {row.serverGuild || "—"}
        </span>
      </td>
      <td style={{ padding: "8px 8px", minWidth: 110 }}>
        {editing ? (
          <input
            autoFocus
            value={wVal}
            onChange={(e) => setWVal(e.target.value)}
            onBlur={commitEdit}
            inputMode="numeric"
            style={{
              width: 110,
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
                e.preventDefault();
                commitEdit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
            }}
          />
        ) : (
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: row.weekly > 0 ? t.text : t.textMuted,
              cursor: "pointer",
              fontFamily: "'Courier New',monospace",
            }}
            onDoubleClick={() => setEditing(true)}
            title="더블클릭으로 점수 수정"
          >
            {row.weekly > 0 ? Number(row.weekly).toLocaleString() : "—"}
            {row.warn && row.weekly > 0 && !isSaved && (
              <span style={{ fontSize: 9, color: "#d4a017", marginLeft: 4 }}>확인필요</span>
            )}
          </span>
        )}
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
        {isSaved ? (
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 20,
              background: "rgba(52,211,153,0.18)",
              color: "#34d399",
              border: "1px solid rgba(52,211,153,0.45)",
              fontWeight: 500,
            }}
            title="DB에 저장 완료됨"
          >
            ✓ 저장함
          </span>
        ) : isUnmatched ? (
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
            확인필요
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
