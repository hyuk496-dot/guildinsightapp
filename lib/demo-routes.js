/** 공개 데모 체험 경로 (Supabase 미사용) */
export const DEMO_ROUTES = {
  root: "/demo",
  dashboard: "/demo/dashboard",
};

export function isDemoPath(pathname) {
  return pathname === "/demo" || pathname.startsWith("/demo/");
}
