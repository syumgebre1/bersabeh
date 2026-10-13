/**
 * Doctor dashboard.
 *
 * Visual hierarchy intentionally different from patient's:
 *   - two-column split: today's schedule (left) | queue (right)
 *   - timestamps + room numbers visible (density)
 *   - quick actions row
 */

import {
  ArrowRight,
  ClipboardList,
  FlaskConical,
  MessageSquare,
  Pill,
  Stethoscope,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app";


interface ScheduleItem {
  time: string;
  patient: string;
  reason: string;
  status: "scheduled" | "checked_in" | "in_room" | "completed";
}

const TODAY: ScheduleItem[] = [
  { time: "09:00", patient: "Abebe Kebede",   reason: "Headache follow-up",     status: "completed" },
  { time: "09:30", patient: "Sara Haile",     reason: "Post-op check",          status: "completed" },
  { time: "10:00", patient: "Meron Tadesse",  reason: "Routine consultation",   status: "in_room"   },
  { time: "10:30", patient: "Yohannes Getu",  reason: "Chest pain evaluation",  status: "checked_in"},
  { time: "11:00", patient: "Hana Bekele",    reason: "Wound dressing review",  status: "scheduled" },
  { time: "11:30", patient: "Dawit Assefa",   reason: "ECG interpretation",     status: "scheduled" },
];


function statusChip(status: ScheduleItem["status"]) {
  switch (status) {
    case "completed":  return { bg: theme.colors.successBg, fg: theme.colors.success, label: "Done" };
    case "in_room":    return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: "In room" };
    case "checked_in": return { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: "Checked in" };
    default:           return { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: "Scheduled" };
  }
}


export default function DoctorDashboard() {
  const user = useAppStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;

  const firstName = (user?.full_name ?? "Doctor").split(" ").slice(-1)[0];
  const visible = TODAY.filter((i) => i.status !== "completed");
  const done = TODAY.filter((i) => i.status === "completed");

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.hello}>Dr. {firstName}</Text>
        <Text style={styles.sub}>
          You have <Text style={styles.em}>{visible.length}</Text> patients waiting · {done.length} done today
        </Text>
      </View>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <QuickAction icon={<Pill size={14} color={theme.colors.primary} strokeWidth={2.2} />} label="Prescribe" />
        <QuickAction icon={<FlaskConical size={14} color={theme.colors.primary} strokeWidth={2.2} />} label="Order lab" />
        <QuickAction icon={<ClipboardList size={14} color={theme.colors.primary} strokeWidth={2.2} />} label="Add note" />
        <QuickAction icon={<Stethoscope size={14} color={theme.colors.primary} strokeWidth={2.2} />} label="Refer" />
        <QuickAction icon={<MessageSquare size={14} color={theme.colors.primary} strokeWidth={2.2} />} label="Message" />
      </View>

      {/* Two-column: schedule | queue */}
      <View style={[styles.cols, !isWide && styles.colsStack]}>
        {/* Left — today's schedule */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Today's schedule</Text>
            <Text style={styles.panelMeta}>{TODAY.length} appointments</Text>
          </View>
          <View style={styles.panelBody}>
            {TODAY.map((item, idx) => {
              const chip = statusChip(item.status);
              return (
                <View key={`${item.time}-${idx}`}>
                  <View style={styles.scheduleRow}>
                    <View style={styles.timeCol}>
                      <Text style={styles.timeText}>{item.time}</Text>
                      <View style={[styles.timelineDot, { backgroundColor: chip.fg }]} />
                    </View>
                    <View style={styles.scheduleContent}>
                      <Text style={styles.patientName}>{item.patient}</Text>
                      <Text style={styles.reason}>{item.reason}</Text>
                    </View>
                    <View style={[styles.chip, { backgroundColor: chip.bg }]}>
                      <Text style={[styles.chipText, { color: chip.fg }]}>{chip.label}</Text>
                    </View>
                    <Pressable style={styles.rowAction}>
                      <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
                    </Pressable>
                  </View>
                  {idx < TODAY.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* Right — queue summary */}
        <View style={styles.col}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>WAITING</Text>
            <Text style={styles.statValue}>{visible.length}</Text>
            <Text style={styles.statSub}>Checked in or in-room</Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Lab results to review</Text>
              <Pressable><Text style={styles.panelLink}>See all</Text></Pressable>
            </View>
            <View style={styles.panelBody}>
              {[
                { p: "Abebe Kebede", t: "CBC", chip: "Ready" },
                { p: "Sara Haile",   t: "Glucose", chip: "Ready" },
              ].map((r, i) => (
                <View key={i} style={styles.labRow}>
                  <View style={styles.listIcon}>
                    <FlaskConical size={14} color={theme.colors.secondary} strokeWidth={2.4} />
                  </View>
                  <View style={styles.scheduleContent}>
                    <Text style={styles.patientName}>{r.p}</Text>
                    <Text style={styles.reason}>{r.t}</Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: theme.colors.successBg }]}>
                    <Text style={[styles.chipText, { color: theme.colors.success }]}>{r.chip}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}


function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Pressable style={({ hovered }: any) => [styles.quickBtn, hovered && styles.quickBtnHover]}>
      {icon}
      <Text style={styles.quickText}>{label}</Text>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: {
    padding: theme.spacing.xxl,
    gap: theme.spacing.xl,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },
  greeting: { gap: 4 },
  hello: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
    color: theme.colors.text,
  },
  sub: {
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    color: theme.colors.muted,
  },
  em: {
    fontFamily: theme.fontFamily.bodyBold,
    color: theme.colors.text,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs + 2,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
  },
  quickBtnHover: {
    borderColor: theme.colors.primary,
    backgroundColor: "rgba(42,42,114,0.02)",
  },
  quickText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    color: theme.colors.text,
  },
  cols: { flexDirection: "row", gap: theme.spacing.lg },
  colsStack: { flexDirection: "column" },
  col: { flex: 1, gap: theme.spacing.lg },
  panel: {
    flex: 1.4,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  panelTitle: {
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 14,
    color: theme.colors.text,
  },
  panelMeta: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: theme.colors.muted,
  },
  panelLink: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12.5,
    color: theme.colors.primary,
  },
  panelBody: { paddingVertical: 4 },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  timeCol: {
    width: 52,
    alignItems: "flex-start",
    gap: 6,
  },
  timeText: {
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 13.5,
    color: theme.colors.text,
    letterSpacing: -0.1,
  },
  timelineDot: {
    width: 8, height: 8, borderRadius: 4, marginLeft: 2,
  },
  scheduleContent: { flex: 1, minWidth: 0 },
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
  chip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  chipText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  rowAction: {
    padding: theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.lg,
  },
  statCard: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    gap: 2,
  },
  statLabel: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    color: theme.colors.accent,
  },
  statValue: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 40,
    color: theme.colors.textInverse,
    letterSpacing: -1,
  },
  statSub: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: "rgba(255,255,255,0.65)",
  },
  labRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  listIcon: {
    width: 32, height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: "rgba(199,91,57,0.08)",
    alignItems: "center", justifyContent: "center",
  },
});
