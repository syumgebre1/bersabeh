/**
 * Reception: Book appointment form.
 *
 * Needs: patient, doctor, scheduled time, duration, reason.
 * Uses the existing POST /appointments endpoint.
 */

import { ArrowLeft, CalendarPlus, Save } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { useStaffList } from "@/lib/admin";
import type { SessionUser } from "@/store/app";
import { theme } from "@/constants/theme";


interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}


export default function BookAppointment() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: users } = useStaffList();
  const patients = (users ?? []).filter((u: SessionUser) => u.role === "patient");
  const doctors  = (users ?? []).filter((u: SessionUser) => u.role === "doctor");

  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [dateStr, setDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [timeStr, setTimeStr] = useState("10:00");
  const [duration, setDuration] = useState("30");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createAppt = useMutation({
    mutationFn: () => {
      const scheduledAt = new Date(`${dateStr}T${timeStr}:00`).toISOString();
      return apiFetch("/api/v1/appointments", {
        method: "POST",
        body: JSON.stringify({
          patient_id: patientId,
          doctor_id: doctorId,
          scheduled_at: scheduledAt,
          duration_minutes: Number(duration) || 30,
          reason: reason || null,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      router.back();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Could not book appointment");
    },
  });

  const canSubmit = patientId && doctorId && dateStr && timeStr && !createAppt.isPending;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>Reception</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>New</Text>
          <Text style={styles.title}>Book appointment</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        {/* Patient picker */}
        <Text style={styles.label}>Patient</Text>
        {patients.length === 0 ? (
          <Text style={styles.mutedText}>No registered patients yet.</Text>
        ) : (
          <View style={styles.pillWrap}>
            {patients.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setPatientId(p.id)}
                style={[styles.pill, patientId === p.id && styles.pillActive]}
              >
                <Text style={[styles.pillText, patientId === p.id && styles.pillTextActive]}>
                  {p.full_name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Doctor picker */}
        <Text style={[styles.label, styles.labelSpaced]}>Doctor</Text>
        {doctors.length === 0 ? (
          <Text style={styles.mutedText}>No doctors on staff.</Text>
        ) : (
          <View style={styles.pillWrap}>
            {doctors.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => setDoctorId(d.id)}
                style={[styles.pill, doctorId === d.id && styles.pillActive]}
              >
                <Text style={[styles.pillText, doctorId === d.id && styles.pillTextActive]}>
                  {d.full_name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Date + time + duration */}
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={[styles.label, styles.labelSpaced]}>Date (YYYY-MM-DD)</Text>
            <TextInput
              value={dateStr}
              onChangeText={setDateStr}
              placeholder="2026-10-20"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />
          </View>
          <View style={styles.half}>
            <Text style={[styles.label, styles.labelSpaced]}>Time (HH:MM)</Text>
            <TextInput
              value={timeStr}
              onChangeText={setTimeStr}
              placeholder="10:00"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />
          </View>
        </View>

        <Text style={[styles.label, styles.labelSpaced]}>Duration (minutes)</Text>
        <TextInput
          value={duration}
          onChangeText={(v) => setDuration(v.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
          placeholder="30"
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.input}
        />

        <Text style={[styles.label, styles.labelSpaced]}>Reason (optional)</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Routine consultation"
          multiline
          numberOfLines={2}
          placeholderTextColor={theme.colors.mutedLight}
          style={[styles.input, styles.inputMultiline]}
        />

        <View style={styles.actions}>
          <Button label="Cancel" variant="ghost" size="md" onPress={() => router.back()} />
          <Button
            label="Book appointment"
            variant="primary"
            size="md"
            disabled={!canSubmit}
            loading={createAppt.isPending}
            leftIcon={<CalendarPlus size={14} color={theme.colors.textInverse} strokeWidth={2.2} />}
            onPress={() => createAppt.mutate()}
          />
        </View>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 800, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  errorBanner: { backgroundColor: theme.colors.dangerBg, padding: theme.spacing.md, borderRadius: theme.radius.md },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  formCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.xl, gap: theme.spacing.sm },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted },
  labelSpaced: { marginTop: theme.spacing.lg },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.muted, paddingVertical: theme.spacing.md },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  pill: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.full, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  pillTextActive: { color: theme.colors.textInverse, fontFamily: theme.fontFamily.bodyBold },
  row: { flexDirection: "row", gap: theme.spacing.md },
  half: { flex: 1 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.bg },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing.sm, marginTop: theme.spacing.xl },
});
