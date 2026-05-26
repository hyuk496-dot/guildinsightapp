'use client';
import { useState, useRef } from "react";

export function OcrImageUpload({ t, onScanComplete }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const fileRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ["image/jpeg", "image/png"];
    if (!allowed.includes(f.type)) {
      alert("JPG 또는 PNG 파일만 업로드 가능합니다.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      alert("파일 크기는 최대 10MB까지 가능합니다.");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const startScan = async () => {
    if (!file) {
      alert("이미지를 먼저 업로드해주세요.");
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

      const res = await fetch("/api/ocr/scan", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "OCR 스캔에 실패했습니다.");
      }
      if (!data.rows?.length) {
        throw new Error(
          "인식된 점수 행이 없습니다. 스크린샷에 닉네임·점수 목록이 선명하게 보이는지 확인해 주세요."
        );
      }

      clearInterval(progressIv);
      setScanProgress(100);

      setTimeout(() => {
        onScanComplete({
          fileName: file.name,
          completedAt: new Date().toLocaleString("ko-KR"),
          rows: data.rows,
          preview,
          avgConf: data.avgConf,
          processingMs: data.processingMs,
          rawText: data.rawText,
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
    setPreview(null);
    setScanProgress(0);
    setScanning(false);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + "B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "KB";
    return (bytes / (1024 * 1024)).toFixed(1) + "MB";
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 페이지 헤더 */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 500, color: t.text, marginBottom: 4 }}>OCR 이미지 업로드</div>
        <div style={{ fontSize: 11, color: t.textMuted }}>길드 점수 스크린샷을 업로드하면 AI가 자동으로 점수를 인식합니다</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* ── 좌측: 업로드 존 ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 12 }}>이미지 업로드</div>

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
                accept="image/jpeg,image/png"
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
                    이미지를 드래그하거나 클릭하여 업로드
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted, textAlign: "center", lineHeight: 1.7 }}>
                    JPG, PNG · 최대 10MB
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
                    <img src={preview} alt="preview" style={{ width: "100%", maxHeight: 160, objectFit: "contain", background: "#000", display: "block" }} />
                    {scanning && (
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
                    <div style={{ fontSize: 10, padding: "2px 8px", background: t.upBg, color: t.up, borderRadius: 20, border: `1px solid ${t.up}44` }}>
                      준비됨
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 스캔 진행바 */}
            {scanning && (
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
            {[
              ["화면 전체", "길드 점수 목록이 전체 보이도록 캡처하세요"],
              ["고해상도", "해상도가 높을수록 인식률이 높아집니다"],
              ["텍스트 선명", "흐릿하거나 잘린 텍스트는 인식 오류가 발생할 수 있습니다"],
            ].map(([t1, t2]) => (
              <div key={t1} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                <span style={{ color: t.up, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                <div>
                  <span style={{ fontSize: 11, color: t.text, fontWeight: 500 }}>{t1} — </span>
                  <span style={{ fontSize: 11, color: t.textMuted }}>{t2}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 스캔 시작 버튼 */}
          <button
            onClick={startScan}
            disabled={!file || scanning}
            style={{
              width: "100%",
              padding: "13px",
              border: `1px solid ${file && !scanning ? t.borderStrong : t.border}`,
              borderRadius: 10,
              background: file && !scanning ? t.accentFaint : t.bgAlt,
              color: file && !scanning ? t.accent : t.textMuted,
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "'Courier New',monospace",
              cursor: file && !scanning ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
              letterSpacing: "0.08em",
            }}
          >
            {scanning ? (
              <>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> 스캔 중...
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke={file ? t.accent : t.textMuted} strokeWidth="1.8" strokeLinecap="round">
                  <path d="M3 7V4a1 1 0 0 1 1-1h3M13 3h3a1 1 0 0 1 1 1v3M17 13v3a1 1 0 0 1-1 1h-3M7 17H4a1 1 0 0 1-1-1v-3" />
                  <rect x="7" y="7" width="6" height="6" rx="1" />
                </svg>
                스캔 시작
              </>
            )}
          </button>
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
                  좌측에서 이미지를 업로드하고
                  <br />
                  스캔 시작 버튼을 눌러주세요
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
            {scanning && (
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

      <style>{`
        @keyframes scanLine { 0%{top:0%} 50%{top:95%} 100%{top:0%} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
