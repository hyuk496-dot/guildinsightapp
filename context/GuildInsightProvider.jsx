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
import { formatScoresFromApi } from "@/lib/radar-utils";

const GuildInsightContext = createContext(null);

export function GuildInsightProvider({
  children,
  initialGuilds = [],
  initialUser = null,
}) {
  const router = useRouter();
  const [dark, setDark] = useState(true);
  const t = dark ? THEMES.dark : THEMES.light;

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
      setGuilds(data);

      setActiveGuild((prev) => {
        if (prev && data.some((g) => g.id === prev.id)) return prev;
        return pickInitialActive(data);
      });
      return data;
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
      await Promise.all([refreshMembers(), refreshScores(), refreshContribs()]);
    };
    init();
  }, [refreshMembers, refreshScores, refreshContribs]);

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
