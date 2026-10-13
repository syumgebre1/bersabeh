/**
 * Admin operations — mutations + queries for the CMS.
 *
 * Every admin action goes through here. This file is the only place
 * that talks to /content/* and /users/* admin endpoints.
 *
 * Cache invalidation:
 *   - Writes to a content block invalidate BOTH the CMS list ("content-blocks")
 *     AND the public bundle ("content-bundle") so the landing page reflects
 *     the change on next focus.
 *   - Approve/reject invalidate "users-pending" and "users".
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { apiFetch, ApiError } from "@/lib/api";
import type { SessionUser } from "@/store/app";


// ============================================================
// Types
// ============================================================
export type ContentCategory =
  | "landing"
  | "clinic_info"
  | "departments"
  | "services"
  | "doctors"
  | "about"
  | "legal";

export interface ContentBlockRead {
  id: string;
  key: string;
  locale: string;
  value: unknown;
  category: ContentCategory;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  updated_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentBlockBrief {
  id: string;
  key: string;
  locale: string;
  category: ContentCategory;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
}

export interface ContentBundle {
  locale: string;
  content: Record<string, unknown>;
  count: number;
}

export interface UpsertContentPayload {
  key: string;
  locale?: string;
  value: unknown;
  category: ContentCategory;
  description?: string | null;
  sort_order?: number;
}

export interface UpdateContentPayload {
  value?: unknown;
  description?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface CreateStaffPayload {
  email: string;
  full_name: string;
  role: "admin" | "doctor" | "nurse" | "reception" | "lab";
  phone?: string;
  specialty?: string;
  years_experience?: number;
  license_number?: string;
  bio?: string;
}


// ============================================================
// Queries
// ============================================================
export function useContentBundle(locale: string) {
  return useQuery({
    queryKey: ["content-bundle", locale],
    queryFn: () =>
      apiFetch<ContentBundle>(`/api/v1/content?locale=${encodeURIComponent(locale)}`, {
        auth: false,
      }),
    staleTime: 60 * 1000,
  });
}

export function useContentBlocks(filters: {
  category?: ContentCategory;
  locale?: string;
  search?: string;
  is_active?: boolean;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.locale) params.set("locale", filters.locale);
  if (filters.search) params.set("search", filters.search);
  if (filters.is_active !== undefined)
    params.set("is_active", String(filters.is_active));
  if (filters.limit) params.set("limit", String(filters.limit));

  return useQuery({
    queryKey: ["content-blocks", filters],
    queryFn: () =>
      apiFetch<ContentBlockBrief[]>(
        `/api/v1/content/blocks?${params.toString()}`
      ),
  });
}

export function useContentBlock(id: string, opts?: Partial<UseQueryOptions>) {
  return useQuery({
    queryKey: ["content-block", id],
    queryFn: () => apiFetch<ContentBlockRead>(`/api/v1/content/${id}`),
    enabled: !!id,
    ...opts,
  });
}

export function usePendingPatients() {
  return useQuery({
    queryKey: ["users-pending"],
    queryFn: () =>
      apiFetch<
        Array<{
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          created_at: string;
        }>
      >("/api/v1/users/pending"),
  });
}

export function useStaffList(role?: string) {
  const params = role ? `?role=${role}` : "";
  return useQuery({
    queryKey: ["users", { role }],
    queryFn: () =>
      apiFetch<SessionUser[]>(`/api/v1/users${params}`),
  });
}


// ============================================================
// Content mutations
// ============================================================
export function useUpsertContentBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertContentPayload) =>
      apiFetch<ContentBlockRead>("/api/v1/content", {
        method: "POST",
        body: JSON.stringify({
          locale: "en",
          sort_order: 0,
          ...payload,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-blocks"] });
      qc.invalidateQueries({ queryKey: ["content-bundle"] });
    },
  });
}

export function useUpdateContentBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateContentPayload }) =>
      apiFetch<ContentBlockRead>(`/api/v1/content/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-blocks"] });
      qc.invalidateQueries({ queryKey: ["content-bundle"] });
    },
  });
}

export function useDeleteContentBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ContentBlockRead>(`/api/v1/content/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-blocks"] });
      qc.invalidateQueries({ queryKey: ["content-bundle"] });
    },
  });
}

export function useReorderContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; sort_order: number }[]) =>
      apiFetch<{ updated: number }>("/api/v1/content/reorder", {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-blocks"] });
    },
  });
}


// ============================================================
// Patient approval mutations
// ============================================================
export function useApprovePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<SessionUser>(`/api/v1/users/${userId}/approve`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-pending"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useRejectPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      apiFetch<SessionUser>(`/api/v1/users/${userId}/reject`, {
        method: "POST",
        body: JSON.stringify({ approve: false, reason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-pending"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}


// ============================================================
// Staff mutations
// ============================================================
export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateStaffPayload) => {
      // Backend expects POST /users with staff fields
      return apiFetch<SessionUser>("/api/v1/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
