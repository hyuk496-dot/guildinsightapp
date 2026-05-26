'use client';

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TR } from "@/lib/theme";
import { NAV_ITEMS } from "@/lib/constants";
import { NAV_ROUTE_MAP, ROUTES } from "@/lib/navigation";
import { useGuildInsight } from "@/context/GuildInsightProvider";
import { DeleteAccountModal } from "@/components/account/DeleteAccountModal";
import { UserProfilePopover } from "@/components/account/UserProfilePopover";

export function Sidebar({ t, guildName }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, guilds } = useGuildInsight();
  // 길드를 보유하지 않은 신규 유저는 모든 메뉴 클릭이 차단된다.
  const hasNoGuild = (guilds?.length ?? 0) === 0;

  const profileTriggerRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const sections = [...new Set(NAV_ITEMS.map((i) => i.section))];

  const isActive = (id) => {
    const route = NAV_ROUTE_MAP[id];
    if (!route) return false;
    if (id === "ocr") {
      return pathname === ROUTES.ocr;
    }
    return pathname === route;
  };

  const isAdminAccount = user?.email === "admin@guildinsight.local";
  const displayName = user?.displayName || user?.email || "게스트";
  const initials = (user?.email || guildName || "?").slice(0, 2).toUpperCase();

  const handleContactSupport = () => {
    setProfileOpen(false);
    alert(
      "고객센터 문의 링크는 준비중입니다.\n빠른 시일 내에 안내드릴 예정이에요. 잠시만 기다려 주세요!"
    );
  };

  const handleOpenDelete = () => {
    setProfileOpen(false);
    setDeleteOpen(true);
  };

  return (
    <div
      style={{
        width: 196,
        flexShrink: 0,
        background: t.navBg,
        borderRight: `1px solid ${t.navBorder}`,
        display: "flex",
        flexDirection: "column",
        transition: TR,
      }}
    >
      <div style={{ padding: "14px 12px 12px", borderBottom: `1px solid ${t.navBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
            <polygon points="14,2 24,8 24,20 14,26 4,20 4,8" stroke={t.accent} strokeWidth="1" fill={t.accentFaint} />
            <polygon points="14,7 20,10.5 20,17.5 14,21 8,17.5 8,10.5" stroke={t.accent} strokeWidth="0.5" fill={t.accentFainter} />
            <circle cx="14" cy="14" r="3" fill={t.accent} opacity="0.9" />
          </svg>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: t.accent, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
              GUILD INSIGHT
            </div>
            <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.1em", marginTop: 1, whiteSpace: "nowrap" }}>
              운영자 대시보드
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
        {sections.map((sec) => (
          <div key={sec}>
            <div
              style={{
                fontSize: 9,
                color: t.textMuted,
                padding: "10px 8px 3px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {sec}
            </div>
            {NAV_ITEMS.filter((i) => i.section === sec).map((item) => {
              const href = NAV_ROUTE_MAP[item.id] || ROUTES.dashboard;
              const active = isActive(item.id);
              const locked = hasNoGuild;
              return (
                <Link
                  key={item.id}
                  href={locked ? "/guild/new?welcome=1" : href}
                  onClick={(e) => {
                    if (!locked) return;
                    e.preventDefault();
                    e.stopPropagation();
                    alert("길드 생성 후 이용 가능합니다.");
                    if (pathname !== "/guild/new") {
                      router.replace("/guild/new?welcome=1");
                    }
                  }}
                  aria-disabled={locked}
                  title={locked ? "길드 생성 후 이용 가능합니다." : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "7px 10px",
                    borderRadius: 7,
                    fontSize: 11,
                    color: locked
                      ? t.textMuted
                      : active
                      ? t.accent
                      : t.textSub,
                    background: locked
                      ? "transparent"
                      : active
                      ? t.sideActive
                      : "transparent",
                    cursor: locked ? "not-allowed" : "pointer",
                    marginBottom: 1,
                    fontWeight: active ? 500 : 400,
                    transition: "all 0.15s",
                    textDecoration: "none",
                    opacity: locked ? 0.45 : 1,
                    pointerEvents: "auto",
                  }}
                >
                  <span style={{ fontSize: 11, opacity: 0.75 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {locked && (
                    <svg
                      width="9"
                      height="11"
                      viewBox="0 0 12 14"
                      fill="none"
                      aria-hidden
                      style={{ opacity: 0.55, flexShrink: 0 }}
                    >
                      <rect
                        x="2"
                        y="6"
                        width="8"
                        height="6"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1.1"
                        fill="none"
                      />
                      <path
                        d="M4 6V4a2 2 0 1 1 4 0v2"
                        stroke="currentColor"
                        strokeWidth="1.1"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* 하단 프로필 영역 — 팝오버 트리거 */}
      <div
        style={{
          position: "relative",
          padding: "10px 8px 14px",
          borderTop: `1px solid ${t.navBorder}`,
        }}
      >
        <div
          ref={profileTriggerRef}
          onClick={() => setProfileOpen((v) => !v)}
          role="button"
          aria-haspopup="dialog"
          aria-expanded={profileOpen}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setProfileOpen((v) => !v);
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            background: profileOpen
              ? "rgba(0,200,255,0.16)"
              : t.accentFaint,
            border: profileOpen
              ? `1px solid ${t.accent}`
              : "1px solid transparent",
            borderRadius: 8,
            cursor: "pointer",
            transition: "all 0.15s",
            outline: "none",
          }}
          title="프로필 / 설정"
        >
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              width={26}
              height={26}
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                objectFit: "cover",
                flexShrink: 0,
              }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: t.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: t.bg,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: t.text,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={displayName}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: 9,
                color: t.textMuted,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {guildName ? `${guildName} · 마스터` : "마스터 권한"}
            </div>
          </div>
          {/* settings cog icon */}
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            style={{
              opacity: 0.75,
              color: profileOpen ? t.accent : t.textMuted,
              transition: "transform 0.2s",
              transform: profileOpen ? "rotate(45deg)" : "rotate(0deg)",
              flexShrink: 0,
            }}
          >
            <path
              d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M19.4 13.7a7.6 7.6 0 0 0 0-3.4l2-1.6-2-3.4-2.4.8a7.6 7.6 0 0 0-2.9-1.7L13.6 2h-3.2l-.5 2.4a7.6 7.6 0 0 0-2.9 1.7L4.6 5.3l-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3.4l-2 1.6 2 3.4 2.4-.8a7.6 7.6 0 0 0 2.9 1.7L10.4 22h3.2l.5-2.4a7.6 7.6 0 0 0 2.9-1.7l2.4.8 2-3.4-2-1.6z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <UserProfilePopover
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          anchorRef={profileTriggerRef}
          t={t}
          user={user}
          isAdminAccount={isAdminAccount}
          onContactClick={handleContactSupport}
          onDeleteClick={handleOpenDelete}
        />
      </div>

      <DeleteAccountModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        t={t}
        userEmail={user?.email}
      />
    </div>
  );
}
