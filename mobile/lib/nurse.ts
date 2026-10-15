/**
 * Nurse hooks — TanStack Query wrappers for the nurse backend endpoints.
 *
 * Backend contract:
 *   GET    /rooms                                  → Room[] (with current_patient, occupied: 0/1)
 *   GET    /rooms/:id                              → Room
 *   POST   /rooms/:id/assign   {patient_id, reason}
 *   POST   /rooms/:id/discharge {notes}
 *   GET    /shifts/current                         → NurseShift | null
 *   POST   /shifts/start       {ward}
 *   POST   /shifts/end         {}
 *   GET    /shifts/handover/pending                → ShiftHandover[]
 *   POST   /shifts/handover    {to_nurse_id, notes}
 *   POST   /shifts/handover/:id/acknowledge {}
 *   GET    /medications/schedule?window_hours=N    → ScheduledDose[]
 *   GET    /medications/patient/:id                → ScheduledDose[]
 *   POST   /medications/:doseId/administer {notes}
 *   POST   /medications/:doseId/skip       {reason, notes}
 *   GET    /handover?patient_id=X                  → HandoverNote[]
 *   POST   /handover           {patient_id?, severity, note}
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch, ApiError } from "@/lib/api";
import type { SessionUser } from "@/store/app";


// ============================================================
// Types — matching backend exactly
// ============================================================
export type RoomType = "general" | "private" | "icu" | "isolation" | "maternity";

export interface PatientBrief {
  id: string;
  full_name: string;
  phone?: string | null;
}

/** Backend response from GET /rooms — raw shape */
interface RawRoom {
  id: string;
  number: string;
  ward: string;
  floor: string | null;
  room_type: RoomType;
  capacity: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  current_patient: PatientBrief | null;
  current_assignment_id: string | null;
  occupied: number;
}

/** Frontend-friendly Room — what the pages use */
export interface Room {
  id: string;
  number: string;
  ward: string;
  floor: string | null;
  room_type: RoomType;
  capacity: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_occupied: boolean;
  current_occupant: {
    assignment_id: string;
    patient: PatientBrief;
  } | null;
}

function adaptRoom(r: RawRoom): Room {
  return {
    id: r.id,
    number: r.number,
    ward: r.ward,
    floor: r.floor,
    room_type: r.room_type,
    capacity: r.capacity,
    is_active: r.is_active,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
    is_occupied: r.occupied > 0 && !!r.current_patient,
    current_occupant:
      r.current_patient && r.current_assignment_id
        ? { assignment_id: r.current_assignment_id, patient: r.current_patient }
        : null,
  };
}


export interface NurseShift {
  id: string;
  nurse: SessionUser;
  ward: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}


export type DoseStatus = "pending" | "administered" | "skipped" | "cancelled";
export type SkipReason =
  | "patient_refused"
  | "patient_absent"
  | "npo"
  | "adverse_reaction"
  | "doctor_hold"
  | "other";

export interface ScheduledDose {
  id: string;
  prescription_item_id: string;
  patient_id: string;
  medication_name: string;
  dose: string;
  frequency: string;
  scheduled_for: string;
  status: DoseStatus;
  patient: PatientBrief | null;

  administered_at: string | null;
  administered_by_id: string | null;
  skip_reason: SkipReason | null;
  skip_notes: string | null;
  notes: string | null;
}


export type HandoverSeverity = "stable" | "attention" | "critical";
export type HandoverStatus = "pending" | "acknowledged";

export interface HandoverNote {
  id: string;
  shift_id: string;
  author_id: string;
  patient_id: string | null;
  note: string;
  severity: HandoverSeverity;
  created_at: string;
  author: PatientBrief | null;
  patient: PatientBrief | null;
}

export interface ShiftHandover {
  id: string;
  shift_id: string;
  from_nurse_id: string;
  to_nurse_id: string | null;
  status: HandoverStatus;
  handed_over_at: string;
  acknowledged_at: string | null;
  notes: string | null;
  created_at: string;
  from_nurse: PatientBrief | null;
  to_nurse: PatientBrief | null;
}


// ============================================================
// Rooms
// ============================================================
export function useRooms() {
  return useQuery({
    queryKey: ["nurse", "rooms"],
    queryFn: async () => {
      const raw = await apiFetch<RawRoom[]>("/api/v1/rooms");
      return raw.map(adaptRoom);
    },
    refetchInterval: 30 * 1000,
  });
}

export function useRoom(roomId: string | undefined) {
  return useQuery({
    queryKey: ["nurse", "room", roomId],
    queryFn: async () => {
      const raw = await apiFetch<RawRoom>(`/api/v1/rooms/${roomId}`);
      return adaptRoom(raw);
    },
    enabled: !!roomId,
  });
}

