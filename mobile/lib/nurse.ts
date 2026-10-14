/**
 * Nurse hooks — TanStack Query wrappers for the nurse backend endpoints.
 *
 * Covers:
 *   - Rooms & bed assignments
 *   - Nurse shifts (start, end, current)
 *   - Scheduled medication doses (schedule, administer, skip)
 *   - Handover notes + sign/acknowledge flow
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { SessionUser } from "@/store/app";


// ============================================================
// Types
// ============================================================
export type RoomType = "general" | "private" | "icu" | "isolation" | "maternity";

export interface CurrentOccupant {
  assignment_id: string;
  patient: SessionUser;
  assigned_by: SessionUser;
  admitted_at: string;
  notes: string | null;
}

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
  current_occupant: CurrentOccupant | null;
}

export interface BedAssignment {
  id: string;
  room_id: string;
  patient_id: string;
  assigned_by: SessionUser;
  patient: SessionUser;
  admitted_at: string;
  discharged_at: string | null;
  discharge_reason: string | null;
  notes: string | null;
  created_at: string;
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

export interface MedicationAdministration {
  id: string;
  dose_id: string;
  administered_by: SessionUser;
  administered_at: string;
  notes: string | null;
  skip_reason: SkipReason | null;
  skip_notes: string | null;
  created_at: string;
}

export interface ScheduledDose {
  id: string;
  prescription_item_id: string;
  patient_id: string;
  patient: SessionUser;
  medication_name: string;
  dose: string;
  frequency: string;
  scheduled_for: string;
  status: DoseStatus;
  created_at: string;
  updated_at: string;
  administration: MedicationAdministration | null;
}

export type HandoverSeverity = "stable" | "attention" | "critical";
export type HandoverStatus = "pending" | "acknowledged";

export interface HandoverNote {
  id: string;
  shift_id: string;
  author: SessionUser;
  patient: SessionUser | null;
  note: string;
  severity: HandoverSeverity;
  created_at: string;
}

export interface ShiftHandover {
  id: string;
  shift_id: string;
  from_nurse: SessionUser;
  to_nurse: SessionUser | null;
  status: HandoverStatus;
  handed_over_at: string;
  acknowledged_at: string | null;
  notes: string | null;
  created_at: string;
}


// ============================================================
// Rooms
// ============================================================
export function useRooms() {
  return useQuery({
    queryKey: ["nurse", "rooms"],
    queryFn: () => apiFetch<Room[]>("/api/v1/rooms"),
  });
}

export function useRoom(roomId: string | undefined) {
  return useQuery({
    queryKey: ["nurse", "room", roomId],
    queryFn: () => apiFetch<Room>(`/api/v1/rooms/${roomId}`),
    enabled: !!roomId,
  });
}

export function useAvailableRooms() {
  return useQuery({
    queryKey: ["nurse", "rooms", "available"],
    queryFn: () => apiFetch<Room[]>("/api/v1/rooms/available"),
  });
}

export function useAssignRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, patientId, notes }: { roomId: string; patientId: string; notes?: string }) =>
      apiFetch<BedAssignment>(`/api/v1/rooms/${roomId}/assign`, {
        method: "POST",
        body: JSON.stringify({ patient_id: patientId, notes: notes ?? null }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nurse", "rooms"] });
    },
  });
}

export function useDischargeRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, discharge_reason }: { roomId: string; discharge_reason?: string }) =>
      apiFetch<BedAssignment>(`/api/v1/rooms/${roomId}/discharge`, {
        method: "POST",
        body: JSON.stringify({ discharge_reason: discharge_reason ?? null }),
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
    queryFn: () => apiFetch<NurseShift | null>("/api/v1/shifts/current"),
    staleTime: 30 * 1000,
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
export function useMedicationSchedule(params?: { from_time?: string; to_time?: string }) {
  const search = new URLSearchParams();
  if (params?.from_time) search.set("from_time", params.from_time);
  if (params?.to_time) search.set("to_time", params.to_time);
  const qs = search.toString() ? `?${search.toString()}` : "";

  return useQuery({
    queryKey: ["nurse", "medications", "schedule", params],
    queryFn: () => apiFetch<ScheduledDose[]>(`/api/v1/medications/schedule${qs}`),
    refetchInterval: 30 * 1000,
  });
}

export function useTodaysMedications() {
  return useQuery({
    queryKey: ["nurse", "medications", "today"],
    queryFn: () => apiFetch<ScheduledDose[]>("/api/v1/medications/today"),
    refetchInterval: 30 * 1000,
  });
}

export function useAdministerDose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ doseId, notes }: { doseId: string; notes?: string }) =>
      apiFetch<MedicationAdministration>(`/api/v1/medications/${doseId}/administer`, {
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
      skip_reason,
      skip_notes,
    }: {
      doseId: string;
      skip_reason: SkipReason;
      skip_notes?: string;
    }) =>
      apiFetch<MedicationAdministration>(`/api/v1/medications/${doseId}/skip`, {
        method: "POST",
        body: JSON.stringify({
          skip_reason,
          skip_notes: skip_notes ?? null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nurse", "medications"] });
    },
  });
}


// ============================================================
// Handover
// ============================================================
export function useHandoverNotes(shiftId?: string) {
  const qs = shiftId ? `?shift_id=${shiftId}` : "";
  return useQuery({
    queryKey: ["nurse", "handover", "notes", shiftId ?? "current"],
    queryFn: () => apiFetch<HandoverNote[]>(`/api/v1/handover/notes${qs}`),
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
      apiFetch<HandoverNote>("/api/v1/handover/notes", {
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
