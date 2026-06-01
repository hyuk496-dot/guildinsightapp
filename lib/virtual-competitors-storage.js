export const VIRTUAL_COMPETITORS_KEY = "gi_virtual_competitors";
export const MAX_VIRTUAL_COMPETITORS_PER_GAME = 20;
export const MAX_SERVER_RANKS_IN_SIM = 50;

const LIMIT_ALERT_TEMPLATE =
  "로컬 스토리지 용량 제한으로 인해 {game} 라이벌 길드는 최대 {max}개까지만 등록 가능합니다.";

export function normalizeGameName(name) {
  return String(name || "").trim() || "미지정 게임";
}

export function normalizeVirtualCompetitor(row) {
  if (!row || typeof row !== "object") return null;
  const id = String(row.id || "").trim();
  const name = String(row.name || "").trim();
  const game = normalizeGameName(row.game);
  if (!id || !name) return null;
  return {
    id,
    name,
    game,
    score: Math.max(0, Math.round(Number(row.score) || 0)),
  };
}

/** @returns {Array<{ id: string, name: string, game: string, score: number }>} */
export function loadVirtualCompetitors() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VIRTUAL_COMPETITORS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeVirtualCompetitor).filter(Boolean);
  } catch {
    return [];
  }
}

export function persistVirtualCompetitors(list) {
  if (typeof window === "undefined") return { ok: false, list: [] };
  const normalized = (list || []).map(normalizeVirtualCompetitor).filter(Boolean);
  try {
    localStorage.setItem(VIRTUAL_COMPETITORS_KEY, JSON.stringify(normalized));
    return { ok: true, list: normalized };
  } catch (err) {
    const quota =
      err?.name === "QuotaExceededError" ||
      /quota/i.test(String(err?.message || ""));
    if (quota) {
      alert(
        "로컬 스토리지 용량이 부족합니다. 브라우저 저장 공간을 비운 뒤 다시 시도해 주세요."
      );
    } else {
      alert("라이벌 길드 저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.");
    }
    return { ok: false, list: normalized };
  }
}

export function filterVirtualCompetitorsByGame(list, gameName) {
  const g = normalizeGameName(gameName);
  return (list || []).filter((v) => normalizeGameName(v.game) === g);
}

export function countVirtualCompetitorsForGame(list, gameName) {
  return filterVirtualCompetitorsByGame(list, gameName).length;
}

export function createVirtualCompetitorId() {
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function virtualCompetitorsToRankRows(competitors) {
  return (competitors || []).map((v) => ({
    guildId: `virtual-${v.id}`,
    name: v.name,
    displayScore: v.score,
    ours: false,
    isVirtual: true,
  }));
}

export function assertCanAddVirtualCompetitors(list, gameName) {
  const game = normalizeGameName(gameName);
  const count = countVirtualCompetitorsForGame(list, game);
  if (count >= MAX_VIRTUAL_COMPETITORS_PER_GAME) {
    alert(
      LIMIT_ALERT_TEMPLATE.replace("{game}", game).replace(
        "{max}",
        String(MAX_VIRTUAL_COMPETITORS_PER_GAME)
      )
    );
    return false;
  }
  return true;
}

/** @deprecated 전역 제한 — 게임별 제한 사용 */
export const MAX_VIRTUAL_COMPETITORS = MAX_VIRTUAL_COMPETITORS_PER_GAME;
