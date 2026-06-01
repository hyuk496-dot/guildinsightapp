'use client';
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { selectStyle, optionStyle } from "@/lib/styles";
import { Modal } from "@/components/shared/Modal";
import { FREE_OCR_MAX } from "@/lib/ocr-quota";
import { ExcelColumnMapping } from "./ExcelColumnMapping";
import {
  parseExcelFile,
  guessColumnMapping,
  excelRowsToOcrFormat,
  SKIP_VALUE,
} from "@/lib/excel-import";
import { listContentTabs } from "@/lib/contents-catalog";

const MAX_BYTES = 10 * 1024 * 1024;

function getFileKind(file) {
  const name = file.name.toLowerCase();
  if (/\.(xlsx|xls)$/.test(name)) return "excel";
  if (/\.(jpe?g|png)$/.test(name) || file.type.startsWith("image/")) return "image";
  return null;
}

export function OcrImageUpload({
  t,
  onScanComplete,
  guilds = [],
  contents = [],
  defaultGuildId = null,
  defaultContentName = null,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [fileKind, setFileKind] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [excelLoading, setExcelLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [excelDataRows, setExcelDataRows] = useState([]);
  const [excelColIndex, setExcelColIndex] = useState({});
  const [excelMapping, setExcelMapping] = useState({});
  const fileRef = useRef(null);

  const contentTabs = listContentTabs(contents);
  const [guildId, setGuildId] = useState(defaultGuildId ?? guilds[0]?.id ?? "");
  const [contentName, setContentName] = useState(
    defaultContentName ?? contentTabs[0] ?? ""
  );

  useEffect(() => {
    if (contentName && contentTabs.includes(contentName)) return;
    if (defaultContentName && contentTabs.includes(defaultContentName)) {
      setContentName(defaultContentName);
      return;
    }
    if (contentTabs[0]) setContentName(contentTabs[0]);
  }, [contentTabs, defaultContentName]);
  const [ocrQuota, setOcrQuota] = useState({
    remaining: 0,
    max: FREE_OCR_MAX,
    unlimited: false,
    isAdmin: false,
    loading: true,
  });
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  const fetchOcrQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/ocr/quota");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 에러여도 로딩이 멈추지 않도록 처리
        setOcrQuota((q) => ({ ...q, loading: false }));
        return;
      }
      setOcrQuota({
        remaining: data.remaining ?? 0,
        max: data.max ?? FREE_OCR_MAX,
        unlimited: !!data.unlimited,
        isAdmin: !!data.isAdmin,
        loading: false,
      });
    } catch {
      setOcrQuota((q) => ({ ...q, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchOcrQuota();
  }, [fetchOcrQuota]);

  useEffect(() => {
    if (defaultGuildId != null && defaultGuildId !== guildId) {
      setGuildId(defaultGuildId);
    }
  }, [defaultGuildId]); // eslint-disable-line react-hooks/exhaustive-deps

  const imageQuotaBlocked =
    ocrQuota.loading || (!ocrQuota.unlimited && ocrQuota.remaining <= 0);

  const openLimitModal = () => setLimitModalOpen(true);

  const resetExcelState = () => {
    setExcelHeaders([]);
    setExcelDataRows([]);
    setExcelColIndex({});
    setExcelMapping({});
    setExcelLoading(false);
    setImporting(false);
  };

  const handleFile = async (f) => {
    if (!f) return;
    const kind = getFileKind(f);
    if (!kind) {
      alert("JPG, PNG, XLSX, XLS 파일만 업로드할 수 있습니다.");
      return;
    }
    if (f.size > MAX_BYTES) {
      alert("파일 크기는 최대 10MB까지 가능합니다.");
      return;
    }

    if (kind === "image" && imageQuotaBlocked) {
      openLimitModal();
      return;
    }

    setFile(f);
    setFileKind(kind);
    setPreview(null);
    resetExcelState();

    if (kind === "image") {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
      return;
    }

    setExcelLoading(true);
    try {
      const { headers, dataRows, colIndexByHeader } = await parseExcelFile(f);
      if (!headers.length) {
        throw new Error("엑셀에서 헤더 행을 찾을 수 없습니다.");
      }
      setExcelHeaders(headers);
      setExcelDataRows(dataRows);
      setExcelColIndex(colIndexByHeader);
      setExcelMapping(guessColumnMapping(headers));
    } catch (err) {
      alert(err.message || "엑셀 파일을 읽지 못했습니다.");
      setFile(null);
      setFileKind(null);
      resetExcelState();
    } finally {
      setExcelLoading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const startScan = async () => {
    if (!file || fileKind !== "image") {
      alert("이미지를 먼저 업로드해주세요.");
      return;
    }
    if (imageQuotaBlocked) {
      openLimitModal();
      return;
    }
    setScanning(true);
    setScanProgress(0);

    const progressIv = setInterval(() => {
      setScanProgress((p) => {
        if (p >= 92) return p;
        return p + Math.floor(Math.random() * 8) + 3;
      });
    }, 120);

    try {
      const formData = new FormData();
      formData.append("image", file);
      if (guildId !== "" && guildId != null) {
        formData.append("guild_id", String(guildId));
      }
      if (contentName) {
        formData.append("content_name", contentName);
      }

      const res = await fetch("/api/ocr/scan", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403 && (data.code === "OCR_QUOTA_EXCEEDED" || data.error?.includes("소진"))) {
          setOcrQuota((q) => ({ ...q, remaining: 0, loading: false }));
          openLimitModal();
          clearInterval(progressIv);
          setScanning(false);
          setScanProgress(0);
          return;
        }
        throw new Error(data.error || "OCR 스캔에 실패했습니다.");
      }
      if (!data.rows?.length) {
        throw new Error(
          "인식된 점수 행이 없습니다. 스크린샷에 닉네임·점수 목록이 선명하게 보이는지 확인해 주세요."
        );
      }

      clearInterval(progressIv);
      setScanProgress(100);

      await fetchOcrQuota();

      setTimeout(() => {
        onScanComplete({
          fileName: file.name,
          completedAt: new Date().toLocaleString("ko-KR"),
          rows: data.rows,
          preview,
          avgConf: data.avgConf,
          processingMs: data.processingMs,
          rawText: data.rawText,
          guildId: data.guildId ?? (guildId !== "" ? Number(guildId) : null),
          contentName: data.contentName ?? contentName ?? null,
        });
      }, 400);
    } catch (err) {
      clearInterval(progressIv);
      setScanning(false);
      setScanProgress(0);
      alert(err.message);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFileKind(null);
    setPreview(null);
    setScanProgress(0);
    setScanning(false);
    resetExcelState();
  };

  const excelMappingValid = useMemo(() => {
    if (fileKind !== "excel") return false;
    return (
      excelMapping.nick &&
      excelMapping.nick !== SKIP_VALUE &&
      excelMapping.weekly &&
      excelMapping.weekly !== SKIP_VALUE &&
      !excelLoading
    );
  }, [fileKind, excelMapping, excelLoading]);

  const importExcel = async () => {
    if (!file || fileKind !== "excel") {
      alert("엑셀 파일을 먼저 업로드해 주세요.");
      return;
    }
    if (!excelMappingValid) {
      alert("닉네임과 점수 컬럼을 반드시 선택해 주세요.");
      return;
    }

    setImporting(true);
    try {
      const rows = excelRowsToOcrFormat(
        excelDataRows,
        excelMapping,
        excelColIndex
      );
      const avgConf = Math.round(
        rows.reduce((s, r) => s + (r.conf || 0), 0) / rows.length
      );

      onScanComplete({
        fileName: file.name,
        completedAt: new Date().toLocaleString("ko-KR"),
        rows,
        preview: null,
        avgConf,
        processingMs: 0,
        rawText: "",
        guildId: guildId !== "" ? Number(guildId) : null,
        contentName: contentName ?? null,
        sourceType: "excel",
      });
    } catch (err) {
      alert(err.message || "엑셀 데이터를 가져오지 못했습니다.");
    } finally {
      setImporting(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + "B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "KB";
    return (bytes / (1024 * 1024)).toFixed(1) + "MB";
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 페이지 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: t.text, marginBottom: 4 }}>
            점수 데이터 업로드
          </div>
          <div style={{ fontSize: 11, color: t.textMuted }}>
            스크린샷(OCR) 또는 엑셀 파일로 길드 점수를 가져올 수 있습니다
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 20,
            border: `1px solid ${imageQuotaBlocked ? "rgba(255,91,91,0.35)" : t.borderStrong}`,
            background: imageQuotaBlocked ? "rgba(255,91,91,0.08)" : t.accentFaint,
            fontSize: 10,
            color: imageQuotaBlocked ? "#ff8a8a" : t.accentDim,
            fontFamily: "'Courier New',monospace",
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: imageQuotaBlocked ? "#ff5b5b" : t.up,
              flexShrink: 0,
            }}
          />
          {ocrQuota.loading ? (
            "잔여 횟수 확인 중…"
          ) : (
            <>
              남은 무료 이미지 스캔:{" "}
              <strong style={{ color: imageQuotaBlocked ? "#ff7070" : t.accent }}>
                {ocrQuota.unlimited
                  ? ocrQuota.isAdmin
                    ? "무제한 (Admin)"
                    : "무제한"
                  : `${ocrQuota.remaining}회`}
              </strong>{" "}
              / {ocrQuota.max}회
              <span style={{ color: t.textMuted, marginLeft: 4 }}>(엑셀 업로드는 무제한)</span>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* ── 좌측: 업로드 존 ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* 사전 선택: 길드 / 컨텐츠 */}
          <div
            style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>
                저장 대상 선택
                <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 400, marginLeft: 6 }}>
                  스캔 전에 미리 정해두면 매칭 정확도가 올라갑니다
                </span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>길드</div>
                <select
                  value={guildId ?? ""}
                  onChange={(e) =>
                    setGuildId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  style={{ ...selectStyle(t), width: "100%", padding: "7px 10px", fontSize: 12 }}
                >
                  {guilds.length === 0 && (
                    <option value="" style={optionStyle(t)}>
                      길드 없음
                    </option>
                  )}
                  {guilds.map((g) => (
                    <option key={g.id} value={g.id} style={optionStyle(t)}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>컨텐츠</div>
                <select
                  value={contentName}
                  onChange={(e) => setContentName(e.target.value)}
                  style={{ ...selectStyle(t), width: "100%", padding: "7px 10px", fontSize: 12 }}
                >
                  {contentTabs.length === 0 && (
                    <option value="" style={optionStyle(t)}>
                      컨텐츠 없음
                    </option>
                  )}
                  {contentTabs.map((c) => (
                    <option key={c} value={c} style={optionStyle(t)}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 12 }}>파일 업로드</div>

            {/* 드래그 앤 드롭 존 */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => !file && fileRef.current?.click()}
              style={{
                position: "relative",
                border: `2px dashed ${dragOver ? t.accent : file ? t.borderStrong : t.border}`,
                borderRadius: 10,
                background: dragOver ? t.accentFaint : file ? t.accentFainter : t.bgAlt,
                minHeight: 220,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: file ? "default" : "pointer",
                transition: "all 0.2s",
                overflow: "hidden",
                padding: 16,
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e) => handleFile(e.target.files[0])}
                style={{ display: "none" }}
              />

              {!file ? (
                <>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: t.accentFaint,
                      border: `1px solid ${t.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                    }}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: t.text, marginBottom: 6, textAlign: "center" }}>
                    파일을 드래그하거나 클릭하여 업로드
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted, textAlign: "center", lineHeight: 1.7 }}>
                    JPG, PNG · XLSX, XLS
                    <br />
                    최대 10MB
                  </div>
                  {dragOver && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: t.accentFaint,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 9,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 500, color: t.accent }}>여기에 놓으세요 ↓</div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ position: "relative", width: "100%", borderRadius: 8, overflow: "hidden", border: `1px solid ${t.border}` }}>
                    {fileKind === "image" && preview ? (
                      <img src={preview} alt="preview" style={{ width: "100%", maxHeight: 160, objectFit: "contain", background: "#000", display: "block" }} />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          minHeight: 120,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          background: t.bgAlt,
                          padding: 20,
                        }}
                      >
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={t.up} strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="8" y1="13" x2="16" y2="13" />
                          <line x1="8" y1="17" x2="16" y2="17" />
                        </svg>
                        <span style={{ fontSize: 11, color: t.textMuted }}>엑셀 파일</span>
                        {excelLoading && (
                          <span style={{ fontSize: 10, color: t.accent }}>시트 읽는 중...</span>
                        )}
                      </div>
                    )}
                    {scanning && fileKind === "image" && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          height: 2,
                          background: t.accent,
                          opacity: 0.8,
                          animation: "scanLine 1.5s ease-in-out infinite",
                          top: `${scanProgress}%`,
                          boxShadow: `0 0 8px ${t.accent}`,
                        }}
                      />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.6)",
                        border: "none",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: t.accentFaint,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="12" height="12" rx="2" stroke={t.accent} strokeWidth="1.2" />
                        <path d="M5 8h6M5 5.5h6M5 10.5h4" stroke={t.accent} strokeWidth="1" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: 10, color: t.textMuted }}>{formatSize(file.size)}</div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        background: fileKind === "excel" ? t.accentFaint : t.upBg,
                        color: fileKind === "excel" ? t.accent : t.up,
                        borderRadius: 20,
                        border: `1px solid ${fileKind === "excel" ? t.borderStrong : `${t.up}44`}`,
                      }}
                    >
                      {excelLoading ? "읽는 중" : fileKind === "excel" ? "엑셀" : "준비됨"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 엑셀 컬럼 매핑 */}
            {fileKind === "excel" && !excelLoading && excelHeaders.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <ExcelColumnMapping
                  t={t}
                  headers={excelHeaders}
                  mapping={excelMapping}
                  onMappingChange={(key, value) =>
                    setExcelMapping((prev) => ({ ...prev, [key]: value }))
                  }
                  previewRows={excelDataRows}
                />
              </div>
            )}

            {/* 스캔 진행바 */}
            {scanning && fileKind === "image" && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: t.accent, fontWeight: 500 }}>
                    {scanProgress < 30
                      ? "이미지 분석 중..."
                      : scanProgress < 60
                        ? "텍스트 인식 중..."
                        : scanProgress < 90
                          ? "데이터 파싱 중..."
                          : "인식 완료!"}
                  </span>
                  <span style={{ fontSize: 11, color: t.accent, fontWeight: 500 }}>{Math.min(scanProgress, 100)}%</span>
                </div>
                <div style={{ height: 5, background: t.pBg, borderRadius: 3 }}>
                  <div
                    style={{
                      height: 5,
                      width: `${Math.min(scanProgress, 100)}%`,
                      background: t.pBar,
                      borderRadius: 3,
                      transition: "width 0.15s",
                      boxShadow: `0 0 6px ${t.accent}66`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 업로드 가이드 */}
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "13px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: t.text, marginBottom: 8 }}>인식 정확도를 높이는 팁</div>
            {(fileKind === "excel"
              ? [
                  ["첫 행 헤더", "첫 줄에 순위·닉네임·점수 등 열 이름이 있으면 자동 매핑됩니다"],
                  ["필수 컬럼", "닉네임과 점수 열은 반드시 매핑해 주세요"],
                  ["형식 자유", "컬럼 순서·이름이 달라도 매핑 화면에서 연결하면 됩니다"],
                ]
              : [
                  ["화면 전체", "길드 점수 목록이 전체 보이도록 캡처하세요"],
                  ["고해상도", "해상도가 높을수록 인식률이 높아집니다"],
                  ["텍스트 선명", "흐릿하거나 잘린 텍스트는 인식 오류가 발생할 수 있습니다"],
                ]
            ).map(([t1, t2]) => (
              <div key={t1} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                <span style={{ color: t.up, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                <div>
                  <span style={{ fontSize: 11, color: t.text, fontWeight: 500 }}>{t1} — </span>
                  <span style={{ fontSize: 11, color: t.textMuted }}>{t2}</span>
                </div>
              </div>
            ))}
          </div>

          {/* OCR 스캔 / 엑셀 가져오기 */}
          {fileKind === "excel" ? (
            <button
              onClick={importExcel}
              disabled={!file || !excelMappingValid || importing || excelLoading}
              style={{
                width: "100%",
                padding: "13px",
                border: `1px solid ${excelMappingValid && !importing ? t.borderStrong : t.border}`,
                borderRadius: 10,
                background: excelMappingValid && !importing ? t.accentFaint : t.bgAlt,
                color: excelMappingValid && !importing ? t.accent : t.textMuted,
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'Courier New',monospace",
                cursor: excelMappingValid && !importing ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                letterSpacing: "0.08em",
              }}
            >
              {importing ? (
                <>
                  <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                  가져오는 중...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke={excelMappingValid ? t.accent : t.textMuted} strokeWidth="1.8">
                    <path d="M10 3v10M6 9l4 4 4-4M4 17h12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  데이터 가져오기
                </>
              )}
            </button>
          ) : (
            <button
              onClick={startScan}
              disabled={!file || fileKind !== "image" || scanning || imageQuotaBlocked}
              style={{
                width: "100%",
                padding: "13px",
                border: `1px solid ${file && fileKind === "image" && !scanning ? t.borderStrong : t.border}`,
                borderRadius: 10,
                background: file && fileKind === "image" && !scanning ? t.accentFaint : t.bgAlt,
                color: file && fileKind === "image" && !scanning ? t.accent : t.textMuted,
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'Courier New',monospace",
                cursor: file && fileKind === "image" && !scanning ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                letterSpacing: "0.08em",
              }}
            >
              {scanning ? (
                <>
                  <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                  스캔 중...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke={file ? t.accent : t.textMuted} strokeWidth="1.8" strokeLinecap="round">
                    <path d="M3 7V4a1 1 0 0 1 1-1h3M13 3h3a1 1 0 0 1 1 1v3M17 13v3a1 1 0 0 1-1 1h-3M7 17H4a1 1 0 0 1-1-1v-3" />
                    <rect x="7" y="7" width="6" height="6" rx="1" />
                  </svg>
                  OCR 스캔
                </>
              )}
            </button>
          )}
        </div>

        {/* ── 우측: 결과 미리보기 (대기 상태) ── */}
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>인식 결과 미리보기</div>
            {scanning && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 9px",
                  background: t.accentFaint,
                  border: `1px solid ${t.borderStrong}`,
                  color: t.accent,
                  borderRadius: 20,
                }}
              >
                ● 분석 중
              </span>
            )}
          </div>

          {/* 워터마크 메시지 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, position: "relative" }}>
            {/* 격자 배경 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `linear-gradient(${t.gridLine || "rgba(0,200,255,0.04)"} 1px, transparent 1px), linear-gradient(90deg, ${t.gridLine || "rgba(0,200,255,0.04)"} 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
                borderRadius: 8,
                opacity: 0.6,
              }}
            />

            {/* 워터마크 아이콘 + 문구 */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: t.accentFainter,
                  border: `1px dashed ${t.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="4" width="10" height="10" rx="2" stroke={t.textMuted} strokeWidth="1.2" strokeDasharray="3 2" />
                  <rect x="18" y="4" width="10" height="10" rx="2" stroke={t.textMuted} strokeWidth="1.2" strokeDasharray="3 2" />
                  <rect x="4" y="18" width="10" height="10" rx="2" stroke={t.textMuted} strokeWidth="1.2" strokeDasharray="3 2" />
                  <rect x="18" y="18" width="10" height="10" rx="2" stroke={t.textMuted} strokeWidth="1.2" strokeDasharray="3 2" />
                  <line x1="16" y1="9" x2="16" y2="9" stroke={t.accent} strokeWidth="2" strokeLinecap="round" />
                  <circle cx="16" cy="16" r="3" stroke={t.textMuted} strokeWidth="1" strokeDasharray="2 2" />
                </svg>
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 6, letterSpacing: "0.02em" }}>
                  인식된 이미지 내용이 여기에 표시됩니다
                </div>
                <div style={{ fontSize: 11, color: t.textMuted, opacity: 0.6, lineHeight: 1.6 }}>
                  {fileKind === "excel" ? (
                    "컬럼 매핑 후 데이터 가져오기를 눌러주세요"
                  ) : (
                    <>
                      이미지 또는 엑셀을 업로드한 뒤
                      <br />
                      OCR 스캔 또는 데이터 가져오기를 실행하세요
                    </>
                  )}
                </div>
              </div>

              {/* 더미 행 시각화 */}
              <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 6, opacity: 0.18 }}>
                {[90, 70, 80, 60, 75, 50].map((w, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: t.accent }} />
                    <div style={{ height: 8, borderRadius: 4, background: t.accent, flex: 1, maxWidth: `${w}%` }} />
                    <div style={{ height: 8, borderRadius: 4, background: t.accent, width: 36 }} />
                  </div>
                ))}
              </div>
            </div>

            {/* 스캔 중 오버레이 */}
            {fileKind === "excel" && excelDataRows.length > 0 && !excelLoading && (
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  marginTop: 16,
                  padding: "12px 16px",
                  background: t.bgAlt,
                  borderRadius: 8,
                  border: `1px solid ${t.border}`,
                  width: "100%",
                  maxWidth: 280,
                }}
              >
                <div style={{ fontSize: 11, color: t.text, marginBottom: 4 }}>
                  시트 데이터 <strong style={{ color: t.accent }}>{excelDataRows.length}행</strong>
                </div>
                <div style={{ fontSize: 10, color: t.textMuted }}>
                  헤더 {excelHeaders.length}열 · 매핑 후 결과 화면에서 검증·저장
                </div>
              </div>
            )}

            {scanning && fileKind === "image" && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `${t.bgCard}cc`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  borderRadius: 8,
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: t.accentFaint,
                    border: `1px solid ${t.borderStrong}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                </div>
                <div style={{ fontSize: 12, color: t.accent, fontWeight: 500 }}>
                  {scanProgress < 30
                    ? "OCR 엔진 초기화 중..."
                    : scanProgress < 60
                      ? "텍스트 패턴 인식 중..."
                      : scanProgress < 90
                        ? "점수 데이터 추출 중..."
                        : "인식 결과 정리 중..."}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted }}>{Math.min(scanProgress, 100)}% 완료</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={limitModalOpen} onClose={() => setLimitModalOpen(false)} t={t} title="무료 이용 한도 도달">
        <p style={{ fontSize: 12, color: t.textSub, lineHeight: 1.75, margin: "0 0 20px" }}>
          무료 이용 횟수(3회)를 모두 소진하셨습니다. 지속적인 이미지 분석을 위해 플랜을 업그레이드해
          주세요!
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link
            href="/gptreport/compare"
            onClick={() => setLimitModalOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 16px",
              borderRadius: 10,
              border: `1px solid ${t.borderStrong}`,
              background: t.accentFaint,
              color: t.accent,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: "'Courier New',monospace",
              letterSpacing: "0.04em",
            }}
          >
            플랜 비교하기
          </Link>
          <Link
            href="/billing"
            onClick={() => setLimitModalOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: `linear-gradient(135deg, ${t.accent} 0%, ${t.up} 100%)`,
              color: "#04101c",
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              fontFamily: "'Courier New',monospace",
              letterSpacing: "0.04em",
              boxShadow: "0 6px 20px rgba(0,200,255,0.25)",
            }}
          >
            구독 요금제 보기
          </Link>
        </div>
      </Modal>

      <style>{`
        @keyframes scanLine { 0%{top:0%} 50%{top:95%} 100%{top:0%} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
