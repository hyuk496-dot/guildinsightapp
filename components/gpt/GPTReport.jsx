'use client';
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { Tag } from "@/components/shared/Tag";
import { selectStyle, optionStyle } from "@/lib/styles";
import { CONTENTS_INIT } from "@/lib/mock-data";
import { exportElementToPdf } from "@/lib/export-report-pdf";
import { useToast } from "@/components/shared/Toast";
import { ADMIN_EMAIL } from "@/lib/ocr-quota";
import { useGuildInsight } from "@/context/GuildInsightProvider";

export function GPTReport({ t, guilds = [], activeGuild }) {
  const { user } = useGuildInsight();
  const { showToast } = useToast();
  const [guildId, setGuildId] = useState(activeGuild?.id ?? guilds[0]?.id);
  const [rptContent, setRptContent] = useState("전체");
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [notice, setNotice] = useState(null);
  const reportPdfRef = useRef(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const proOnlyMsg =
    "해당 기능은 PRO 구독자 전용 기능입니다. 정식 결제 후 이용해 주세요.";

  const contentOptions = ["전체", ...CONTENTS_INIT];

  useEffect(() => {
    if (activeGuild?.id) setGuildId(activeGuild.id);
  }, [activeGuild?.id]);

  const fetchReports = async (gid) => {
    if (!gid) return;
    setLoading(true);
    setError(null);
    setTableMissing(false);
    try {
      const res = await fetch(`/api/reports?guild_id=${gid}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "TABLE_MISSING") {
          setTableMissing(true);
          setReports([]);
          setSelected(null);
          return;
        }
        throw new Error(data.error || "리포트 조회 실패");
      }
      const list = Array.isArray(data) ? data : [];
      setReports(list);
      setSelected(list[0] || null);
    } catch (err) {
      setError(err.message);
      setReports([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(guildId);
  }, [guildId]);

  const generate = async (mode = "auto") => {
    if (!guildId) {
      alert("길드를 먼저 선택하세요.");
      return;
    }
    setGenerating(true);
    setProgress(8);
    setError(null);
    setNotice(null);

    const iv = setInterval(() => {
      setProgress((p) => (p >= 88 ? p : p + 4));
    }, 400);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guild_id: guildId, content_filter: rptContent, mode }),
      });
      const data = await res.json().catch(() => ({}));
      clearInterval(iv);

      if (!res.ok) {
        if (data.code === "TABLE_MISSING") {
          setTableMissing(true);
          throw new Error(data.error);
        }
        if (data.code === "QUOTA_EXCEEDED" || data.code === "INVALID_KEY") {
          throw new Error(data.error);
        }
        throw new Error(data.error || "리포트 생성 실패");
      }

      setProgress(100);
      if (data.fallback) {
        const reasonLabel =
          data.fallbackReason === "FORCED_LOCAL"
            ? "사용자가 데모(로컬) 모드로 생성했습니다."
            : data.fallbackReason === "QUOTA_EXCEEDED"
            ? "OpenAI 사용량 한도 초과 → 로컬 fallback으로 자동 생성했습니다."
            : data.fallbackReason === "RATE_LIMITED"
            ? "OpenAI 일시 한도 초과 → 로컬 fallback으로 자동 생성했습니다."
            : data.fallbackReason === "MISSING_KEY"
            ? "OPENAI_API_KEY 누락 → 로컬 fallback으로 자동 생성했습니다."
            : data.fallbackReason === "INVALID_KEY"
            ? "OpenAI 키 인증 실패 → 로컬 fallback으로 자동 생성했습니다."
            : "OpenAI 호출 실패 → 로컬 fallback으로 자동 생성했습니다.";
        setNotice({ kind: "warn", message: reasonLabel, detail: data.fallbackMessage });
      }
      await fetchReports(guildId);
      setSelected(data);
    } catch (err) {
      setError(err.message);
      alert(err.message);
    } finally {
      clearInterval(iv);
      setGenerating(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  const removeReport = async (id) => {
    if (!confirm("이 리포트를 삭제할까요?")) return;
    try {
      const res = await fetch(`/api/reports?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "삭제 실패");
      }
      const updated = reports.filter((r) => r.id !== id);
      setReports(updated);
      if (selected?.id === id) setSelected(updated[0] || null);
    } catch (err) {
      alert(err.message);
    }
  };

  const fmtSummary = (s) => (s || "").slice(0, 55) + ((s || "").length > 55 ? "..." : "");

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* LIST */}
      <div
        style={{
          width: 290,
          flexShrink: 0,
          borderRight: `1px solid ${t.border}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${t.border}` }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              gap: 6,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>GPT 리포트</div>
            <Link
              href="/gptreport/compare"
              style={{
                fontSize: 10,
                padding: "3px 9px",
                borderRadius: 20,
                background: `linear-gradient(135deg, ${t.accent} 0%, ${t.up} 100%)`,
                color: "#04101c",
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}
              title="로컬 데모 vs AI 프리미엄 리포트 비교"
            >
              ✦ Premium
            </Link>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 5, letterSpacing: "0.08em" }}>대상 길드</div>
            <select
              value={guildId ?? ""}
              onChange={(e) => setGuildId(+e.target.value)}
              style={{ ...selectStyle(t), width: "100%", fontSize: 11 }}
            >
              {guilds.map((g) => (
                <option key={g.id} value={g.id} style={optionStyle(t)}>
                  {g.name} ({g.game_name || g.game || "—"})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 5, letterSpacing: "0.08em" }}>분석 기준 컨텐츠</div>
            <select
              value={rptContent}
              onChange={(e) => setRptContent(e.target.value)}
              style={{ ...selectStyle(t), width: "100%", fontSize: 11 }}
            >
              {contentOptions.map((c) => (
                <option key={c} value={c} style={optionStyle(t)}>
                  {c === "전체" ? "전체 통합" : `▶ ${c}`}
                </option>
              ))}
            </select>
            {rptContent !== "전체" && (
              <div
                style={{
                  marginTop: 6,
                  padding: "6px 10px",
                  background: t.accentFaint,
                  border: `1px solid ${t.borderStrong}`,
                  borderRadius: 7,
                  fontSize: 10,
                  color: t.accentDim,
                }}
              >
                ⚡ <strong style={{ color: t.accent }}>{rptContent}</strong> 기준 분석 리포트
              </div>
            )}
          </div>

          <button
            onClick={() => generate("auto")}
            disabled={generating || !guildId}
            style={{
              width: "100%",
              padding: "8px",
              border: `1px solid ${t.borderStrong}`,
              borderRadius: 8,
              background: t.accentFaint,
              color: t.accent,
              cursor: generating ? "wait" : guildId ? "pointer" : "not-allowed",
              opacity: guildId ? 1 : 0.5,
              fontFamily: "'Courier New',monospace",
              fontSize: 12,
              fontWeight: 500,
              transition: "all 0.2s",
            }}
          >
            {generating
              ? `⟳ OpenAI 생성 중... ${progress}%`
              : `✦ GPT 리포트 생성 ${rptContent !== "전체" ? "(" + rptContent + ")" : ""}`}
          </button>

          <button
            onClick={() => generate("local")}
            disabled={generating || !guildId}
            style={{
              width: "100%",
              padding: "6px",
              marginTop: 6,
              border: `1px dashed ${t.border}`,
              borderRadius: 8,
              background: "transparent",
              color: t.textSub,
              cursor: generating ? "wait" : guildId ? "pointer" : "not-allowed",
              opacity: guildId ? 1 : 0.5,
              fontFamily: "'Courier New',monospace",
              fontSize: 10,
              transition: "all 0.2s",
            }}
            title="OpenAI를 호출하지 않고 길드 데이터 기반으로 결정론적 리포트를 생성합니다."
          >
            ◇ 로컬(데모) 리포트 생성 — OpenAI 미사용
          </button>

          {generating && (
            <div style={{ marginTop: 8, height: 3, background: t.pBg, borderRadius: 2 }}>
              <div
                style={{
                  height: 3,
                  width: `${progress}%`,
                  background: t.pBar,
                  borderRadius: 2,
                  transition: "width 0.1s",
                }}
              />
            </div>
          )}

          {notice && (
            <div
              style={{
                marginTop: 8,
                padding: "8px 10px",
                background: "rgba(255,176,46,0.12)",
                border: "1px solid rgba(255,176,46,0.4)",
                borderRadius: 7,
                fontSize: 10,
                color: t.text,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: 2 }}>⚠ {notice.message}</div>
              {notice.detail && (
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 2 }}>{notice.detail}</div>
              )}
              <Link
                href="/gptreport/compare"
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  fontSize: 10,
                  color: t.accent,
                  textDecoration: "underline",
                }}
              >
                AI 프리미엄과 비교 보기 →
              </Link>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {tableMissing && (
            <div
              style={{
                padding: "10px 12px",
                background: "rgba(255,91,91,0.08)",
                border: "1px solid rgba(255,91,91,0.3)",
                borderRadius: 8,
                fontSize: 11,
                color: t.dn,
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: 4 }}>gpt_reports 테이블이 없습니다</div>
              <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 6 }}>
                Supabase Dashboard → SQL Editor에서 아래 파일을 실행하세요:
                <br />
                <code style={{ color: t.accent }}>supabase/migrations/004_gpt_reports.sql</code>
              </div>
              <button
                onClick={async () => {
                  const sql = `CREATE TABLE IF NOT EXISTS gpt_reports (
  id              BIGSERIAL PRIMARY KEY,
  guild_id        INTEGER REFERENCES guilds(id) ON DELETE CASCADE,
  guild_name      TEXT,
  title           TEXT NOT NULL,
  date            TEXT,
  badge           TEXT,
  content_filter  TEXT DEFAULT '전체',
  summary         TEXT,
  sections        JSONB DEFAULT '[]'::jsonb,
  chips           JSONB DEFAULT '[]'::jsonb,
  metrics         JSONB DEFAULT '{}'::jsonb,
  model           TEXT,
  prompt_tokens   INTEGER,
  completion_tokens INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gpt_reports_guild_idx ON gpt_reports (guild_id);
CREATE INDEX IF NOT EXISTS gpt_reports_created_idx ON gpt_reports (created_at DESC);
NOTIFY pgrst, 'reload schema';`;
                  try {
                    await navigator.clipboard.writeText(sql);
                    alert("마이그레이션 SQL이 클립보드에 복사되었습니다.\nSupabase SQL Editor에 붙여넣고 Run 하세요.");
                  } catch {
                    alert("복사 실패. 파일에서 직접 복사해 주세요:\nsupabase/migrations/004_gpt_reports.sql");
                  }
                }}
                style={{
                  marginTop: 4,
                  padding: "5px 10px",
                  fontSize: 10,
                  background: t.accentFaint,
                  color: t.accent,
                  border: `1px solid ${t.borderStrong}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "'Courier New',monospace",
                }}
              >
                📋 SQL 복사
              </button>
              <button
                onClick={() => fetchReports(guildId)}
                style={{
                  marginTop: 4,
                  marginLeft: 6,
                  padding: "5px 10px",
                  fontSize: 10,
                  background: "transparent",
                  color: t.textSub,
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "'Courier New',monospace",
                }}
              >
                ↻ 다시 시도
              </button>
            </div>
          )}

          {!tableMissing && loading && (
            <div style={{ padding: "20px 8px", color: t.textMuted, fontSize: 11, textAlign: "center" }}>
              불러오는 중...
            </div>
          )}

          {!tableMissing && !loading && reports.length === 0 && !error && (
            <div
              style={{
                padding: "20px 12px",
                color: t.textMuted,
                fontSize: 11,
                textAlign: "center",
                border: `1px dashed ${t.border}`,
                borderRadius: 8,
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.4 }}>✦</div>
              저장된 리포트가 없습니다.
              <br />
              <span style={{ fontSize: 10 }}>위 버튼으로 시작하거나, </span>
              <Link
                href="/gptreport/compare"
                style={{ fontSize: 10, color: t.accent, textDecoration: "underline" }}
              >
                AI 프리미엄 알아보기
              </Link>
            </div>
          )}

          {!tableMissing && !loading && error && (
            <div
              style={{
                padding: "10px 12px",
                background: "rgba(255,91,91,0.08)",
                border: "1px solid rgba(255,91,91,0.3)",
                borderRadius: 8,
                fontSize: 11,
                color: t.dn,
              }}
            >
              {error}
            </div>
          )}

          {reports.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              style={{
                padding: "11px 12px",
                borderRadius: 9,
                background: selected?.id === r.id ? t.sideActive : t.bgCard,
                border: `1px solid ${selected?.id === r.id ? t.borderStrong : t.border}`,
                cursor: "pointer",
                marginBottom: 8,
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: selected?.id === r.id ? t.accent : t.text,
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.title}
                </span>
                {r.badge && <Tag bg={t.accentFaint} color={t.accent}>{r.badge}</Tag>}
              </div>
              <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>
                {r.date} · {r.guild_name || "—"} · {r.content_filter || "전체"}
              </div>
              <div style={{ fontSize: 10, color: t.textSub, lineHeight: 1.4 }}>{fmtSummary(r.summary)}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeReport(r.id);
                }}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  border: "none",
                  background: "transparent",
                  color: t.textMuted,
                  cursor: "pointer",
                  fontSize: 10,
                }}
                title="삭제"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* DETAIL */}
      <div style={{ flex: 1, overflowY: "auto", padding: "22px 26px" }}>
        {!selected && !generating && (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: t.textMuted,
              fontSize: 12,
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 30, opacity: 0.3 }}>✦</div>
            <div>좌측에서 리포트를 선택하거나 새로 생성하세요.</div>
          </div>
        )}

        {selected && (
          <>
            {/* 데모와 동일 위치: 상세 상단 우측 버튼 */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                onClick={async () => {
                  if (!isAdmin) {
                    showToast(proOnlyMsg);
                    return;
                  }
                  if (!reportPdfRef.current || pdfBusy) return;
                  setPdfBusy(true);
                  try {
                    reportPdfRef.current.scrollIntoView({ block: "start", behavior: "instant" });
                    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                    const safeName = String(selected.title || "report")
                      .replace(/[\\/:*?"<>|]/g, "")
                      .trim() || "report";
                    await exportElementToPdf(reportPdfRef.current, `${safeName}.pdf`, {
                      backgroundColor: t.bg,
                    });
                  } catch (e) {
                    showToast(e?.message || "PDF 저장에 실패했습니다.");
                  } finally {
                    setPdfBusy(false);
                  }
                }}
                disabled={pdfBusy}
                style={{
                  fontSize: 11,
                  padding: "6px 13px",
                  border: `1px solid ${t.borderStrong}`,
                  borderRadius: 7,
                  background: pdfBusy ? t.bgAlt : t.accentFaint,
                  color: pdfBusy ? t.textMuted : t.accent,
                  cursor: pdfBusy ? "wait" : "pointer",
                  fontFamily: "'Courier New',monospace",
                  whiteSpace: "nowrap",
                }}
              >
                {pdfBusy ? "⟳ PDF 생성 중..." : "PDF 출력"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!isAdmin) {
                    showToast(proOnlyMsg);
                    return;
                  }
                  if (shareBusy) return;
                  setShareBusy(true);
                  try {
                    const content =
                      selected.content_filter && selected.content_filter !== "전체"
                        ? selected.content_filter
                        : "총력전";
                    const gid = selected.guild_id ?? guildId;
                    const res = await fetch("/api/discord/share-weekly-report", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        reportId: selected.id,
                        guildId: gid,
                        contentFilter: selected.content_filter || "전체",
                        content,
                      }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data?.error || "공유에 실패했습니다.");
                    showToast("디스코드로 공유했습니다.");
                  } catch (e) {
                    showToast(e?.message || "공유에 실패했습니다.");
                  } finally {
                    setShareBusy(false);
                  }
                }}
                disabled={shareBusy}
                style={{
                  fontSize: 11,
                  padding: "6px 13px",
                  border: `1px solid ${t.border}`,
                  borderRadius: 7,
                  background: "transparent",
                  color: t.textSub,
                  cursor: shareBusy ? "wait" : "pointer",
                  fontFamily: "'Courier New',monospace",
                  whiteSpace: "nowrap",
                }}
              >
                {shareBusy ? "⟳ 전송 중..." : "공유"}
              </button>
            </div>

            {/* 캡처 대상: 데모처럼 카드 내부만 */}
            <div
              ref={reportPdfRef}
              style={{
                display: "block",
                width: "100%",
                boxSizing: "border-box",
                background: t.bg,
                // PDF 캡처 시 하단 출처 문구가 잘리지 않도록 하단 패딩을 넉넉히 둔다.
                padding: "16px 18px 28px",
                borderRadius: 11,
                border: `1px solid ${t.rptBorder}`,
              }}
            >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <div>
                <div style={{ fontSize: 17, fontWeight: 500, color: t.text, marginBottom: 4 }}>
                  {selected.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: t.textMuted }}>
                    {selected.date} · {selected.guild_name} ·{" "}
                    {selected.model === "local-fallback" || selected.metrics?.fallback
                      ? "로컬 fallback"
                      : selected.model || "OpenAI"}{" "}
                    생성
                  </span>
                  {selected.metrics?.fallback && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 9px",
                        background: "rgba(255,176,46,0.15)",
                        border: "1px solid rgba(255,176,46,0.4)",
                        color: "#c87b00",
                        borderRadius: 20,
                        fontWeight: 500,
                      }}
                      title={
                        selected.metrics.fallbackReason === "QUOTA_EXCEEDED"
                          ? "OpenAI 사용량 한도 초과 — 결제/크레딧 충전 후 재시도하세요."
                          : "OpenAI 호출 실패로 길드 데이터 기반 로컬 생성기로 fallback 됨"
                      }
                    >
                      ◇ Local Fallback
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 9px",
                      background: selected.content_filter === "전체" ? t.bgAlt : t.accentFaint,
                      border: `1px solid ${selected.content_filter === "전체" ? t.border : t.borderStrong}`,
                      color: selected.content_filter === "전체" ? t.textMuted : t.accent,
                      borderRadius: 20,
                      fontWeight: 500,
                    }}
                  >
                    {selected.content_filter === "전체"
                      ? "📊 전체 통합 기준"
                      : "⚡ " + selected.content_filter + " 기준"}
                  </span>
                </div>
              </div>
            </div>

            {selected.metrics && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {[
                  { label: "주간 합계", value: (selected.metrics.currentTotal || 0).toLocaleString() },
                  {
                    label: "전주 대비",
                    value:
                      `${selected.metrics.delta >= 0 ? "▲" : "▼"} ${Math.abs(selected.metrics.delta || 0)} (${selected.metrics.deltaPct || "0"}%)`,
                    color: (selected.metrics.delta ?? 0) >= 0 ? t.up : t.dn,
                  },
                  { label: "참여율", value: `${selected.metrics.participation || 0}%` },
                  {
                    label: "MVP",
                    value: selected.metrics.mvp ? selected.metrics.mvp.nick : "—",
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    style={{
                      background: t.bgCard,
                      border: `1px solid ${t.border}`,
                      borderRadius: 9,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 4, letterSpacing: "0.08em" }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: m.color || t.text }}>{m.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                background: t.rptBg,
                border: `1px solid ${t.rptBorder}`,
                borderRadius: 11,
                padding: "14px 18px",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: t.accent, marginBottom: 8 }}>요약</div>
              <div style={{ fontSize: 12, color: t.rptText, lineHeight: 1.7 }}>{selected.summary}</div>
              {Array.isArray(selected.chips) && selected.chips.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {selected.chips.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 10,
                        padding: "3px 10px",
                        background: t.accentFaint,
                        border: `1px solid ${t.border}`,
                        color: t.accentDim,
                        borderRadius: 20,
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {Array.isArray(selected.sections) &&
              selected.sections.map((sec, i) => (
                <div
                  key={i}
                  style={{
                    background: t.bgCard,
                    border: `1px solid ${t.border}`,
                    borderRadius: 11,
                    padding: "14px 18px",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: t.text, marginBottom: 8 }}>{sec.title}</div>
                  <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {sec.content}
                  </div>
                </div>
              ))}

            {(selected.prompt_tokens || selected.completion_tokens) && (
              <div
                style={{
                  fontSize: 10,
                  color: t.textMuted,
                  marginTop: 14,
                  padding: "8px 12px",
                  background: t.bgAlt,
                  borderRadius: 7,
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <span>모델: {selected.model || "—"}</span>
                <span>입력 토큰: {selected.prompt_tokens || 0}</span>
                <span>출력 토큰: {selected.completion_tokens || 0}</span>
                <span>생성: {selected.created_at?.split("T")[0]}</span>
              </div>
            )}

            <div
              style={{
                marginTop: 14,
                paddingTop: 10,
                borderTop: `1px dashed ${t.border}`,
                fontSize: 10,
                color: t.textMuted,
                lineHeight: 1.6,
                opacity: 0.9,
              }}
            >
              📄 본 리포트는 AI 기반 길드 관리 플랫폼{" "}
              <strong style={{ color: t.accent, fontWeight: 700 }}>GUILD INSIGHT</strong>에서 생성되었습니다.{" "}
              <span style={{ color: t.textMuted }}>
                (출처:{" "}
                <a
                  href="https://guildinsightapp.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: t.accentDim,
                    textDecoration: "underline dotted",
                    textUnderlineOffset: 3,
                  }}
                >
                  guildinsightapp.vercel.app
                </a>
                )
              </span>
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
