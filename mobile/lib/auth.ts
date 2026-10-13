/**
 * Auth mutations + queries.
 *
 * Every auth-related network call goes through this file:
 *   - login / register / logout (mutations)
 *   - fetch current user (query) — used to refresh the cached user
 *
 * All successful mutations write to the Zustand store. The store is the
 * single source of truth for "who is logged in and what role are they".
 *
 * Role → dashboard path mapping lives here (getDashboardRoute).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAppStore, type SessionUser } from "@/store/app";


// ============================================================
// Types
// ============================================================
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPatientPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface RegisterPatientResponse {
  message: string;
  user: SessionUser;
}


// ============================================================
// Role → route mapping (single source of truth)
// ============================================================
export function getDashboardRoute(role: string): string {
  switch (role) {
    case "super_admin": return "/(app)/super-admin";
    case "admin":       return "/(app)/admin";
    case "doctor":      return "/(app)/doctor";
    case "nurse":       return "/(app)/nurse";
    case "reception":   return "/(app)/reception";
    case "lab":         return "/(app)/lab";
    case "patient":     return "/(app)/patient";
    default:            return "/(public)";
  }
}


// ============================================================
// Login
// ============================================================
export function useLogin() {
  const setSession = useAppStore((s) => s.setSession);

  return useMutation({
    mutationFn: async (payload: LoginPayload): Promise<SessionUser> => {
      // 1. Get tokens
      const tokens = await apiFetch<TokenResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
        auth: false,
      });

      // 2. Fetch the user with the new access token
      const user = await apiFetch<SessionUser>("/api/v1/users/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        auth: false,
      });

      // 3. Persist everything
      setSession({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        user,
      });

      return user;
    },
  });
}


// ============================================================
// Patient self-registration
// ============================================================
export function useRegisterPatient() {
  return useMutation({
    mutationFn: (payload: RegisterPatientPayload) =>
      apiFetch<RegisterPatientResponse>("/api/v1/auth/register/patient", {
        method: "POST",
        body: JSON.stringify(payload),
        auth: false,
      }),
  });
}


// ============================================================
// Logout
// ============================================================
export function useLogout() {
  const { accessToken, refreshToken, clearSession } = useAppStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!refreshToken) return;
      try {
        await apiFetch("/api/v1/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // Logout is idempotent — ignore network failures.
      }
    },
    onSettled: () => {
      // Always clear local state, even if the server call failed.
      clearSession();
      queryClient.clear();
    },
  });
}


// ============================================================
// Fetch current user (keeps the cached user fresh)
// ============================================================
export function useCurrentUser() {
  const accessToken = useAppStore((s) => s.accessToken);
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);

  return useQuery({
    queryKey: ["current-user"],
    enabled: !!accessToken,
    initialData: user ?? undefined,
    queryFn: async () => {
      const fresh = await apiFetch<SessionUser>("/api/v1/users/me");
      setUser(fresh);
      return fresh;
    },
    staleTime: 5 * 60 * 1000,   // 5 min
  });
}
