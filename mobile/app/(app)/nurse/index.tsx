/**
 * Nurse dashboard — visually distinct: ward grid + vitals + meds + handover.
 *
 * Density is high but organized as 3 columns (ward | tasks | meds), with a
 * full-width handover strip below. This mirrors the nurse's shift workflow:
 * see the floor, work the checklist, hand off at the end of shift.
 */

import {
  Activity,
  ArrowRight,
  Bed,
  ClipboardCheck,
  MessageSquare,
  Pill,
  Thermometer,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app";


interface Room {
  id: string;
  initials: string;
  patient: string;
  status: "stable" | "attention" | "critical" | "empty";
}

const ROOMS: Room[] = [
  { id: "201", initials: "AK", patient: "Abebe Kebede",  status: "stable" },
  { id: "202", initials: "SH", patient: "Sara Haile",    status: "attention" },
  { id: "203", initials: "MT", patient: "Meron Tadesse", status: "stable" },
  { id: "204", initials: "YG", patient: "Yohannes Getu", status: "stable" },
  { id: "205", initials: "HB", patient: "Hana Bekele",   status: "critical" },
  { id: "206", initials: "DA", patient: "Dawit Assefa",  status: "stable" },
  { id: "207", initials: "—",  patient: "Empty",         status: "empty" },
  { id: "208", initials: "—",  patient: "Empty",         status: "empty" },
];


function roomChip(status: Room["status"]) {
  switch (status) {
    case "critical":  return { bg: theme.colors.dangerBg, fg: theme.colors.danger };
    case "attention": return { bg: theme.colors.warningBg, fg: theme.colors.warning };
    case "empty":     return { bg: theme.colors.bgSunken, fg: theme.colors.muted };
    default:          return { bg: theme.colors.successBg, fg: theme.colors.success };
  }
}


export default function NurseDashboard() {
  const user = useAppStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 1200;
  const isMedium = width >= 800;

  const firstName = (user?.full_name ?? "Nurse").split(" ")[0];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.hello}>{firstName}'s shift</Text>
        <Text style={styles.sub}>
          Ward A · 6 patients admitted · 1 flag raised
        </Text>
      </View>

      {/* Three columns */}
      <View style={[styles.cols, !isWide && (isMedium ? styles.colsTwo : styles.colsStack)]}>
        {/* Ward grid */}
        <View style={[styles.panel, isWide && styles.panelWide]}>
          <View style={styles.panelHeader}>
            <Bed size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>Ward & rooms</Text>
            <Text style={styles.panelMeta}>6 / 8 occupied</Text>
          </View>
          <View style={styles.wardGrid}>
            {ROOMS.map((r) => {
              const c = roomChip(r.status);
              return (
                <Pressable
                  key={r.id}
                  style={({ hovered }: any) => [styles.roomCard, hovered && styles.roomCardHover]}
                >
                  <Text style={styles.roomId}>{r.id}</Text>
                  <View style={[styles.roomAvatar, { backgroundColor: c.fg }]}>
                    <Text style={styles.roomInitials}>{r.initials}</Text>
                  </View>
                  <Text style={styles.roomPatient} numberOfLines={1}>{r.patient}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Vitals to log */}
        <View style={[styles.panel, isWide && styles.panelNarrow]}>
          <View style={styles.panelHeader}>
            <Activity size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>Vitals to log</Text>
          </View>
          <View style={styles.panelBody}>
            {[
              { p: "Hana Bekele", t: "10:45", measures: ["BP", "HR", "SpO2"] },
              { p: "Sara Haile",  t: "11:00", measures: ["Temp"] },
              { p: "Abebe Kebede", t: "14:00", measures: ["BP", "HR"] },
            ].map((v, i) => (
              <View key={i} style={styles.taskRow}>
                <View style={styles.listIcon}>
                  <Thermometer size={14} color={theme.colors.secondary} strokeWidth={2.4} />
                </View>
                <View style={styles.taskContent}>
                  <Text style={styles.patientName}>{v.p}</Text>
                  <View style={styles.measureRow}>
                    <Text style={styles.timeText}>{v.t}</Text>
                    {v.measures.map((m) => (
                      <View key={m} style={styles.measureChip}>
                        <Text style={styles.measureText}>{m}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
              </View>
            ))}
          </View>
        </View>

        {/* Meds */}
        <View style={[styles.panel, isWide && styles.panelNarrow]}>
          <View style={styles.panelHeader}>
            <Pill size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>Meds · this shift</Text>
          </View>
          <View style={styles.panelBody}>
            {[
              { t: "12:00", p: "Hana Bekele", med: "Amoxicillin 500mg", done: false },
              { t: "12:30", p: "Meron Tadesse", med: "Omeprazole 20mg", done: false },
              { t: "13:00", p: "Yohannes Getu", med: "Paracetamol 1g", done: true },
            ].map((m, i) => (
              <View key={i} style={[styles.medRow, m.done && styles.medRowDone]}>
                <View style={[styles.check, m.done && styles.checkDone]}>
                  {m.done && <ClipboardCheck size={11} color={theme.colors.textInverse} strokeWidth={2.6} />}
                </View>
                <View style={styles.taskContent}>
                  <Text style={[styles.patientName, m.done && styles.strikeText]}>{m.med}</Text>
                  <Text style={styles.reason}>{m.t} · {m.p}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Handover */}
      <View style={styles.handoverCard}>
        <View style={styles.handoverHeader}>
          <ClipboardCheck size={16} color={theme.colors.primary} strokeWidth={2.2} />
          <Text style={styles.handoverTitle}>Handover notes</Text>
          <Pressable style={styles.handoverAction}>
            <MessageSquare size={13} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.handoverActionText}>Notify doctor</Text>
          </Pressable>
        </View>
        <Text style={styles.handoverBody}>
          Hana Bekele (Room 205) had a BP spike at 10:15 — 152/94. Doctor
          notified via case thread. Continue q30m monitoring overnight.
        </Text>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: {
    padding: theme.spacing.xxl,
    gap: theme.spacing.xl,
    maxWidth: 1400,
    width: "100%",
    alignSelf: "center",
  },
  greeting: { gap: 4 },
  hello: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 32, lineHeight: 38, letterSpacing: -0.6,
    color: theme.colors.text,
  },
  sub: { fontFamily: theme.fontFamily.body, fontSize: 15, color: theme.colors.muted },
  cols: { flexDirection: "row", gap: theme.spacing.lg },
  colsTwo: { flexWrap: "wrap" },
  colsStack: { flexDirection: "column" },
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    flex: 1,
  },
  panelWide: { flex: 1.4 },
  panelNarrow: { flex: 1 },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  panelTitle: {
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  panelMeta: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.muted,
  },
  panelBody: { paddingVertical: 4 },
  wardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  roomCard: {
    width: 108,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    gap: 6,
  },
  roomCardHover: {
    borderColor: theme.colors.primary,
  },
  roomId: {
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 13,
    color: theme.colors.text,
    letterSpacing: -0.1,
  },
  roomAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  roomInitials: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.textInverse,
    letterSpacing: 0.3,
  },
  roomPatient: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.muted,
    textAlign: "center",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  taskContent: { flex: 1, minWidth: 0 },
  patientName: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14,
    color: theme.colors.text,
  },
  reason: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: theme.colors.muted,
    marginTop: 2,
  },
  timeText: {
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 12,
    color: theme.colors.secondary,
    letterSpacing: 0.1,
  },
  measureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: 4,
    flexWrap: "wrap",
  },
  measureChip: {
    paddingHorizontal: 6, paddingVertical: 1,
    backgroundColor: "rgba(42,42,114,0.06)",
    borderRadius: 4,
  },
  measureText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 10.5,
    color: theme.colors.primary,
    letterSpacing: 0.3,
  },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  medRowDone: { opacity: 0.55 },
  check: {
    width: 20, height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    alignItems: "center", justifyContent: "center",
  },
  checkDone: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  strikeText: {
    textDecorationLine: "line-through",
  },
  listIcon: {
    width: 32, height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: "rgba(199,91,57,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  handoverCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  handoverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  handoverTitle: {
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  handoverAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  handoverActionText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12.5,
    color: theme.colors.primary,
  },
  handoverBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.text,
  },
});
