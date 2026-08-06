export const CACHE_VERSION = "health-companion-v1";

export const STATIC_CACHE_ENTRIES = [
  "/",
  "/manifest.json"
];

export function isCacheableRequest(method: string, status: number) {
  return method === "GET" && status === 200;
}
