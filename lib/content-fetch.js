/** 대시보드·시뮬레이션 API용 content / content_names 쿼리 문자열 */
export function buildContentQueryString(contentName, resolveContentDbNames) {
  const names =
    typeof resolveContentDbNames === "function"
      ? resolveContentDbNames(contentName)
      : contentName
        ? [String(contentName)]
        : [];
  const content = String(contentName || names[0] || "").trim();
  const params = new URLSearchParams();
  if (content) params.set("content", content);
  if (names.length) params.set("content_names", names.join(","));
  return params.toString();
}
