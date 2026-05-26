'use client';

import { useEffect, useRef } from "react";

const PROVIDER_LABEL = {
  google: "Google 계정",
  discord: "Discord 계정",
  email: "이메일 계정",
};

const PROVIDER_COLOR = {
  google: "#e9ecf2",
  discord: "#c8d2ff",
  email: "#7bdcff",
};

function ProviderIcon({ provider }) {
  if (provider === "google") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#fff"
          d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.232c1.891-1.741 2.981-4.305 2.981-7.351z"
          opacity="0.9"
        />
        <path
          fill="#fff"
          d="M12 22c2.7 0 4.964-.895 6.619-2.422l-3.232-2.51c-.895.6-2.04.954-3.387.954-2.604 0-4.808-1.759-5.595-4.122H3.064v2.59A9.997 9.997 0 0 0 12 22z"
          opacity="0.55"
        />
        <path
          fill="#fff"
          d="M6.405 13.9a6.012 6.012 0 0 1 0-3.8V7.51H3.064a9.997 9.997 0 0 0 0 8.98l3.341-2.59z"
          opacity="0.4"
        />
        <path
          fill="#fff"
          d="M12 5.978c1.468 0 2.786.504 3.823 1.495l2.868-2.868C16.96 3.06 14.7 2 12 2A9.997 9.997 0 0 0 3.064 7.51l3.341 2.59C7.192 7.736 9.396 5.978 12 5.978z"
          opacity="0.75"
        />
      </svg>
    );
  }
  if (provider === "discord") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#c8d2ff" aria-hidden>
        <path d="M19.27 5.33A18.06 18.06 0 0 0 14.93 4l-.21.41a13.6 13.6 0 0 1 4.04 1.99 13.5 13.5 0 0 0-13.52 0 13.6 13.6 0 0 1 4.04-1.99L9.07 4a18.06 18.06 0 0 0-4.34 1.33C2.06 9.4 1.32 13.36 1.69 17.27a18.27 18.27 0 0 0 5.6 2.83l.43-.61c-.94-.34-1.83-.78-2.66-1.33.22-.16.44-.33.65-.51 4.95 2.32 10.31 2.32 15.2 0 .21.18.43.35.65.51-.83.55-1.72.99-2.66 1.33l.43.61a18.27 18.27 0 0 0 5.6-2.83c.46-4.5-.78-8.42-3.66-11.94zM8.52 14.78c-1.07 0-1.94-.99-1.94-2.21s.86-2.21 1.94-2.21 1.96.99 1.94 2.21c0 1.22-.86 2.21-1.94 2.21zm6.96 0c-1.07 0-1.94-.99-1.94-2.21s.86-2.21 1.94-2.21 1.96.99 1.94 2.21c0 1.22-.86 2.21-1.94 2.21z" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="13" rx="2" stroke="#7bdcff" strokeWidth="1.4" />
      <path d="M4 8l8 6 8-6" stroke="#7bdcff" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

function HeadsetIcon({ color = "currentColor" }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 14v-2a8 8 0 0 1 16 0v2"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <rect x="3" y="13" width="4" height="6" rx="1.5" stroke={color} strokeWidth="1.4" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" stroke={color} strokeWidth="1.4" />
      <path
        d="M20 19v.5a2.5 2.5 0 0 1-2.5 2.5H14"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="13" cy="22" r="1" fill={color} />
    </svg>
  );
}

