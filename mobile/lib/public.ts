/**
 * Public API hooks — no auth required.
 *
 * Currently: booking request submission from the landing page.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";


// ─────────────────────────────────────────────────────────────
// Public booking requests
// ─────────────────────────────────────────────────────────────

export interface BookingRequestPayload {
  full_name: string;
  phone: string;
  email?: string | null;
  doctor_id?: string | null;
  preferred_at?: string | null;      // ISO 8601
  reason?: string | null;
}

export interface BookingRequestPublicResponse {
  id: string;
  status: string;
  preferred_at: string | null;
  doctor_name: string | null;
}

export function useCreateBookingRequest() {
  return useMutation({
    mutationFn: (payload: BookingRequestPayload) =>
      apiFetch<BookingRequestPublicResponse>("/api/v1/booking-requests", {
        method: "POST",
        body: JSON.stringify({
          full_name: payload.full_name.trim(),
          phone: payload.phone.trim(),
          email: payload.email?.trim() || null,
          doctor_id: payload.doctor_id ?? null,
          preferred_at: payload.preferred_at ?? null,
          reason: payload.reason?.trim() || null,
        }),
      }),
  });
}


// ─────────────────────────────────────────────────────────────
// Staff-facing list (reception/admin)
// ─────────────────────────────────────────────────────────────

export interface BookingRequestRead {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  doctor_id: string | null;
  preferred_at: string | null;
  reason: string | null;
  status: "new" | "contacted" | "converted" | "cancelled" | "expired";
  contacted_at: string | null;
  converted_at: string | null;
  converted_patient_id: string | null;
  converted_appointment_id: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useBookingRequests(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return useQuery({
    queryKey: ["booking-requests", status ?? "all"],
    queryFn: () => apiFetch<BookingRequestRead[]>(`/api/v1/booking-requests${qs}`),
  });
}

export function useMarkBookingContacted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<BookingRequestRead>(`/api/v1/booking-requests/${id}/contact`, {
        method: "POST",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking-requests"] }),
  });
}

export function useCancelBookingRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<BookingRequestRead>(`/api/v1/booking-requests/${id}/cancel`, {
        method: "POST",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking-requests"] }),
  });
}

export interface ConvertPayload {
  existing_patient_id?: string | null;
  scheduled_at: string;
  duration_minutes?: number;
  reason?: string | null;
  notes?: string | null;
}

export function useConvertBookingRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ConvertPayload }) =>
      apiFetch<BookingRequestRead>(`/api/v1/booking-requests/${id}/convert`, {
        method: "POST",
        body: JSON.stringify({
          existing_patient_id: payload.existing_patient_id ?? null,
          scheduled_at: payload.scheduled_at,
          duration_minutes: payload.duration_minutes ?? 30,
          reason: payload.reason ?? null,
          notes: payload.notes ?? null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-requests"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
