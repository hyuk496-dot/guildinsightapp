"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * 전역 activeGuild ↔ 화면 로컬 guildId 동기화.
 * - activeGuild 변경 시 로컬 guildId만 맞춤 (API 재호출 없음)
 * - 로컬만 바뀌고 active와 같으면 setState 생략 → 루프 방지
 */
export function useGuildIdSelection(activeGuild, guilds, { onActiveGuildSync } = {}) {
  const onSyncRef = useRef(onActiveGuildSync);
  onSyncRef.current = onActiveGuildSync;

  const [guildId, setGuildIdState] = useState(
    () => activeGuild?.id ?? guilds[0]?.id ?? null
  );

  const activeId =
    activeGuild?.id != null && activeGuild?.id !== ""
      ? Number(activeGuild.id)
      : null;

  useEffect(() => {
    if (activeId == null || !Number.isFinite(activeId)) return;
    setGuildIdState((prev) => {
      const prevNum = prev != null && prev !== "" ? Number(prev) : null;
      if (prevNum === activeId) return prev;
      onSyncRef.current?.();
      return activeGuild.id;
    });
  }, [activeId, activeGuild?.id]);

  useEffect(() => {
    if (guildId != null && guildId !== "") return;
    const first = guilds[0]?.id;
    if (first != null) setGuildIdState(first);
  }, [guilds, guildId]);

  const setGuildId = useCallback((next) => {
    setGuildIdState((prev) =>
      typeof next === "function" ? next(prev) : next
    );
  }, []);

  return [guildId, setGuildId];
}
