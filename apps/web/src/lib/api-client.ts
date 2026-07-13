/**
 * Shared fetch helper that targets the Go API (apps/api).
 * Legacy Next.js routes under /api remain in the repo but are unused.
 */
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"
).replace(/\/$/, "");

export function getApiBaseUrl() {
  return API_URL;
}

export function apiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalized}`;
}

export function apiFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers,
  });
}
