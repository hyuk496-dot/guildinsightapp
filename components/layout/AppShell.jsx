'use client';

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TR } from "@/lib/theme";
import { pathnameToPageKey, PAGE_TITLES } from "@/lib/navigation";
import { useGuildInsight } from "@/context/GuildInsightProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Modal } from "@/components/shared/Modal";
import { btnGhost, btnDanger } from "@/lib/styles";

export function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const pageKey = pathnameToPageKey(pathname);
  const { dark, setDark, t, activeGuild } = useGuildInsight();
  const [logoutModal, setLogoutModal] = useState(false);

  const titleFn = PAGE_TITLES[pageKey] || PAGE_TITLES.dashboard;
  const [ptitle, psub] = titleFn(activeGuild ?? null);

  const confirmLogout = async () => {
    setLogoutModal(false);
    try {
      sessionStorage.removeItem("gi.preferredGuildName");
    } catch {}
    try {
      const { getBrowserSupabase } = await import("@/lib/supabase-browser");
      await getBrowserSupabase().auth.signOut();
    } catch (e) {
      console.warn("signOut 실패:", e);
    }
    alert("로그아웃 되었습니다.\n메인 페이지로 돌아갑니다.");
    router.replace("/");
    router.refresh();
  };

  return (
    <div
      data-theme={dark ? "dark" : "light"}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: t.bg,
        color: t.text,
        fontFamily: "'Courier New',monospace",
        transition: TR,
        overflow: "hidden",
        colorScheme: dark ? "dark" : "light",
      }}
    >
      <Topbar
        t={t}
        dark={dark}
        setDark={setDark}
        title={ptitle}
        sub={psub}
        onLogout={() => setLogoutModal(true)}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar t={t} guildName={activeGuild?.name || "선택된 길드 없음"} />
   
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: t.bg }}>
          {children}
        </div>
      </div>

      <Modal open={logoutModal} onClose={() => setLogoutModal(false)} t={t} title="로그아웃">
        <div>
          <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.7, marginBottom: 6 }}>
            <strong style={{ color: t.accent }}>{activeGuild?.name || "로딩 중..."}</strong> 운영자 계정에서 로그아웃합니다.
       
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 18 }}>저장되지 않은 변경사항은 유지됩니다.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setLogoutModal(false)} style={btnGhost(t)}>
              취소
            </button>
            <button onClick={confirmLogout} style={{ ...btnDanger(), fontWeight: 500 }}>
              로그아웃
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
