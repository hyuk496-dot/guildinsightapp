'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/shared/Modal";

const CONFIRM_PHRASE = "탈퇴합니다";

export function DeleteAccountModal({ open, onClose, t, userEmail }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setTyped("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const isConfirmed = typed.trim() === CONFIRM_PHRASE;

  const handleDelete = async () => {
    if (!isConfirmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "탈퇴 처리에 실패했습니다.");
      }

      // 클라이언트 측 세션 정리
      try {
        const { getBrowserSupabase } = await import("@/lib/supabase-browser");
        await getBrowserSupabase().auth.signOut();
      } catch {}
      try {
        sessionStorage.clear();
      } catch {}

      alert(
        "탈퇴가 완료되었습니다.\n생성하신 길드 및 모든 데이터가 영구 삭제되었습니다."
      );
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e.message || "알 수 없는 오류");
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !submitting && onClose?.()} t={t} title="서비스 탈퇴">
      <div style={{ fontFamily: "inherit" }}>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(255,80,80,0.07)",
            border: "1px solid rgba(255,80,80,0.3)",
            color: "#ffb0b0",
            fontSize: 12,
            lineHeight: 1.7,
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 700, color: "#ff8585", marginBottom: 4 }}>
            ⚠ 정말 탈퇴하시겠습니까?
          </div>
          탈퇴 시 <strong>생성하신 모든 길드 데이터와 길드원 정보가 완전히 삭제</strong>되며
          복구할 수 없습니다. (점수, 기여도, OCR 기록, GPT 리포트 포함)
        </div>

        <div style={{ fontSize: 11, color: t.textSub, marginBottom: 4 }}>탈퇴 계정</div>
        <div
          style={{
            fontSize: 12,
            color: t.text,
            marginBottom: 16,
            padding: "8px 10px",
            background: t.bgInput || "rgba(255,255,255,0.04)",
            border: `1px solid ${t.border || "rgba(255,255,255,0.1)"}`,
            borderRadius: 6,
            fontFamily: "monospace",
          }}
        >
          {userEmail || "(이메일 정보 없음)"}
        </div>

        <label
          style={{ display: "block", fontSize: 11, color: t.textSub, marginBottom: 6 }}
        >
          확인을 위해 아래 칸에 <strong style={{ color: "#ff8585" }}>{CONFIRM_PHRASE}</strong>{" "}
          를 입력해 주세요
        </label>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={CONFIRM_PHRASE}
          autoFocus
          disabled={submitting}
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 13,
            borderRadius: 8,
            background: t.bgInput || "rgba(255,255,255,0.04)",
            color: t.text,
            border: isConfirmed
              ? "1px solid rgba(255,80,80,0.55)"
              : `1px solid ${t.border || "rgba(255,255,255,0.12)"}`,
            outline: "none",
            marginBottom: 12,
            fontFamily: "inherit",
            transition: "border-color 0.15s",
          }}
        />

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 10px",
              fontSize: 11,
              color: "#ff8585",
              background: "rgba(255,80,80,0.08)",
              border: "1px solid rgba(255,80,80,0.3)",
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => !submitting && onClose?.()}
            disabled={submitting}
            style={{
              flex: 1,
              padding: "10px 18px",
              background: "transparent",
              color: t.textSub,
              border: `1px solid ${t.border || "rgba(255,255,255,0.15)"}`,
              borderRadius: 8,
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              fontSize: 12,
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || submitting}
            style={{
              flex: 1.4,
              padding: "10px 18px",
              background:
                isConfirmed && !submitting
                  ? "linear-gradient(135deg,#ff4d4d 0%,#c11414 100%)"
                  : "rgba(255,80,80,0.18)",
              color: isConfirmed && !submitting ? "#fff" : "rgba(255,200,200,0.55)",
              border:
                isConfirmed && !submitting
                  ? "1px solid #ff4d4d"
                  : "1px solid rgba(255,80,80,0.3)",
              borderRadius: 8,
              cursor:
                isConfirmed && !submitting
                  ? "pointer"
                  : submitting
                  ? "wait"
                  : "not-allowed",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
              transition: "all 0.15s",
            }}
          >
            {submitting ? "삭제 중..." : "진짜 탈퇴하기"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
