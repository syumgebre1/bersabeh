/**
 * Patient: Book a new appointment — trilingual.
 */

import { ArrowLeft, Calendar, Check, Clock, User as UserIcon } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { useCreateAppointment, useDoctors } from "@/lib/admin";
import { theme } from "@/constants/theme";


// Generate 30-min time slots from 08:00 to 17:30
function generateSlots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h <= 17; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 17 || true) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

// Generate next 14 selectable days (today excluded — must be future)
function generateDays(): Array<{ iso: string; dayNum: number; month: string; weekday: string }> {
  const out: Array<{ iso: string; dayNum: number; month: string; weekday: string }> = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      dayNum: d.getDate(),
      month: d.toLocaleDateString("en", { month: "short" }),
      weekday: d.toLocaleDateString("en", { weekday: "short" }),
    });
  }
  return out;
}


export default function NewAppointment() {
  const { t } = useTranslation();
  const router = useRouter();

  const { data: doctors, isLoading: doctorsLoading } = useDoctors();
  const createAppt = useCreateAppointment();

  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [dateIso, setDateIso] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(generateDays, []);
  const slots = useMemo(generateSlots, []);

  const canSubmit = doctorId && dateIso && time && !createAppt.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      // Build local datetime, then send ISO with timezone offset.
      const [hh, mm] = time!.split(":").map(Number);
      const dt = new Date(`${dateIso}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`);
      await createAppt.mutateAsync({
        doctor_id: doctorId!,
        scheduled_at: dt.toISOString(),
        duration_minutes: 30,
        reason: reason.trim() || null,
      });
      router.replace("/(app)/patient" as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>{t("patient.roleName")}</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>{t("patient.appointments.bookNew")}</Text>
          <Text style={styles.title}>{t("patient.appointments.newTitle")}</Text>
        </View>
      </View>

      {/* 1. Doctor picker */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <UserIcon size={14} color={theme.colors.primary} strokeWidth={2.2} />
          <Text style={styles.sectionLabel}>{t("patient.appointments.selectDoctor")}</Text>
        </View>

        {doctorsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : !doctors || doctors.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t("patient.appointments.noDoctors")}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {doctors.map((d, idx) => (
              <Pressable
                key={d.id}
                onPress={() => setDoctorId(d.id)}
                style={({ hovered }: any) => [
                  styles.doctorRow,
                  idx < doctors.length - 1 && styles.doctorRowBorder,
                  hovered && styles.rowHover,
                ]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {d.full_name.replace(/^Dr\.?\s+/i, "")
                      .split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
                  </Text>
                </View>
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{d.full_name}</Text>
                  <Text style={styles.doctorMeta}>{d.specialty ?? ""}</Text>
                </View>
                <View style={[styles.radio, doctorId === d.id && styles.radioActive]}>
                  {doctorId === d.id ? (
                    <Check size={11} color={theme.colors.textInverse} strokeWidth={3} />
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* 2. Date picker */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={14} color={theme.colors.primary} strokeWidth={2.2} />
          <Text style={styles.sectionLabel}>{t("patient.appointments.selectDate")}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
          {days.map((d) => {
            const active = dateIso === d.iso;
            return (
              <Pressable
                key={d.iso}
                onPress={() => setDateIso(d.iso)}
                style={[styles.dayCard, active && styles.dayCardActive]}
              >
                <Text style={[styles.dayWeekday, active && styles.dayTextActive]}>{d.weekday}</Text>
                <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{d.dayNum}</Text>
                <Text style={[styles.dayMonth, active && styles.dayTextActive]}>{d.month}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Time picker */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Clock size={14} color={theme.colors.primary} strokeWidth={2.2} />
          <Text style={styles.sectionLabel}>{t("patient.appointments.selectTime")}</Text>
        </View>
        <View style={styles.slotGrid}>
          {slots.map((s) => {
            const active = time === s;
            return (
              <Pressable
                key={s}
                onPress={() => setTime(s)}
                style={[styles.slot, active && styles.slotActive]}
              >
                <Text style={[styles.slotText, active && styles.slotTextActive]}>{s}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 4. Reason */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("patient.appointments.reason")}</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder={t("patient.appointments.reasonPlaceholder")}
          placeholderTextColor={theme.colors.mutedLight}
          multiline
          numberOfLines={3}
          style={styles.textarea}
        />
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label={t("common.cancel")}
          variant="ghost"
          size="md"
          onPress={() => router.back()}
        />
        <Button
          label={createAppt.isPending ? t("common.saving") : t("patient.appointments.confirmBooking")}
          variant="primary"
          size="md"
          loading={createAppt.isPending}
          disabled={!canSubmit}
          onPress={handleSubmit}
        />
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 900, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  section: { gap: theme.spacing.sm },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  sectionLabel: { fontFamily: theme.fontFamily.headingMedium, fontSize: 13, letterSpacing: 1.0, textTransform: "uppercase", color: theme.colors.muted },
  loadingBox: { padding: theme.spacing.xl, alignItems: "center" },
  emptyBox: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg, alignItems: "center" },
  emptyText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.muted },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  doctorRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, cursor: "pointer" as any },
  doctorRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowHover: { backgroundColor: "rgba(42,42,114,0.02)" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13, color: theme.colors.textInverse, letterSpacing: 0.3 },
  doctorInfo: { flex: 1, minWidth: 0 },
  doctorName: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14.5, color: theme.colors.text },
  doctorMeta: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: theme.colors.borderStrong, alignItems: "center", justifyContent: "center" },
  radioActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dayRow: { gap: theme.spacing.sm, paddingVertical: 2 },
  dayCard: { width: 64, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: "center", gap: 2, cursor: "pointer" as any },
  dayCardActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dayWeekday: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 10.5, letterSpacing: 0.4, color: theme.colors.muted, textTransform: "uppercase" },
  dayNumber: { fontFamily: theme.fontFamily.heading, fontSize: 22, color: theme.colors.text, letterSpacing: -0.5 },
  dayMonth: { fontFamily: theme.fontFamily.body, fontSize: 10.5, color: theme.colors.muted },
  dayTextActive: { color: theme.colors.textInverse },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  slot: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border, cursor: "pointer" as any },
  slotActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  slotText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  slotTextActive: { color: theme.colors.textInverse },
  textarea: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.surface, minHeight: 80, textAlignVertical: "top" },
  errorBanner: { backgroundColor: theme.colors.dangerBg, padding: theme.spacing.md, borderRadius: theme.radius.md },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing.sm, marginTop: theme.spacing.md },
});
