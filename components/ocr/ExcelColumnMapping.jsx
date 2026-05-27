'use client';
import { selectStyle, optionStyle } from "@/lib/styles";
import { EXCEL_DB_FIELDS, SKIP_VALUE } from "@/lib/excel-import";

export function ExcelColumnMapping({ t, headers, mapping, onMappingChange, previewRows = [] }) {
  const headerOptions = [SKIP_VALUE, ...headers];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          background: t.accentFaint,
          border: `1px solid ${t.borderStrong}`,
          fontSize: 11,
          color: t.accent,
          lineHeight: 1.6,
        }}
      >
        <strong>[자동 감지]</strong> 엑셀 파일이 감지되었습니다. 아래에서 엑셀 헤더와 DB 필드를
        연결한 뒤 <strong>데이터 가져오기</strong>를 눌러 주세요.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {EXCEL_DB_FIELDS.map(({ key, label, required }) => (
          <div key={key}>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>
              {label}
              {required && <span style={{ color: t.dn, marginLeft: 2 }}>*</span>}
            </div>
            <select
              value={mapping[key] ?? SKIP_VALUE}
              onChange={(e) => onMappingChange(key, e.target.value)}
              style={{ ...selectStyle(t), width: "100%", padding: "7px 10px", fontSize: 12 }}
            >
              {headerOptions.map((h) => (
                <option key={`${key}-${h}`} value={h} style={optionStyle(t)}>
                  {h === SKIP_VALUE ? "— (매핑 안 함) —" : h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {previewRows.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 6 }}>
            미리보기 (상위 {Math.min(previewRows.length, 5)}행)
          </div>
          <div
            style={{
              overflowX: "auto",
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              maxHeight: 140,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr style={{ background: t.bgAlt }}>
                  {headers.map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "6px 8px",
                        textAlign: "left",
                        color: t.textMuted,
                        borderBottom: `1px solid ${t.border}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(0, 5).map((row, ri) => (
                  <tr key={ri}>
                    {headers.map((h, ci) => (
                      <td
                        key={`${ri}-${h}`}
                        style={{
                          padding: "5px 8px",
                          borderBottom: `1px solid ${t.border}`,
                          color: t.text,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {String(row[ci] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
