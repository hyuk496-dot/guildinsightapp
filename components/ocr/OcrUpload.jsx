'use client';
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { OcrRow } from "./OcrRow";
import { ROUTES } from "@/lib/navigation";
import { selectStyle, optionStyle } from "@/lib/styles";
import { attachMemberIds, summarizeOcrRows } from "@/lib/ocr-parse";
import { weekMondayUtcIso } from "@/lib/week-utils";

export function OcrUpload({
  t,
  guilds,
  contents,
  membersData,
  ocrSession,
  defaultGuildId,
  refreshScores,
  refreshContribs,
}) {
  const [rows, setRows] = useState([]);
  const [checked, setChecked] = useState({});
  const [saveContent, setSaveContent] = useState(contents[0] || "총력전");
  const [saveGuildId, setSaveGuildId] = useState(defaultGuildId ?? guilds[0]?.id);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterWarn, setFilterWarn] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  const metaLabel = ocrSession
    ? `${ocrSession.fileName} · ${ocrSession.completedAt}`
    : "스캔 결과 없음 — 이미지를 업로드해 주세요";

  const members =
    membersData[saveGuildId] || membersData[String(saveGuildId)] || [];

  useEffect(() => {
    if (defaultGuildId != null) setSaveGuildId(defaultGuildId);
  }, [defaultGuildId]);

  useEffect(() => {
    if (!ocrSession?.rows?.length) {
      setRows([]);
      return;
    }
    const guildMembers =
      membersData[saveGuildId] || membersData[String(saveGuildId)] || [];
    setRows(attachMemberIds(ocrSession.rows, guildMembers));
    setChecked({});
  }, [ocrSession, saveGuildId, membersData]);

  const summary = useMemo(() => summarizeOcrRows(rows), [rows]);
  const warnCount = summary.warnCount;
  const unmatchedCount = useMemo(
    () => rows.filter((r) => r.memberId == null).length,
    [rows]
  );
  const fuzzyCount = useMemo(
    () => rows.filter((r) => r.memberId != null && r.matchKind === "fuzzy").length,
    [rows]
  );
  const avgConf = ocrSession?.avgConf ?? summary.avgConf;
  const checkedIds = Object.keys(checked).filter((k) => checked[k]);
  const allChecked = rows.length > 0 && checkedIds.length === rows.length;
  const displayRows = filterWarn ? rows.filter((r) => r.warn) : rows;

  const toggleAll = () => {
    if (allChecked) setChecked({});
    else setChecked(Object.fromEntries(rows.map((r) => [String(r.id), true])));
  };

  const toggleOne = (id, v) => setChecked((p) => ({ ...p, [String(id)]: v }));

  const editRow = (id, val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    setRows((p) => p.map((r) => (String(r.id) === String(id) ? { ...r, weekly: num } : r)));
  };

  const handlePickMember = (rowId, memberIdRaw) => {
    setRows((prev) =>
      prev.map((r) => {
        if (String(r.id) !== String(rowId)) return r;
        if (!memberIdRaw) {
          return {
            ...r,
            memberId: null,
            matchedNick: null,
            matchKind: "none",
            matchScore: 0,
            warn: true,
          };
        }
        const member = members.find((m) => String(m.id) === String(memberIdRaw));
        if (!member) return r;
        return {
          ...r,
          memberId: Number(member.id),
          matchedNick: member.nick,
          matchKind: "exact",
          matchScore: 100,
          job: member.job || r.job,
          conf: Math.max(r.conf || 0, 95),
          warn: false,
        };
      })
    );
  };

  const handleSave = async () => {
    const toSave = rows.filter((r) => checkedIds.includes(String(r.id)));
    if (!toSave.length) {
      alert("저장할 항목을 선택해주세요.");
      return;
    }

    const unmatched = toSave.filter((r) => r.memberId == null);
    if (unmatched.length) {
      alert(
        `매칭이 안 된 항목 ${unmatched.length}개가 선택되어 있습니다.\n` +
          `(${unmatched.map((r) => r.nick).join(", ")})\n\n` +
          "각 행의 '길드원 선택' 드롭다운에서 길드원을 지정한 뒤 다시 저장해 주세요. " +
          "길드원이 없다면 '길드원 관리'에서 먼저 등록해야 합니다."
      );
      return;
    }

    setSaving(true);
    let ok = 0;
    const failed = [];

    try {
      for (const r of toSave) {
        const targetMember = members.find(
          (m) => Number(m.id) === Number(r.memberId)
        );
        const res = await fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            member_id: Number(r.memberId),
            guild_id: Number(saveGuildId),
            nick: r.nick,
            job: targetMember?.job || r.job || "—",
            content_name: saveContent,
            score: Number(r.weekly),
            prev_score: Number(r.accum) || 0,
            created_at: weekMondayUtcIso(),
          }),
        });
        if (res.ok) ok += 1;
        else failed.push(r.nick);
      }

      if (ok > 0) {
        await refreshScores?.();
        await refreshContribs?.();
        setSaved(true);
        setChecked({});
        setTimeout(() => setSaved(false), 2500);
      }

      if (failed.length) {
        alert(`일부 저장 실패: ${failed.join(", ")}`);
      } else if (ok === 0) {
        alert("저장에 실패했습니다. 서버 로그를 확인해 주세요.");
      }
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!ocrSession?.rows?.length) {
    return (
      <div style={{ flex: 1, padding: "24px 28px", color: t.textMuted, fontSize: 13 }}>
        <p style={{ marginBottom: 12 }}>OCR 스캔 결과가 없습니다.</p>
        <Link href={ROUTES.ocrUpload} style={{ color: t.accent, fontSize: 12 }}>
          이미지 업로드 →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          padding: "12px 20px",
          borderBottom: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          background: t.navBg,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>OCR 인식 결과</div>
          <div style={{ fontSize: 10, color: t.textMuted }}>{metaLabel}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setFilterWarn((v) => !v)}
          style={{
            fontSize: 11,
            padding: "5px 12px",
            border: `1px solid ${filterWarn ? t.borderStrong : t.border}`,
            borderRadius: 7,
            background: filterWarn ? t.accentFaint : "transparent",
            color: filterWarn ? t.accent : t.textSub,
            cursor: "pointer",
            fontFamily: "'Courier New',monospace",
          }}
        >
          오류만 보기 {warnCount > 0 && `(${warnCount})`}
        </button>
        {ocrSession?.rawText && (
          <button
            onClick={() => setShowRawText((v) => !v)}
            style={{
              fontSize: 11,
              padding: "5px 12px",
              border: `1px solid ${showRawText ? t.borderStrong : t.border}`,
              borderRadius: 7,
              background: showRawText ? t.accentFaint : "transparent",
              color: showRawText ? t.accent : t.textSub,
              cursor: "pointer",
              fontFamily: "'Courier New',monospace",
            }}
          >
            {showRawText ? "원문 닫기" : "원문 보기"}
          </button>
        )}
        <Link
          href={ROUTES.ocrUpload}
          style={{
            fontSize: 11,
            padding: "5px 12px",
            border: `1px solid ${t.border}`,
            borderRadius: 7,
            background: "transparent",
            color: t.textSub,
            cursor: "pointer",
            fontFamily: "'Courier New',monospace",
            textDecoration: "none",
          }}
        >
          다시 업로드
        </Link>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
        {showRawText && ocrSession?.rawText && (
          <div
            style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 9,
              padding: "12px 14px",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, color: t.text }}>
                Google Vision 원문 텍스트
              </div>
              <span style={{ fontSize: 10, color: t.textMuted }}>
                {ocrSession.rawText.split("\n").length}줄
              </span>
            </div>
            <pre
              style={{
                margin: 0,
                fontSize: 11,
                color: t.textSub,
                fontFamily: "'Courier New',monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxHeight: 200,
                overflowY: "auto",
                background: t.bgAlt,
                padding: "8px 10px",
                borderRadius: 6,
                border: `0.5px solid ${t.border}`,
              }}
            >
              {ocrSession.rawText}
            </pre>
          </div>
        )}

        {(unmatchedCount > 0 || fuzzyCount > 0) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "rgba(239,159,39,0.08)",
              border: "1px solid rgba(239,159,39,0.3)",
              borderRadius: 9,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 12, color: "#8a5200" }}>
              {unmatchedCount > 0 && (
                <>
                  매칭 안 된 닉네임 <strong>{unmatchedCount}개</strong>
                  {fuzzyCount > 0 ? " · " : ""}
                </>
              )}
              {fuzzyCount > 0 && (
                <>
                  유사 매칭 <strong>{fuzzyCount}개</strong>
                </>
              )}
              {" — 닉네임 셀에서 길드원을 직접 선택하거나 매칭을 변경하세요."}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 11, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 10 }}>업로드 이미지</div>
            <div
              style={{
                background: t.bgAlt,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                aspectRatio: "4/3",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {ocrSession.preview ? (
                <img
                  src={ocrSession.preview}
                  alt="OCR source"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <span style={{ fontSize: 11, color: t.textMuted }}>미리보기 없음</span>
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: t.textSub }}>
              Google Vision API · {ocrSession.processingMs ? `${(ocrSession.processingMs / 1000).toFixed(1)}s` : "—"}
            </div>
          </div>

          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 11, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 12 }}>인식 요약</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { label: "인식된 항목", value: `${rows.length}명`, alert: false },
                { label: "평균 신뢰도", value: `${avgConf}%`, alert: false },
                { label: "매칭 필요", value: `${unmatchedCount}개`, alert: unmatchedCount > 0 },
                { label: "유사 매칭", value: `${fuzzyCount}개`, alert: fuzzyCount > 0 },
              ].map((it) => (
                <div key={it.label} style={{ background: t.bgAlt, borderRadius: 7, padding: "9px 10px" }}>
                  <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 3 }}>{it.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: it.alert ? "#d4a017" : t.text }}>
                    {it.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 11,
            overflow: "hidden",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              padding: "11px 14px",
              borderBottom: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>인식 데이터 검토 및 수정</div>
              <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>
                더블클릭으로 점수 수정 · 저장 시 Supabase scores 테이블에 반영
              </div>
            </div>
            <button
              onClick={toggleAll}
              style={{
                fontSize: 11,
                padding: "4px 10px",
                border: `1px solid ${t.border}`,
                borderRadius: 6,
                background: "transparent",
                color: t.textSub,
                cursor: "pointer",
                fontFamily: "'Courier New',monospace",
              }}
            >
              {allChecked ? "전체 해제" : "전체 선택"}
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: t.bgAlt }}>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ cursor: "pointer" }} />
                  </th>
                  {["#", "닉네임", "직업", "주간 점수", "누적 점수", "등급", "신뢰도", "상태"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "7px 8px",
                        textAlign: "left",
                        fontSize: 10,
                        color: t.textMuted,
                        fontWeight: 500,
                        letterSpacing: "0.06em",
                        borderBottom: `0.5px solid ${t.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, i) => (
                  <OcrRow
                    key={String(row.id)}
                    t={t}
                    row={row}
                    idx={i}
                    checked={!!checked[String(row.id)]}
                    onCheck={toggleOne}
                    onEdit={editRow}
                    members={members}
                    onPickMember={handlePickMember}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div
          style={{
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 11,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 11, color: t.textMuted }}>{checkedIds.length}개 선택됨</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: t.textMuted }}>저장 길드:</span>
            <select
              value={saveGuildId}
              onChange={(e) => setSaveGuildId(+e.target.value)}
              style={{ ...selectStyle(t), padding: "5px 9px", fontSize: 11, minWidth: 120 }}
            >
              {guilds.map((g) => (
                <option key={g.id} value={g.id} style={optionStyle(t)}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: t.textMuted }}>저장 컨텐츠:</span>
            <select
              value={saveContent}
              onChange={(e) => setSaveContent(e.target.value)}
              style={{ ...selectStyle(t), padding: "5px 9px", fontSize: 11, minWidth: 100 }}
            >
              {contents.map((c) => (
                <option key={c} value={c} style={optionStyle(t)}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !checkedIds.length}
            style={{
              fontSize: 12,
              padding: "6px 16px",
              border: `1px solid ${saved ? "rgba(76,255,145,0.5)" : t.borderStrong}`,
              borderRadius: 7,
              background: saved ? t.upBg : t.accentFaint,
              color: saved ? t.up : t.accent,
              cursor: saving || !checkedIds.length ? "not-allowed" : "pointer",
              fontFamily: "'Courier New',monospace",
              fontWeight: 500,
              opacity: saving || !checkedIds.length ? 0.6 : 1,
            }}
          >
            {saving
              ? "저장 중..."
              : saved
                ? `✓ ${saveContent}에 저장됨`
                : `선택 항목 → ${saveContent} 저장`}
          </button>
        </div>
      </div>
    </div>
  );
}
