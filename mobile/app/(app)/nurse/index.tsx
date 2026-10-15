/**
 * Nurse dashboard — real data from backend.
 */

import {
  Activity, Bed, CalendarClock, ClipboardCheck, MessageSquare, Pill, Thermometer,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from "react-native";

import { useCreateHandoverNote, useCurrentShift, useRooms, useStartShift, useTodaysMedications } from "@/lib/nurse";
import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app";


export default function NurseDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 1200;
  const isMedium = width >= 800;

  const { data: rooms, isLoading: roomsLoading } = useRooms();
  const { data: shift, isLoading: shiftLoading } = useCurrentShift();
  const { data: meds, isLoading: medsLoading } = useTodaysMedications();
  const startShift = useStartShift();

  const firstName = (user?.full_name ?? "").split(" ")[0] || "";

  // Auto-start a shift if none exists (for demo convenience — remove in prod)
  useEffect(() => {
    if (!shiftLoading && shift === null && user?.role === "nurse") {
      startShift.mutate("Ward A");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftLoading, shift]);

  const occupied = (rooms ?? []).filter((r) => r.is_occupied);
  const pendingMeds = (meds ?? []).filter((m) => m.status === "pending");

  const roomChip = (status: string) => {
    switch (status) {
      case "critical":  return { bg: theme.colors.dangerBg,  fg: theme.colors.danger };
      case "attention": return { bg: theme.colors.warningBg, fg: theme.colors.warning };
      case "empty":     return { bg: theme.colors.bgSunken,  fg: theme.colors.muted };
      default:          return { bg: theme.colors.successBg, fg: theme.colors.success };
    }
  };

  const shiftLabel = shift
    ? new Date(shift.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.hello}>
          {firstName} · {t("nurse.shift")}
        </Text>
        <Text style={styles.sub}>
          {shift ? `${shift.ward} · ` : ""}
          {occupied.length} / {(rooms ?? []).length} {t("nurse.occupied")}
          {shift ? ` · ${t("nurse.startedAt")} ${shiftLabel}` : ""}
        </Text>
      </View>

      {/* Three columns */}
      <View style={[styles.cols, !isWide && (isMedium ? styles.colsTwo : styles.colsStack)]}>
        {/* Ward grid */}
        <View style={[styles.panel, isWide && styles.panelWide]}>
          <View style={styles.panelHeader}>
            <Bed size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>{t("nurse.wardAndRooms")}</Text>
            <Text style={styles.panelMeta}>{occupied.length} / {(rooms ?? []).length}</Text>
          </View>
          <View style={styles.wardGrid}>
            {roomsLoading ? (
              <View style={styles.emptyRow}><ActivityIndicator size="small" color={theme.colors.primary} /></View>
            ) : (rooms ?? []).length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>{t("nurse.noRooms")}</Text>
              </View>
            ) : (
              (rooms ?? []).map((r) => {
                const c = r.is_occupied ? roomChip("stable") : roomChip("empty");
                const initials = r.current_occupant
                  ? r.current_occupant.patient.full_name.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()
                  : "—";
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => router.push(`/(app)/nurse/rooms/${r.id}` as any)}
                    style={({ hovered }: any) => [styles.roomCard, hovered && styles.roomCardHover]}
                  >
                    <Text style={styles.roomId}>{r.number}</Text>
                    <View style={[styles.roomAvatar, { backgroundColor: c.fg }]}>
                      <Text style={styles.roomInitials}>{initials}</Text>
                    </View>
                    <Text style={styles.roomPatient} numberOfLines={1}>
                      {r.current_occupant?.patient.full_name ?? "—"}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>

        {/* Vitals to log — quick links to vitals page */}
        <View style={[styles.panel, isWide && styles.panelNarrow]}>
          <View style={styles.panelHeader}>
            <Activity size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>{t("nurse.vitalsToLog")}</Text>
          </View>
          <View style={styles.panelBody}>
            {occupied.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>{t("nurse.noPatients")}</Text>
              </View>
            ) : (
              occupied.slice(0, 5).map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => router.push("/(app)/nurse/vitals" as any)}
                  style={({ hovered }: any) => [styles.taskRow, hovered && styles.rowHover]}
                >
                  <View style={styles.listIcon}>
                    <Thermometer size={14} color={theme.colors.secondary} strokeWidth={2.4} />
                  </View>
                  <View style={styles.taskContent}>
                    <Text style={styles.patientName}>{r.current_occupant?.patient.full_name ?? "—"}</Text>
                    <Text style={styles.reason}>{t("patient.appointments.room")} {r.number}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>

        {/* Meds */}
        <View style={[styles.panel, isWide && styles.panelNarrow]}>
          <View style={styles.panelHeader}>
            <Pill size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>{t("nurse.medsThisShift")}</Text>
            <Text style={styles.panelMeta}>{pendingMeds.length}</Text>
          </View>
          <View style={styles.panelBody}>
            {medsLoading ? (
              <View style={styles.emptyRow}><ActivityIndicator size="small" color={theme.colors.primary} /></View>
            ) : pendingMeds.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>{t("nurse.noMedsToday")}</Text>
              </View>
            ) : (
              pendingMeds.slice(0, 3).map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => router.push("/(app)/nurse/medications" as any)}
                  style={({ hovered }: any) => [styles.medRow, hovered && styles.rowHover]}
                >
                  <View style={styles.check} />
                  <View style={styles.taskContent}>
                    <Text style={styles.patientName}>{m.medication_name} {m.dose}</Text>
                    <Text style={styles.reason}>
                      {new Date(m.scheduled_for).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {m.patient?.full_name ?? "—"}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </View>

      {/* Handover */}
      <View style={styles.handoverCard}>
        <View style={styles.handoverHeader}>
          <ClipboardCheck size={16} color={theme.colors.primary} strokeWidth={2.2} />
          <Text style={styles.handoverTitle}>{t("nurse.handoverNotes")}</Text>
          <Pressable
            onPress={() => router.push("/(app)/nurse/handover" as any)}
            style={({ hovered }: any) => [styles.handoverAction, hovered && styles.rowHover]}
          >
            <MessageSquare size={13} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.handoverActionText}>{t("common.viewAll")}</Text>
          </Pressable>
        </View>
        <Text style={styles.handoverBody}>
          {shift
            ? `${t("nurse.startedAt")} ${shiftLabel} · ${t("nurse.wardLabel")} ${shift.ward}`
            : t("nurse.noActiveShift")}
        </Text>
      </View>

      {/* Notify doctor shortcut */}
      <Pressable
        onPress={() => router.push("/(app)/nurse/messages" as any)}
        style={({ hovered }: any) => [styles.notifyCta, hovered && styles.notifyHover]}
      >
        <MessageSquare size={18} color={theme.colors.textInverse} strokeWidth={2.2} />
        <View style={{ flex: 1 }}>
          <Text style={styles.notifyTitle}>{t("nurse.notifyDoctor")}</Text>
          <Text style={styles.notifySub}>{t("nurse.notifyDoctorSub")}</Text>
        </View>
        <CalendarClock size={16} color={theme.colors.textInverse} strokeWidth={2.2} />
      </Pressable>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 1400, width: "100%", alignSelf: "center" },
  greeting: { gap: 4 },
  hello: { fontFamily: theme.fontFamily.heading, fontSize: 32, lineHeight: 38, letterSpacing: -0.6, color: theme.colors.text },
  sub: { fontFamily: theme.fontFamily.body, fontSize: 15, color: theme.colors.muted },
  cols: { flexDirection: "row", gap: theme.spacing.lg },
  colsTwo: { flexWrap: "wrap" },
  colsStack: { flexDirection: "column" },
  panel: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden", flex: 1 },
  panelWide: { flex: 1.4 },
  panelNarrow: { flex: 1 },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  panelTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, color: theme.colors.text, flex: 1 },
  panelMeta: { fontFamily: theme.fontFamily.body, fontSize: 12, color: theme.colors.muted },
  panelBody: { paddingVertical: 4 },
  wardGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, padding: theme.spacing.lg },
  roomCard: { width: 108, padding: theme.spacing.md, backgroundColor: theme.colors.bg, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", gap: 6, cursor: "pointer" as any },
  roomCardHover: { borderColor: theme.colors.primary },
  roomId: { fontFamily: theme.fontFamily.headingMedium, fontSize: 13, color: theme.colors.text, letterSpacing: -0.1 },
  roomAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  roomInitials: { fontFamily: theme.fontFamily.bodyBold, fontSize: 12, color: theme.colors.textInverse, letterSpacing: 0.3 },
  roomPatient: { fontFamily: theme.fontFamily.body, fontSize: 11, color: theme.colors.muted, textAlign: "center" },
  taskRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, cursor: "pointer" as any },
  rowHover: { backgroundColor: "rgba(42,42,114,0.02)" },
  taskContent: { flex: 1, minWidth: 0 },
  patientName: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.text },
  reason: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2 },
  medRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, cursor: "pointer" as any },
  check: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: theme.colors.borderStrong, alignItems: "center", justifyContent: "center" },
  listIcon: { width: 32, height: 32, borderRadius: theme.radius.sm, backgroundColor: "rgba(199,91,57,0.08)", alignItems: "center", justifyContent: "center" },
  emptyRow: { padding: theme.spacing.lg, alignItems: "center" },
  emptyText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.muted },
  handoverCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg, gap: theme.spacing.md },
  handoverHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  handoverTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, color: theme.colors.text, flex: 1 },
  handoverAction: { flexDirection: "row", alignItems: "center", gap: 4, cursor: "pointer" as any, padding: theme.spacing.xs },
  handoverActionText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.primary },
  handoverBody: { fontFamily: theme.fontFamily.body, fontSize: 14, lineHeight: 21, color: theme.colors.text },
  notifyCta: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, padding: theme.spacing.lg, cursor: "pointer" as any },
  notifyHover: { opacity: 0.94 },
  notifyTitle: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: theme.colors.textInverse },
  notifySub: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: "rgba(255,255,255,0.75)", marginTop: 2 },
});
