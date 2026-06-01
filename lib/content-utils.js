/**
 * 컨텐츠 명칭 비교·API 쿼리 — UI에서 전달한 이름(및 rename 별칭)만 사용.
 * 하드코딩된 '주간 활약' / '총력전' 매칭은 하지 않습니다.
 */

/** @param {string} rowContentName @param {string} filterContentName @param {string[]} [dbNames] */
export function matchesContentName(rowContentName, filterContentName, dbNames) {
  const row = String(rowContentName || "");
  if (Array.isArray(dbNames) && dbNames.length > 0) {
    return dbNames.includes(row);
  }
  const filter = String(filterContentName || "");
  return filter ? row === filter : false;
}

/** Supabase content_name 필터용 이름 목록 */
export function contentNameDbFilter(contentName, aliases = []) {
  const c = String(contentName || "").trim();
  const extra = (Array.isArray(aliases) ? aliases : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  if (!c && extra.length === 0) return [];
  return [...new Set([c, ...extra].filter(Boolean))];
}

/** GET ?content=&content_names= 파싱 */
export function parseContentNamesFromSearchParams(searchParams, fallbackContent = "") {
  const content =
    searchParams.get("content")?.trim() ||
    String(fallbackContent || "").trim();
  const raw = searchParams.get("content_names");
  if (raw) {
    const names = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length) {
      return {
        content: content || names[0],
        names: [...new Set(names)],
      };
    }
  }
  const names = contentNameDbFilter(content);
  return { content: content || names[0] || "", names };
}

export function applyContentNameFilterToQuery(query, names) {
  if (!names?.length) return query;
  if (names.length === 1) return query.eq("content_name", names[0]);
  return query.in("content_name", names);
}
