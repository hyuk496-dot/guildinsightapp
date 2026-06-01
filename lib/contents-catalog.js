import { CONTENTS_INIT } from "@/lib/mock-data";

export const CONTENTS_STORAGE_KEY = "gi.contents";

/** 시드 + 사용자 추가명을 순서 유지하며 중복 제거 */
export function mergeContentLists(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      const name = String(raw ?? "").trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

export function readStoredContents() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CONTENTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistContents(contents) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CONTENTS_STORAGE_KEY, JSON.stringify(contents));
  } catch {}
}

/** Provider 초기값: 시드 + 이전 세션에 저장된 사용자 컨텐츠 */
export function initialContentsState() {
  const stored = readStoredContents();
  if (stored?.length) {
    return mergeContentLists(CONTENTS_INIT, stored);
  }
  return [...CONTENTS_INIT];
}

/** scoresData[guildId][contentName] 키에서 컨텐츠명 수집 */
export function extractContentNamesFromScoresData(scoresData) {
  const names = [];
  if (!scoresData || typeof scoresData !== "object") return names;
  for (const bucket of Object.values(scoresData)) {
    if (!bucket || typeof bucket !== "object") continue;
    for (const key of Object.keys(bucket)) {
      const name = String(key ?? "").trim();
      if (name) names.push(name);
    }
  }
  return names;
}

/** API scores row[] 에서 content_name 수집 */
export function extractContentNamesFromScoreRows(rows) {
  const names = [];
  for (const row of rows || []) {
    const name = String(row?.content_name ?? "").trim();
    if (name) names.push(name);
  }
  return names;
}

/** 탭·드롭다운용 — 동적 contents 전체 순회 */
export function listContentTabs(contents) {
  return mergeContentLists(contents);
}

/** GPT 등 — "전체" 옵션 포함 */
export function buildContentFilterOptions(contents, { includeAll = true } = {}) {
  const tabs = listContentTabs(contents);
  return includeAll ? ["전체", ...tabs] : tabs;
}
