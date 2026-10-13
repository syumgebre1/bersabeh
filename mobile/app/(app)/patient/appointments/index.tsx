/**
 * Patient: All appointments list.
 */

import { ArrowLeft, ArrowRight, CalendarClock } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { useAppointments } from "@/lib/admin";
import { theme } from "@/constants/theme";


function statusChip(status: string, t: (k: string) => string) {
  switch (status) {
    case "completed":  return { bg: theme.colors.successBg, fg: theme.colors.success, label: t("status.completed") };
    case "in_room":    return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: t("status.inRoom") };
    case "checked_in": return { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: t("status.checkedIn") };
    case "cancelled":  return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: t("status.cancelled") };
    default:           return { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: t("status.scheduled") };
  }
}


export default function PatientAppointments() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: appts, isLoading, isError, refetch } = useAppointments({ limit: 100 });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>{t("common.back")}</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.title}>{t("patient.appointments.appointments")}</Text>
        </View>
        <Text style={styles.count}>{appts?.length ?? 0}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="small" color={theme.colors.primary} /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{t("common.error")}</Text>
          <Button label={t("common.retry")} variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : !appts || appts.length === 0 ? (
        <View style={styles.center}>
          <CalendarClock size={32} color={theme.colors.muted} strokeWidth={1.6} />
          <Text style={styles.mutedText}>{t("patient.appointments.noRecords")}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {appts.map((a, idx) => {
            const c = statusChip(a.status, t);
            const when = new Date(a.scheduled_at);
            return (
              <Pressable
                key={a.id}
                onPress={() => router.push(`/(app)/patient/appointments/${a.id}` as any)}
                style={({ hovered }: any) => [
                  styles.row,
                  idx < appts.length - 1 && styles.rowBorder,
                  hovered && styles.rowHover,
                ]}
              >
                <View style={styles.dateBadge}>
                  <Text style={styles.dateMonth}>
                    {when.toLocaleDateString([], { month: "short" }).toUpperCase()}
                  </Text>
                  <Text style={styles.dateDay}>{when.getDate()}</Text>
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{a.doctor?.full_name ?? t("patient.prescriptions.yourDoctor")}</Text>
                  <Text style={styles.rowSub}>
                    {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {a.doctor?.specialty ? ` · ${a.doctor.specialty}` : ""}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: c.bg }]}>
                  <Text style={[styles.chipText, { color: c.fg }]}>{c.label}</Text>
                </View>
                <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.lg, maxWidth: 1000, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  count: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowHover: { backgroundColor: "rgba(42,42,114,0.02)" },
  dateBadge: { width: 50, height: 50, borderRadius: theme.radius.sm, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  dateMonth: { fontFamily: theme.fontFamily.bodyBold, fontSize: 9, letterSpacing: 0.8, color: theme.colors.accent },
  dateDay: { fontFamily: theme.fontFamily.heading, fontSize: 18, color: theme.colors.textInverse, letterSpacing: -0.4 },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14.5, color: theme.colors.text },
  rowSub: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 3 },
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
});