/** No dedicated endpoint — compute client-side */
export function useAvailableRooms() {
  const { data: rooms, ...rest } = useRooms();
  return { data: rooms?.filter((r) => !r.is_occupied), ...rest };
}

export function useAssignRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, patientId, reason }: { roomId: string; patientId: string; reason?: string }) =>
      apiFetch(`/api/v1/rooms/${roomId}/assign`, {
        method: "POST",
        body: JSON.stringify({ patient_id: patientId, reason: reason ?? null }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nurse", "rooms"] });
    },
  });
}

export function useDischargeRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, notes }: { roomId: string; notes?: string }) =>
      apiFetch(`/api/v1/rooms/${roomId}/discharge`, {
        method: "POST",
        body: JSON.stringify({ notes: notes ?? null }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nurse", "rooms"] });
    },
  });
}


// ============================================================
// Shifts
// ============================================================
export function useCurrentShift() {
  return useQuery({
    queryKey: ["nurse", "shift", "current"],
    queryFn: async () => {
      try {
        return await apiFetch<NurseShift>("/api/v1/shifts/current");
      } catch (err) {
        // Backend may return 404 when there is no active shift
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useStartShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ward: string = "Ward A") =>
      apiFetch<NurseShift>("/api/v1/shifts/start", {
        method: "POST",
        body: JSON.stringify({ ward }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nurse", "shift"] });
    },
  });
}

export function useEndShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<NurseShift>("/api/v1/shifts/end", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nurse", "shift"] });
    },
  });
}


// ============================================================
// Medications
// ============================================================
export function useMedicationSchedule(params?: { window_hours?: number; patient_id?: string }) {
  const search = new URLSearchParams();
  if (params?.window_hours) search.set("window_hours", String(params.window_hours));
  if (params?.patient_id) search.set("patient_id", params.patient_id);
  const qs = search.toString() ? `?${search.toString()}` : "?window_hours=24";

  return useQuery({
    queryKey: ["nurse", "medications", "schedule", params],
    queryFn: () => apiFetch<ScheduledDose[]>(`/api/v1/medications/schedule${qs}`),
    refetchInterval: 30 * 1000,
  });
}

/** Kept for API compatibility — maps to /schedule with a 24h window. */
export function useTodaysMedications() {
  return useMedicationSchedule({ window_hours: 24 });
}

export function useAdministerDose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ doseId, notes }: { doseId: string; notes?: string }) =>
      apiFetch<ScheduledDose>(`/api/v1/medications/${doseId}/administer`, {
        method: "POST",
        body: JSON.stringify({ notes: notes ?? null }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nurse", "medications"] });
    },
  });
}

export function useSkipDose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      doseId,
      reason,
      notes,
    }: {
      doseId: string;
      reason: SkipReason;
      notes?: string;
    }) =>
      apiFetch<ScheduledDose>(`/api/v1/medications/${doseId}/skip`, {
        method: "POST",
        body: JSON.stringify({ reason, notes: notes ?? null }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nurse", "medications"] });
    },
  });
}


// ============================================================
// Handover
// ============================================================
export function useHandoverNotes(params?: { patient_id?: string; limit?: number }) {
  const search = new URLSearchParams();
  if (params?.patient_id) search.set("patient_id", params.patient_id);
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString() ? `?${search.toString()}` : "";

  return useQuery({
    queryKey: ["nurse", "handover", "notes", params],
    queryFn: () => apiFetch<HandoverNote[]>(`/api/v1/handover${qs}`),
    refetchInterval: 30 * 1000,
  });
}

export function useCreateHandoverNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      note,
      severity,
      patient_id,
    }: {
      note: string;
      severity: HandoverSeverity;
      patient_id?: string;
    }) =>
      apiFetch<HandoverNote>("/api/v1/handover", {
        method: "POST",
        body: JSON.stringify({
          note,
          severity,
          patient_id: patient_id ?? null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nurse", "handover"] });
    },
  });
}

export function useSignHandover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ toNurseId, notes }: { toNurseId?: string; notes?: string }) =>
      apiFetch<ShiftHandover>("/api/v1/shifts/handover", {
        method: "POST",
        body: JSON.stringify({
          to_nurse_id: toNurseId ?? null,
          notes: notes ?? null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nurse", "handover"] });
    },
  });
}

export function usePendingHandovers() {
  return useQuery({
    queryKey: ["nurse", "handover", "pending"],
    queryFn: () => apiFetch<ShiftHandover[]>("/api/v1/shifts/handover/pending"),
    refetchInterval: 30 * 1000,
  });
}

export function useAcknowledgeHandover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (handoverId: string) =>
      apiFetch<ShiftHandover>(`/api/v1/shifts/handover/${handoverId}/acknowledge`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nurse", "handover"] });
    },
  });
}