function TrashIcon({ color = "currentColor" }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 5h10M6 5V3.5A1.5 1.5 0 0 1 7.5 2h1A1.5 1.5 0 0 1 10 3.5V5M5 5l.7 8.2A1.5 1.5 0 0 0 7.2 14.5h1.6a1.5 1.5 0 0 0 1.5-1.3L11 5"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 사이드바 하단 유저 카드 위로 펼쳐지는 미니 모달(팝오버)
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - anchorRef: React.RefObject  (트리거 카드 위치 — 외부 클릭 감지용)
 *  - t: theme
 *  - user: { email, displayName, provider, avatarUrl }
 *  - onContactClick: () => void   (고객센터)
 *  - onDeleteClick: () => void    (서비스 탈퇴)
 *  - isAdminAccount: boolean       (admin 보호)
 */
export function UserProfilePopover({
  open,
  onClose,
  anchorRef,
  t,
  user,
  onContactClick,
  onDeleteClick,
  isAdminAccount,
}) {
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      const target = e.target;
      if (popRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains?.(target)) return;
      onClose?.();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const provider = user?.provider || "email";
  const providerLabel = PROVIDER_LABEL[provider] || "이메일 계정";
  const providerColor = PROVIDER_COLOR[provider] || "#7bdcff";

  const displayName = user?.displayName || user?.email || "게스트";
  const email = user?.email || "";
  const initials = (email || displayName || "?").slice(0, 2).toUpperCase();

  return (
    <div
      ref={popRef}
      role="dialog"
      aria-label="사용자 프로필 메뉴"
      style={{
        position: "absolute",
        left: 8,
        right: 8,
        bottom: "100%",
        marginBottom: 8,
        background: t.bgCard,
        border: `1px solid ${t.borderStrong || "rgba(255,255,255,0.14)"}`,
        borderRadius: 12,
        boxShadow: "0 18px 48px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
        padding: 10,
        zIndex: 80,
        fontFamily: "'Courier New', monospace",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* 상단: 프로필 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 6px 12px",
          borderBottom: `1px solid ${t.borderSubtle || "rgba(255,255,255,0.08)"}`,
        }}
      >
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            width={36}
            height={36}
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              objectFit: "cover",
              border: `1px solid ${t.borderSubtle || "rgba(255,255,255,0.1)"}`,
              flexShrink: 0,
            }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accent}99 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: t.bg,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: t.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={displayName}
          >
            {displayName}
          </div>
          {email && (
            <div
              style={{
                fontSize: 10,
                color: t.textMuted,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: 1,
                fontFamily: "monospace",
              }}
              title={email}
            >
              {email}
            </div>
          )}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              marginTop: 6,
              padding: "2px 7px",
              fontSize: 9,
              color: providerColor,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid rgba(255,255,255,0.1)`,
              borderRadius: 999,
              letterSpacing: "0.04em",
            }}
          >
            <ProviderIcon provider={provider} />
            {providerLabel}
          </div>
        </div>
      </div>

      {/* 메뉴: 고객센터 */}
      <button
        type="button"
        onClick={onContactClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          width: "100%",
          padding: "10px 10px",
          marginTop: 6,
          background: "transparent",
          color: t.textSub,
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 11.5,
          textAlign: "left",
          transition: "all 0.12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0,200,255,0.07)";
          e.currentTarget.style.color = t.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = t.textSub;
        }}
      >
        <HeadsetIcon />
        <span>고객센터 · 문의하기</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 9,
            color: t.textMuted,
            background: "rgba(255,255,255,0.05)",
            padding: "2px 6px",
            borderRadius: 4,
            letterSpacing: "0.03em",
          }}
        >
          BETA
        </span>
      </button>

      {/* 구분선 */}
      <div
        style={{
          height: 1,
          background: t.borderSubtle || "rgba(255,255,255,0.06)",
          margin: "6px 4px",
        }}
      />

      {/* 최하단: 서비스 탈퇴 */}
      <button
        type="button"
        onClick={() => {
          if (isAdminAccount) {
            alert("admin 계정은 탈퇴할 수 없습니다.\n(시드 데이터 보호 목적)");
            return;
          }
          onDeleteClick?.();
        }}
        disabled={isAdminAccount}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          width: "100%",
          padding: "10px 10px",
          background: "transparent",
          color: isAdminAccount ? t.textMuted : "rgba(255,140,140,0.85)",
          border: "none",
          borderRadius: 8,
          cursor: isAdminAccount ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          fontSize: 11.5,
          textAlign: "left",
          opacity: isAdminAccount ? 0.5 : 1,
          transition: "all 0.12s",
        }}
        onMouseEnter={(e) => {
          if (!isAdminAccount) {
            e.currentTarget.style.background = "rgba(255,80,80,0.08)";
            e.currentTarget.style.color = "#ff8585";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = isAdminAccount
            ? t.textMuted
            : "rgba(255,140,140,0.85)";
        }}
        title={
          isAdminAccount
            ? "admin 계정은 탈퇴할 수 없습니다."
            : "서비스에서 계정을 영구 삭제합니다."
        }
      >
        <TrashIcon color="currentColor" />
        <span>서비스 탈퇴</span>
      </button>
    </div>
  );
}
