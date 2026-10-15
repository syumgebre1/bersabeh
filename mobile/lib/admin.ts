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


// ============================================================
// Audit log
// ============================================================
export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  diff: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function useAuditLogs(filters: {
  action?: string;
  entity_type?: string;
  actor_id?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const params = new URLSearchParams();
  if (filters.action)      params.set("action", filters.action);
  if (filters.entity_type) params.set("entity_type", filters.entity_type);
  if (filters.actor_id)    params.set("actor_id", filters.actor_id);
  if (filters.limit)       params.set("limit", String(filters.limit));
  if (filters.offset)      params.set("offset", String(filters.offset));

  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () =>
      apiFetch<AuditLogEntry[]>(`/api/v1/audit-logs?${params.toString()}`),
  });
}


// ============================================================
// Admin management (super-admin only)
// ============================================================
export interface CreateAdminPayload {
  email: string;
  full_name: string;
  password: string;
  role: "admin" | "super_admin";
}

export function useCreateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdminPayload) =>
      apiFetch<SessionUser>("/api/v1/users", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}


// ============================================================
// Appointments (used by Doctor, Patient, Reception)
// ============================================================
export interface AppointmentRead {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  reason: string | null;
  room: string | null;
  patient?: { full_name: string; phone: string | null };
  doctor?:  { full_name: string; specialty: string | null };
}

export function useAppointments(filters: {
  status?: string;
  date?: string;
  limit?: number;
} = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.date)   params.set("date", filters.date);
  if (filters.limit)  params.set("limit", String(filters.limit));

  return useQuery({
    queryKey: ["appointments", filters],
    queryFn: () =>
      apiFetch<AppointmentRead[]>(`/api/v1/appointments?${params.toString()}`),
  });
}


// ============================================================
// Prescriptions (Doctor + Patient)
// ============================================================
export interface PrescriptionRead {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
  patient?: { full_name: string };
  items?: Array<{
    medication_name: string;
    dose: string;
    frequency: string;
    duration_days: number | null;
  }>;
}

export function usePrescriptions(filters: { status?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.limit)  params.set("limit", String(filters.limit));

  return useQuery({
    queryKey: ["prescriptions", filters],
    queryFn: () =>
      apiFetch<PrescriptionRead[]>(`/api/v1/prescriptions?${params.toString()}`),
  });
}


// ============================================================
// Lab orders (Doctor + Lab + Patient)
// ============================================================
export interface LabOrderRead {
  id: string;
  patient_id: string;
  test_name: string;
  status: string;
  priority: string;
  ordered_at: string;
  result?: {
    result_type: string;
    value_numeric: number | null;
    value_text: string | null;
    units: string | null;
  } | null;
}

export function useLabOrders(filters: { status?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.limit)  params.set("limit", String(filters.limit));

  return useQuery({
    queryKey: ["lab-orders", filters],
    queryFn: () =>
      apiFetch<LabOrderRead[]>(`/api/v1/labs?${params.toString()}`),
  });
}


// ============================================================
// Bills (Reception + Patient)
// ============================================================
export interface BillRead {
  id: string;
  patient_id: string;
  amount_etb: number;
  paid_amount_etb: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
  items?: Array<{
    description: string;
    quantity: number;
    unit_price_etb: number;
  }>;
}

export function useBills(filters: { status?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.limit)  params.set("limit", String(filters.limit));

  return useQuery({
    queryKey: ["bills", filters],
    queryFn: () =>
      apiFetch<BillRead[]>(`/api/v1/bills?${params.toString()}`),
  });
}


// ============================================================
// Threads (all roles with messaging)
// ============================================================
export interface ThreadRead {
  id: string;
  kind: string;
  subject: string | null;
  updated_at: string;
  unread_count?: number;
  participants?: Array<{
    user_id: string;
    full_name: string;
    role: string;
  }>;
}

export function useThreads() {
  return useQuery({
    queryKey: ["threads"],
    queryFn: () => apiFetch<ThreadRead[]>("/api/v1/threads"),
  });
}


// ============================================================
// Vitals (Nurse + Doctor + Patient)
// ============================================================
export interface VitalRead {
  id: string;
  patient_id: string;
  temperature_c: number | null;
  heart_rate_bpm: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  spo2_percent: number | null;
  pain_scale: number | null;
  notes: string | null;
  recorded_at: string;
}

export function useVitals(filters: { patient_id?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.patient_id) params.set("patient_id", filters.patient_id);
  if (filters.limit)      params.set("limit", String(filters.limit));

  const url = filters.patient_id
    ? `/api/v1/vitals/patient/${filters.patient_id}?${params.toString()}`
    : `/api/v1/vitals?${params.toString()}`;

  return useQuery({
    queryKey: ["vitals", filters],
    queryFn: () => apiFetch<VitalRead[]>(url),
  });
}


// ============================================================
// Vitals (create)
// ============================================================
export interface CreateVitalPayload {
  encounter_id?: string | null;
  temperature_c?: number | null;
  heart_rate_bpm?: number | null;
  respiratory_rate?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  spo2_percent?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  pain_scale?: number | null;
  notes?: string | null;
  recorded_at?: string | null;
}

export function useCreateVital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, payload }: { patientId: string; payload: CreateVitalPayload }) =>
      apiFetch(`/api/v1/vitals?patient_id=${patientId}`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vitals"] });
    },
  });
}


// ─────────────────────────────────────────────────────────────
// Appointments — patient self-booking
// ─────────────────────────────────────────────────────────────

export interface AppointmentCreatePayload {
  doctor_id: string;
  scheduled_at: string;   // ISO 8601
  duration_minutes?: number;
  reason?: string | null;
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AppointmentCreatePayload) =>
      apiFetch<AppointmentRead>("/api/v1/appointments", {
        method: "POST",
        body: JSON.stringify({
          doctor_id: payload.doctor_id,
          scheduled_at: payload.scheduled_at,
          duration_minutes: payload.duration_minutes ?? 30,
          reason: payload.reason ?? null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}


// ─────────────────────────────────────────────────────────────
// Public doctors list — for the patient booking form
// ─────────────────────────────────────────────────────────────

export interface PublicDoctor {
  id: string;
  full_name: string;
  specialty: string | null;
  photo_url: string | null;
}

export function useDoctors() {
  return useQuery({
    queryKey: ["public-doctors"],
    queryFn: () => apiFetch<PublicDoctor[]>("/api/v1/users/doctors"),
    staleTime: 5 * 60 * 1000, // 5 min — this list rarely changes
  });
}


// ─────────────────────────────────────────────────────────────
// Active patients list — for nurse/doctor/reception staff use
// ─────────────────────────────────────────────────────────────

export interface PatientBrief {
  id: string;
  full_name: string;
  phone: string | null;
  photo_url: string | null;
}

export function usePatients(search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return useQuery({
    queryKey: ["patients", search ?? "all"],
    queryFn: () => apiFetch<PatientBrief[]>(`/api/v1/users/patients${qs}`),
  });
}
