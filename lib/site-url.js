/**
 * 배포 환경(Vercel)에서 올바른 공개 URL origin 반환
 * @param {Request | import('next/server').NextRequest} request
 */
export function getSiteOrigin(request) {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

/**
 * @param {Request | import('next/server').NextRequest} request
 * @param {string} path
 */
export function getSiteUrl(request, path) {
  const base = getSiteOrigin(request);
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
