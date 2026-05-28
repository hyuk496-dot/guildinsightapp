'use client';

import { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { THEMES } from "@/lib/theme";
import { CONTENTS_INIT } from "@/lib/mock-data";
import { ROUTES } from "@/lib/navigation";
import {
  groupMembersByGuildId,
  removeGuildFromMembers,
} from "@/lib/members-utils";
import { filterActiveMembers } from "@/lib/member-status";
import { formatScoresFromApi } from "@/lib/radar-utils";

const GuildInsightContext = createContext(null);

const ZOOM_KEY = "gi.ui.zoom";
const ZOOM_MIN = 0.9;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;

function clampZoom(v) {
  const n = Math.round(Number(v) * 10) / 10;
  if (!Number.isFinite(n)) return 1;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, n));
}

function readStoredZoom() {
  if (typeof window === "undefined") return 1;
  try {
    return clampZoom(localStorage.getItem(ZOOM_KEY) || 1);
  } catch {
    return 1;
  }
}

export function GuildInsightProvider({
  children,
  initialGuilds = [],
  initialUser = null,
}) {
  const router = useRouter();
  const [dark, setDark] = useState(true);
  const [zoom, setZoomState] = useState(1);
  const t = dark ? THEMES.dark : THEMES.light;

  useEffect(() => {
    setZoomState(readStoredZoom());
  }, []);

  useEffect(() => {
    document.body.style.zoom = String(zoom);
    try {
      localStorage.setItem(ZOOM_KEY, String(zoom));
    } catch {}
    return () => {
      document.body.style.zoom = "";
    };
  }, [zoom]);

  const setZoom = useCallback((next) => {
    setZoomState((z) => clampZoom(typeof next === "function" ? next(z) : next));
  }, []);
  const zoomIn = useCallback(
    () => setZoom((z) => clampZoom(z + ZOOM_STEP)),
    [setZoom]
  );
  const zoomOut = useCallback(
    () => setZoom((z) => clampZoom(z - ZOOM_STEP)),
    [setZoom]
  );

  // 서버에서 RLS 로 필터링된 길드만 받아 시작 상태로 사용
  const normalizedInitial = (initialGuilds || []).map((g) => ({
    ...g,
    game: g.game_name || g.game || "미지정 게임",
  }));
  const [guilds, setGuilds] = useState(normalizedInitial);
  const [membersData, setMembersData] = useState({});
  const [membersLoading, setMembersLoading] = useState(true);
  const [scoresData, setScoresData] = useState({});
  const [scoresLoading, setScoresLoading] = useState(true);
  const [contribsData, setContribsData] = useState({});
  const [contribsLoading, setContribsLoading] = useState(true);
  const [activeGuild, setActiveGuild] = useState(null);
  const [contents, setContents] = useState(CONTENTS_INIT);
  const [ocrSession, setOcrSession] = useState(null);

  const [user] = useState(initialUser);

  useEffect(() => {
    if (!initialUser?.id) {
      router.replace("/billing?auth=required");
    }
  }, [initialUser, router]);

  // 초기 활성 길드 결정: sessionStorage 우선 힌트 → profile.last_managed_guild_id → 첫 번째
  const initialActivePickedRef = useRef(false);

  const pickInitialActive = useCallback(
    (list) => {
      if (!list || list.length === 0) return null;

      let preferredName = null;
      try {
        if (typeof window !== "undefined") {
          preferredName = sessionStorage.getItem("gi.preferredGuildName");
        }
      } catch {}

      if (preferredName) {
        const matched = list.find((g) => g.name === preferredName);
        if (matched) {
          try {
            sessionStorage.removeItem("gi.preferredGuildName");
          } catch {}
          return matched;
        }
      }

      if (initialUser?.lastManagedGuildId) {
        const matched = list.find(
          (g) => Number(g.id) === Number(initialUser.lastManagedGuildId)
        );
        if (matched) return matched;
      }

      return list[0];
    },
    [initialUser]
  );

  useEffect(() => {
    if (initialActivePickedRef.current) return;
    if (normalizedInitial.length === 0) return;
    setActiveGuild(pickInitialActive(normalizedInitial));
    initialActivePickedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const response = await fetch("/api/members");
      if (!response.ok) throw new Error("멤버 조회 실패");
      const data = await response.json();
      setMembersData(groupMembersByGuildId(data));
    } catch (error) {
      console.error("멤버 데이터 로드 실패:", error);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const refreshScores = useCallback(async () => {
    setScoresLoading(true);
    try {
      const response = await fetch("/api/scores");
      if (!response.ok) throw new Error("점수 조회 실패");
      const data = await response.json();
      setScoresData(formatScoresFromApi(data));
    } catch (error) {
      console.error("점수 데이터 로드 실패:", error);
      setScoresData({});
    } finally {
      setScoresLoading(false);
    }
  }, []);

  const refreshContribs = useCallback(async () => {
    setContribsLoading(true);
    try {
      const response = await fetch("/api/contributions");
      if (!response.ok) throw new Error("기여도 조회 실패");
      const data = await response.json();
      if (Array.isArray(data)) {
        setContribsData({});
      } else {
        setContribsData(data);
      }
    } catch (error) {
      console.error("기여도 로드 실패:", error);
      setContribsData({});
    } finally {
      setContribsLoading(false);
    }
  }, []);

  const refreshGuilds = useCallback(async () => {
    try {
      const response = await fetch("/api/guilds");
      if (!response.ok) throw new Error("길드 조회 실패");
      const data = await response.json();
      const normalized = (data || []).map((g) => ({
        ...g,
        game: g.game_name || g.game || "미지정 게임",
      }));
      setGuilds(normalized);

      setActiveGuild((prev) => {
        if (!prev) return pickInitialActive(normalized);
        const fresh = normalized.find(
          (g) => Number(g.id) === Number(prev.id)
        );
        if (fresh) {
          return { ...prev, ...fresh, game: fresh.game_name || fresh.game };
        }
        return pickInitialActive(normalized);
      });
      return normalized;
    } catch (error) {
      console.error("길드 데이터 로드 실패:", error);
      return [];
    }
  }, [pickInitialActive]);

  const persistLastManagedGuild = useCallback(async (guildId) => {
    if (!guildId) return;
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ last_managed_guild_id: guildId }),
      });
    } catch (err) {
      console.warn("last_managed_guild_id 저장 실패:", err);
    }
  }, []);

  const selectGuild = useCallback(
    (guild) => {
      setActiveGuild(guild);
      if (guild?.id) persistLastManagedGuild(guild.id);
      router.push(ROUTES.dashboard);
    },
    [router, persistLastManagedGuild]
  );

  // activeGuild 가 바뀔 때 프로필에 자동 저장
  useEffect(() => {
    if (activeGuild?.id) {
      persistLastManagedGuild(activeGuild.id);
    }
  }, [activeGuild?.id, persistLastManagedGuild]);

  const deleteGuild = useCallback(
    async (guildId) => {
      try {
        const response = await fetch("/api/guilds", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: guildId }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || "삭제 실패");
        }
        setGuilds((prev) => prev.filter((g) => g.id !== guildId));
        setMembersData((prev) => removeGuildFromMembers(prev, guildId));
        setActiveGuild((prev) => (prev?.id === guildId ? null : prev));
        await refreshGuilds();
        await refreshMembers();
        await refreshScores();
        await refreshContribs();
      } catch (error) {
        console.error("삭제 에러:", error);
        alert(error.message || "삭제 실패");
      }
    },
    [refreshGuilds, refreshMembers, refreshScores, refreshContribs]
  );

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        refreshGuilds(),
        refreshMembers(),
        refreshScores(),
        refreshContribs(),
      ]);
    };
    init();
  }, [refreshGuilds, refreshMembers, refreshScores, refreshContribs]);

  // 멤버 목록 로드 후 activeGuild / guilds 의 member_count 동기화
  useEffect(() => {
    if (!guilds.length) return;
    setGuilds((prev) =>
      prev.map((g) => {
        const list = membersData[String(g.id)] ?? membersData[g.id];
        if (!Array.isArray(list)) return g;
        return { ...g, member_count: filterActiveMembers(list).length };
      })
    );
    setActiveGuild((prev) => {
      if (!prev?.id) return prev;
      const list = membersData[String(prev.id)] ?? membersData[prev.id];
      if (!Array.isArray(list)) return prev;
      return { ...prev, member_count: filterActiveMembers(list).length };
    });
  }, [membersData]); // eslint-disable-line react-hooks/exhaustive-deps -- guilds는 의도적으로 제외(루프 방지)

  const addGuild = useCallback(async (name, game) => {
    const response = await fetch("/api/guilds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, game }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "서버 저장 실패");
    }
    const newGuild = await response.json();
    setGuilds((prev) => [...prev, newGuild]);
    return newGuild;
  }, []);

  const completeOcrScan = useCallback(
    (meta) => {
      setOcrSession({
        fileName: meta?.fileName || "guild_score.png",
        completedAt: meta?.completedAt || new Date().toLocaleString("ko-KR"),
        rows: meta?.rows || [],
        preview: meta?.preview || null,
        avgConf: meta?.avgConf ?? 0,
        processingMs: meta?.processingMs ?? 0,
        rawText: meta?.rawText || "",
        guildId: meta?.guildId ?? null,
        contentName: meta?.contentName ?? null,
        sourceType: meta?.sourceType || "ocr",
      });
      router.push(ROUTES.ocr);
    },
    [router]
  );

  const setMembersDataNormalized = useCallback((updater) => {
    setMembersData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return groupMembersByGuildId(next);
    });
  }, []);

  const value = useMemo(
    () => ({
      dark,
      setDark,
      zoom,
      setZoom,
      zoomIn,
      zoomOut,
      t,
      user,
      guilds,
      setGuilds,
      membersData,
      setMembersData: setMembersDataNormalized,
      membersLoading,
      refreshMembers,
      refreshGuilds,
      scoresData,
      setScoresData,
      scoresLoading,
      refreshScores,
      contribsData,
      setContribsData,
      contribsLoading,
      refreshContribs,
      activeGuild,
      setActiveGuild,
      contents,
      setContents,
      ocrSession,
      setOcrSession,
      addGuild,
      selectGuild,
      deleteGuild,
      completeOcrScan,
    }),
    [
      dark,
      zoom,
      setZoom,
      zoomIn,
      zoomOut,
      t,
      user,
      guilds,
      membersData,
      setMembersDataNormalized,
      membersLoading,
      refreshMembers,
      refreshGuilds,
      scoresData,
      scoresLoading,
      refreshScores,
      contribsData,
      contribsLoading,
      refreshContribs,
      activeGuild,
      contents,
      ocrSession,
      addGuild,
      selectGuild,
      deleteGuild,
      completeOcrScan,
    ]
  );

  return <GuildInsightContext.Provider value={value}>{children}</GuildInsightContext.Provider>;
}

export function useGuildInsight() {
  const ctx = useContext(GuildInsightContext);
  if (!ctx) throw new Error("useGuildInsight must be used within GuildInsightProvider");
  return ctx;
}

/** Provider 밖(게스트 빌링 등)에서도 안전하게 테마/유저를 읽을 때 */
export function useOptionalGuildInsight() {
  return useContext(GuildInsightContext);
}
