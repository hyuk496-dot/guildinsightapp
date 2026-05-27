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
  const [saveContent, setSaveContent] = useState(
    ocrSession?.contentName || contents[0] || "총력전"
  );
  const [saveGuildId, setSaveGuildId] = useState(
    ocrSession?.guildId ?? defaultGuildId ?? guilds[0]?.id
  );
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
    // 새 OCR 세션이 들어오면 사전 선택한 길드/컨텐츠로 자동 정렬
    if (ocrSession?.guildId != null) {
      setSaveGuildId(ocrSession.guildId);
    } else if (defaultGuildId != null) {
      setSaveGuildId(defaultGuildId);
    }
    if (ocrSession?.contentName) {
      setSaveContent(ocrSession.contentName);
    }
  }, [ocrSession?.guildId, ocrSession?.contentName, defaultGuildId]);

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
  const savedCount = useMemo(
    () => rows.filter((r) => r.status === "saved").length,
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

  const clearSavedStatus = (row) => {
    if (row.status !== "saved") return row;
    const { status: _s, ...rest } = row;
    return rest;
  };

  const editRow = (id, val) => {
    // val 은 number 또는 string. string 일 경우 콤마/알파벳/공백 제거 후 정수로.
    const cleaned =
      typeof val === "number"
        ? String(val)
        : String(val || "").replace(/[^\d]/g, "");
    if (cleaned === "") return;
    const num = parseInt(cleaned, 10);
    if (Number.isNaN(num) || num < 0) return;
    setRows((p) =>
      p.map((r) => {
        if (String(r.id) !== String(id)) return r;
        const next = clearSavedStatus(r);
        return { ...next, weekly: num, warn: false };
      })
    );
  };

  const handlePickMember = (rowId, memberIdRaw) => {
    setRows((prev) =>
      prev.map((r) => {
        if (String(r.id) !== String(rowId)) return r;
        const base = clearSavedStatus(r);
        if (!memberIdRaw) {
          return {
            ...base,
            memberId: null,
            matchedNick: null,
            matchKind: "none",
            matchScore: 0,
            warn: true,
          };
        }
        const member = members.find((m) => String(m.id) === String(memberIdRaw));
        if (!member) return base;
        return {
          ...base,
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
    const savedRowIds = [];

    try {
      for (const r of toSave) {
        const targetMember = members.find(
          (m) => Number(m.id) === Number(r.memberId)
        );
        // 저장 닉네임 우선순위:
        //  1) DB 의 정확한 길드원 닉네임 (드롭다운에서 매칭된 멤버)
        //  2) 자동 매칭으로 잡힌 matchedNick
        //  3) 마지막 폴백 — OCR 원문 닉네임
        const finalNick = targetMember?.nick || r.matchedNick || r.nick;

        const res = await fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            member_id: Number(r.memberId),
            guild_id: Number(saveGuildId),
            nick: finalNick,
            job: targetMember?.job || r.job || "—",
            content_name: saveContent,
            score: Number(r.weekly),
            prev_score: Number(r.accum) || 0,
            created_at: weekMondayUtcIso(),
          }),
        });
        if (res.ok) {
          ok += 1;
          savedRowIds.push(String(r.id));
        } else {
          failed.push(finalNick);
        }
      }

      if (savedRowIds.length > 0) {
        setRows((prev) =>
          prev.map((r) =>
            savedRowIds.includes(String(r.id))
              ? { ...r, status: "saved", warn: false }
              : r
          )
        );
        setChecked((prev) => {
          const next = { ...prev };
          savedRowIds.forEach((id) => {
            delete next[id];
          });
          return next;
        });
      }

      if (ok > 0) {
        await refreshScores?.();
        await refreshContribs?.();
        setSaved(true);
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
      <div className="flex flex-1 flex-col items-center justify-center min-h-[450px] px-6 py-12">
        <svg
          className="mb-6 h-16 w-16 text-blue-400 opacity-40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <circle cx="11.5" cy="14.5" r="2.5" />
          <path d="M13.5 16.5L16 19" />
        </svg>
        <h2 className="text-center text-xl font-semibold text-slate-800 dark:text-slate-100">
          아직 불러온 스캔 결과가 없습니다
        </h2>
        <p className="mt-3 mb-8 max-w-md text-center text-sm text-slate-400 leading-relaxed">
          인게임 결과 스크린샷이나 엑셀 데이터를 업로드하면 AI가 점수를 분석하여 대시보드에
          반영합니다.
        </p>
        <Link
          href={ROUTES.ocrUpload}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-600/10 px-5 py-2.5 font-medium text-blue-400 transition-all hover:border-blue-400/50 hover:bg-blue-600 hover:text-white"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          데이터 가져오기
          <span className="text-blue-300/80" aria-hidden>
            +
          </span>
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
          <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>
            {ocrSession?.sourceType === "excel" ? "엑셀 가져오기 결과" : "OCR 인식 결과"}
          </div>
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

        {(unmatchedCount > 0 || fuzzyCount > 0 || members.length === 0) && (
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
            <div style={{ fontSize: 12, color: "#8a5200", lineHeight: 1.6 }}>
              {members.length === 0 && (
                <div style={{ marginBottom: unmatchedCount > 0 ? 6 : 0 }}>
                  현재 저장 길드에 등록된 길드원이 없습니다. 사이드바{" "}
                  <strong>[길드원 관리]</strong>에서 길드원을 먼저 등록하면 닉네임 옆
                  드롭다운으로 매칭할 수 있습니다.
                </div>
              )}
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
              {unmatchedCount > 0 &&
                members.length > 0 &&
                " — 닉네임 셀에서 길드원을 직접 선택하거나 매칭을 변경하세요."}
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {[
                { label: "인식된 항목", value: `${rows.length}명`, alert: false },
                { label: "평균 신뢰도", value: `${avgConf}%`, alert: false },
                { label: "저장 완료", value: `${savedCount}명`, alert: false, highlight: savedCount > 0 },
                { label: "매칭 필요", value: `${unmatchedCount}개`, alert: unmatchedCount > 0 },
                { label: "유사 매칭", value: `${fuzzyCount}개`, alert: fuzzyCount > 0 },
              ].map((it) => (
                <div key={it.label} style={{ background: t.bgAlt, borderRadius: 7, padding: "9px 10px" }}>
                  <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 3 }}>{it.label}</div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: it.alert ? "#d4a017" : it.highlight ? "#34d399" : t.text,
                    }}
                  >
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
                점수 칸 더블클릭으로 수정 · 매칭 안 된 닉네임은 길드원 선택으로 정합 후 저장
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
                  {["순위", "닉네임", "소속길드", "점수", "신뢰도", "상태"].map((h) => (
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
          <div style={{ fontSize: 11, color: t.textMuted }}>
            {checkedIds.length}개 선택됨
            {savedCount > 0 && (
              <span style={{ marginLeft: 8, color: "#34d399" }}>
                · 저장함 {savedCount}명
              </span>
            )}
          </div>
          {(ocrSession?.guildId != null || ocrSession?.contentName) && (
            <span
              style={{
                fontSize: 9,
                padding: "2px 8px",
                background: t.accentFaint,
                border: `1px solid ${t.borderStrong}`,
                color: t.accent,
                borderRadius: 20,
                fontFamily: "'Courier New',monospace",
              }}
              title="업로드 화면에서 사전 선택한 값이 자동 적용되었습니다"
            >
              ✓ 사전 선택 적용됨
            </span>
          )}
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
