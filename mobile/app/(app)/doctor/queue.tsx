/**
 * Doctor: Patient queue — trilingual.
 */

import { ArrowLeft, ArrowRight, Users } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { useAppointments } from "@/lib/admin";
import { theme } from "@/constants/theme";


const STATUS_KEYS = ["all", "scheduled", "checked_in", "in_room", "completed"];


function statusChip(status: string, t: (k: string) => string) {
  switch (status) {
    case "completed":  return { bg: theme.colors.successBg, fg: theme.colors.success, label: t("status.completed") };
    case "in_room":    return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: t("status.inRoom") };
    case "checked_in": return { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: t("status.checkedIn") };
    case "cancelled":  return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: t("status.cancelled") };
    default:           return { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: t("status.scheduled") };
  }
}


export default function DoctorQueue() {
  const { t } = useTranslation();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const { data: appts, isLoading, isError, refetch } = useAppointments({ limit: 200 });

  const filtered = useMemo(() => {
    const list = appts ?? [];
    if (filter === "all") return list;
    return list.filter((a) => a.status === filter);
  }, [appts, filter]);

  const filterLabel = (key: string) => {
    if (key === "all") return t("superAdmin.all");
    if (key === "scheduled") return t("status.scheduled");
    if (key === "checked_in") return t("status.checkedIn");
    if (key === "in_room") return t("status.inRoom");
    if (key === "completed") return t("status.completed");
    return key;
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>{t("doctor.roleName")}</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.title}>{t("doctor.patientQueue")}</Text>
        </View>
        <Text style={styles.count}>{filtered.length}</Text>
      </View>

      {/* Filters */}
      <View style={styles.pillRow}>
        {STATUS_KEYS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setFilter(s)}
            style={[styles.pill, filter === s && styles.pillActive]}
          >
            <Text style={[styles.pillText, filter === s && styles.pillTextActive]}>
              {filterLabel(s)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{t("common.error")}</Text>
          <Button label={t("common.retry")} variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Users size={32} color={theme.colors.muted} strokeWidth={1.6} />
          <Text style={styles.mutedText}>{t("doctor.noAppointmentsToday")}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((a, idx) => {
            const c = statusChip(a.status, t);
            return (
              <View
                key={a.id}
                style={[styles.row, idx < filtered.length - 1 && styles.rowBorder]}
              >
                <View style={styles.timeCol}>
                  <Text style={styles.time}>
                    {new Date(a.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  <Text style={styles.date}>
                    {new Date(a.scheduled_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </Text>
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.patient}>{a.patient?.full_name ?? "—"}</Text>
                  <Text style={styles.reason}>{a.reason ?? t("doctor.generalVisit")}</Text>
                  {a.room ? (
                    <Text style={styles.room}>{t("patient.appointments.room")} {a.room}</Text>
                  ) : null}
                </View>
                <View style={[styles.chip, { backgroundColor: c.bg }]}>
                  <Text style={[styles.chipText, { color: c.fg }]}>{c.label}</Text>
                </View>
                <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.lg, maxWidth: 1100, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  count: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
  pill: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.radius.full, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, cursor: "pointer" as any },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.text },
  pillTextActive: { color: theme.colors.textInverse },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  timeCol: { width: 60, alignItems: "flex-start" },
  time: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, color: theme.colors.text, letterSpacing: -0.1 },
  date: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.muted, marginTop: 2 },
  rowContent: { flex: 1, minWidth: 0 },
  patient: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14.5, color: theme.colors.text },
  reason: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2 },
  room: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.primary, marginTop: 2 },
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
});
