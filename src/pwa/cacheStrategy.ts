export const CACHE_VERSION = "health-companion-v2";

export const STATIC_CACHE_ENTRIES = [
  "/",
  "/index.html",
  "/app.js",
  "/manifest.json",
];

export function isCacheableRequest(method: string, status: number) {
  return method === "GET" && status === 200;
}
