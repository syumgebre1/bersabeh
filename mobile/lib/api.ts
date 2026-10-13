/**
 * API client for Bersabeh Clinic backend.
 *
 * Two layers:
 *   1. `apiFetch` — low-level fetch wrapper. Adds auth headers, handles
 *      JSON parsing, throws on non-2xx with a typed error.
 *   2. Query helpers — thin TanStack Query wrappers used by screens.
 *
 * Token handling:
 *   Access token comes from the Zustand store. If a 401 is returned,
 *   we attempt a single refresh via /auth/refresh using the refresh token.
 *   On success, we retry the original request once. On failure, we clear
 *   the session (logged-out state).
 *
 * Base URL:
 *   Read from constants/config.ts, which is derived from EXPO_PUBLIC_API_URL
 *   or app.json extra. Never hardcode.
 */

import { config } from "@/constants/config";
import { useAppStore } from "@/store/app";


// ============================================================
// Error type
// ============================================================
export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}


// ============================================================
// Low-level fetch
// ============================================================
type ApiFetchOptions = RequestInit & {
  auth?: boolean;        // default: true — attach Bearer token
  retry401?: boolean;    // internal
};

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { auth = true, retry401 = true, ...rest } = options;
  const store = useAppStore.getState();
  const url = path.startsWith("http") ? path : `${config.apiUrl}${path}`;

  const headers = new Headers(rest.headers ?? {});
  if (!headers.has("Content-Type") && rest.body && !(rest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (auth && store.accessToken) {
    headers.set("Authorization", `Bearer ${store.accessToken}`);
  }

  const response = await fetch(url, { ...rest, headers });

  // ---- Handle 401 by attempting one refresh ----
  if (response.status === 401 && auth && retry401 && store.refreshToken) {
    const refreshed = await _attemptRefresh();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, retry401: false });
    }
  }

  // ---- Parse response body ----
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }

  if (!response.ok) {
    const detail =
      (body && typeof body === "object" && (body.detail || body.message)) ||
      (typeof body === "string" ? body : "") ||
      response.statusText ||
      "Request failed";
    throw new ApiError(response.status, String(detail));
  }

  return body as T;
}


// ============================================================
// Refresh helper
// ============================================================
async function _attemptRefresh(): Promise<boolean> {
  const store = useAppStore.getState();
  if (!store.refreshToken) return false;
  try {
    const res = await fetch(`${config.apiUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: store.refreshToken }),
    });
    if (!res.ok) {
      store.clearSession();
      return false;
    }
    const data = (await res.json()) as { access_token: string; refresh_token: string };
    store.setTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });
    return true;
  } catch {
    store.clearSession();
    return false;
  }
}


// ============================================================
// Public content endpoints — used by the landing page
// ============================================================
export interface ContentBundle {
  locale: string;
  content: Record<string, any>;
  count: number;
}

export function fetchContentBundle(locale: string): Promise<ContentBundle> {
  return apiFetch<ContentBundle>(`/api/v1/content?locale=${encodeURIComponent(locale)}`, {
    auth: false,
  });
}
