/**
 * Doctor dashboard — all buttons wired to real sub-routes.
 */

import {
  ArrowRight,
  ClipboardList,
  FlaskConical,
  MessageSquare,
  Pill,
  Stethoscope,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { useAppointments, useLabOrders } from "@/lib/admin";
import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app";


function statusChip(status: string) {
  switch (status) {
    case "completed":  return { bg: theme.colors.successBg, fg: theme.colors.success, label: "Done" };
    case "in_room":    return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: "In room" };
    case "checked_in": return { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: "Checked in" };
    default:           return { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: "Scheduled" };
  }
}


export default function DoctorDashboard() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;

  const { data: appts } = useAppointments({ limit: 100 });
  const { data: labs }  = useLabOrders({ status: "completed", limit: 10 });

  const firstName = (user?.full_name ?? "Doctor").split(" ").slice(-1)[0];
  const visible = (appts ?? []).filter((a) => a.status !== "completed").slice(0, 6);
  const doneCount = (appts ?? []).filter((a) => a.status === "completed").length;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.hello}>Dr. {firstName}</Text>
        <Text style={styles.sub}>
          You have <Text style={styles.em}>{visible.length}</Text> patients waiting · {doneCount} done today
        </Text>
      </View>

      {/* Quick actions — all wired */}
      <View style={styles.quickRow}>
        <QuickAction
          Icon={Pill}
          label="Prescribe"
          onPress={() => router.push("/(app)/doctor/prescribe" as any)}
        />
        <QuickAction
          Icon={FlaskConical}
          label="Order lab"
          onPress={() => router.push("/(app)/doctor/labs" as any)}
        />
        <QuickAction
          Icon={ClipboardList}
          label="Queue"
          onPress={() => router.push("/(app)/doctor/queue" as any)}
        />
        <QuickAction
          Icon={Stethoscope}
          label="Today"
          onPress={() => router.push("/(app)/doctor" as any)}
        />
        <QuickAction
          Icon={MessageSquare}
          label="Messages"
          onPress={() => router.push("/(app)/doctor/messages" as any)}
        />
      </View>

      {/* Two-column: schedule | queue */}
      <View style={[styles.cols, !isWide && styles.colsStack]}>
        {/* Today's schedule */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Today's schedule</Text>
            <Pressable onPress={() => router.push("/(app)/doctor/queue" as any)}>
              <Text style={styles.panelMeta}>{appts?.length ?? 0} appointments →</Text>
            </Pressable>
          </View>
          <View style={styles.panelBody}>
            {visible.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No appointments today.</Text>
              </View>
            ) : (
              visible.map((item, idx) => {
                const chip = statusChip(item.status);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push("/(app)/doctor/queue" as any)}
                    style={({ hovered }: any) => [styles.scheduleRow, hovered && styles.rowHover]}
                  >
                    <View style={styles.timeCol}>
                      <Text style={styles.timeText}>
                        {new Date(item.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                      <View style={[styles.timelineDot, { backgroundColor: chip.fg }]} />
                    </View>
                    <View style={styles.scheduleContent}>
                      <Text style={styles.patientName}>{item.patient?.full_name ?? "—"}</Text>
                      <Text style={styles.reason}>{item.reason ?? "General visit"}</Text>
                    </View>
                    <View style={[styles.chip, { backgroundColor: chip.bg }]}>
                      <Text style={[styles.chipText, { color: chip.fg }]}>{chip.label}</Text>
                    </View>
                    <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
                  </Pressable>
                );
              })
            )}
          </View>
        </View>

        {/* Queue summary */}
        <View style={styles.col}>
          <Pressable
            onPress={() => router.push("/(app)/doctor/queue" as any)}
            style={({ hovered }: any) => [styles.statCard, hovered && styles.statHover]}
          >
            <Text style={styles.statLabel}>WAITING</Text>
            <Text style={styles.statValue}>{visible.length}</Text>
            <Text style={styles.statSub}>Tap to view full queue →</Text>
          </Pressable>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Lab results to review</Text>
              <Pressable onPress={() => router.push("/(app)/doctor/labs" as any)}>
                <Text style={styles.panelLink}>See all</Text>
              </Pressable>
            </View>
            <View style={styles.panelBody}>
              {(labs ?? []).length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>No completed lab orders.</Text>
                </View>
              ) : (
                (labs ?? []).slice(0, 3).map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => router.push("/(app)/doctor/labs" as any)}
                    style={({ hovered }: any) => [styles.labRow, hovered && styles.rowHover]}
                  >
                    <View style={styles.listIcon}>
                      <FlaskConical size={14} color={theme.colors.secondary} strokeWidth={2.4} />
                    </View>
                    <View style={styles.scheduleContent}>
                      <Text style={styles.patientName}>{r.test_name}</Text>
                      <Text style={styles.reason}>
                        {r.result?.value_numeric ?? r.result?.value_text ?? "—"} {r.result?.units ?? ""}
                      </Text>
                    </View>
                    <View style={[styles.chip, { backgroundColor: theme.colors.successBg }]}>
                      <Text style={[styles.chipText, { color: theme.colors.success }]}>Ready</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}


function QuickAction({
  Icon, label, onPress,
}: {
  Icon: typeof Pill;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [styles.quickBtn, hovered && styles.quickBtnHover]}
    >
      <Icon size={14} color={theme.colors.primary} strokeWidth={2.2} />
      <Text style={styles.quickText}>{label}</Text>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 1200, width: "100%", alignSelf: "center" },
  greeting: { gap: 4 },
  hello: { fontFamily: theme.fontFamily.heading, fontSize: 32, lineHeight: 38, letterSpacing: -0.6, color: theme.colors.text },
  sub: { fontFamily: theme.fontFamily.body, fontSize: 15, color: theme.colors.muted },
  em: { fontFamily: theme.fontFamily.bodyBold, color: theme.colors.text },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  quickBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs + 2, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md },
  quickBtnHover: { borderColor: theme.colors.primary, backgroundColor: "rgba(42,42,114,0.02)" },
  quickText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  cols: { flexDirection: "row", gap: theme.spacing.lg },
  colsStack: { flexDirection: "column" },
  col: { flex: 1, gap: theme.spacing.lg },
  panel: { flex: 1.4, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  panelTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, color: theme.colors.text },
  panelMeta: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.primary },
  panelLink: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.primary },
  panelBody: { paddingVertical: 4 },
  scheduleRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  rowHover: { backgroundColor: "rgba(42,42,114,0.02)" },
  timeCol: { width: 52, alignItems: "flex-start", gap: 6 },
  timeText: { fontFamily: theme.fontFamily.headingMedium, fontSize: 13.5, color: theme.colors.text, letterSpacing: -0.1 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 2 },
  scheduleContent: { flex: 1, minWidth: 0 },
  patientName: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.text },
  reason: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2 },
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
  statCard: { backgroundColor: theme.colors.primaryDark, borderRadius: theme.radius.md, padding: theme.spacing.lg, gap: 2 },
  statHover: { opacity: 0.94 },
  statLabel: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.2, color: theme.colors.accent },
  statValue: { fontFamily: theme.fontFamily.heading, fontSize: 40, color: theme.colors.textInverse, letterSpacing: -1 },
  statSub: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: "rgba(255,255,255,0.65)" },
  labRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  listIcon: { width: 32, height: 32, borderRadius: theme.radius.sm, backgroundColor: "rgba(199,91,57,0.08)", alignItems: "center", justifyContent: "center" },
  emptyRow: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg, alignItems: "center" },
  emptyText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.muted },
});
