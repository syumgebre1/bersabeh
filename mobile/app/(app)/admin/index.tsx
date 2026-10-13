/**
 * Admin dashboard — KPIs + approvals queue + staff + recent activity.
 */

import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BedDouble,
  CalendarDays,
  CircleDollarSign,
  UserCheck,
  UserCog,
  Users,
  X,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app";


interface KPI {
  label: string;
  value: string;
  hint: string;
  Icon: typeof Activity;
  tone: "primary" | "secondary" | "accent" | "success";
}

const KPIS: KPI[] = [
  { label: "Today's appointments", value: "24",  hint: "8 completed · 16 pending", Icon: CalendarDays,       tone: "primary"   },
  { label: "Registered patients",  value: "847", hint: "+12 this week",           Icon: Users,              tone: "secondary" },
  { label: "Staff on duty",        value: "11",  hint: "4 doctors · 3 nurses",    Icon: UserCheck,          tone: "accent"    },
  { label: "Revenue today",        value: "4,250", hint: "ETB · 12 payments",     Icon: CircleDollarSign,   tone: "success"   },
];


function kpiTone(tone: KPI["tone"]) {
  switch (tone) {
    case "secondary": return { bg: theme.colors.secondary, fg: theme.colors.textInverse };
    case "accent":    return { bg: theme.colors.accent,    fg: theme.colors.text };
    case "success":   return { bg: theme.colors.success,   fg: theme.colors.textInverse };
    default:          return { bg: theme.colors.primary,   fg: theme.colors.textInverse };
  }
}


export default function AdminDashboard() {
  const user = useAppStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;

  const firstName = (user?.full_name ?? "Admin").split(" ")[0];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.greeting}>
        <Text style={styles.hello}>Hi {firstName}.</Text>
        <Text style={styles.sub}>Here's your clinic at a glance.</Text>
      </View>

      {/* KPI row */}
      <View style={styles.kpiRow}>
        {KPIS.map((k) => {
          const t = kpiTone(k.tone);
          return (
            <View key={k.label} style={[styles.kpiCard, { backgroundColor: t.bg }]}>
              <View style={styles.kpiTop}>
                <k.Icon size={16} color={t.fg} strokeWidth={2.2} />
                <Text style={[styles.kpiLabel, { color: t.fg, opacity: 0.8 }]}>
                  {k.label.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.kpiValue, { color: t.fg }]}>{k.value}</Text>
              <Text style={[styles.kpiHint, { color: t.fg, opacity: 0.75 }]}>{k.hint}</Text>
            </View>
          );
        })}
      </View>

      {/* Two-column: approvals + activity */}
      <View style={[styles.cols, !isWide && styles.colsStack]}>
        {/* Pending approvals */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <BadgeCheck size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>Pending patient approvals</Text>
            <Text style={styles.panelMeta}>3 in queue</Text>
          </View>
          <View style={styles.panelBody}>
            {[
              { name: "Aster Tesfaye",  phone: "+251 911 234 567", when: "2h ago" },
              { name: "Getachew Alemu", phone: "+251 911 876 543", when: "5h ago" },
              { name: "Mulu Demissie",  phone: "+251 911 111 222", when: "1d ago" },
            ].map((a, i) => (
              <View key={i}>
                <View style={styles.approvalRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {a.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </Text>
                  </View>
                  <View style={styles.approvalContent}>
                    <Text style={styles.approvalName}>{a.name}</Text>
                    <Text style={styles.approvalMeta}>{a.phone} · {a.when}</Text>
                  </View>
                  <Pressable style={[styles.actionSmall, styles.actionApprove]}>
                    <BadgeCheck size={13} color={theme.colors.textInverse} strokeWidth={2.6} />
                    <Text style={styles.actionApproveText}>Approve</Text>
                  </Pressable>
                  <Pressable style={[styles.actionSmall, styles.actionReject]}>
                    <X size={13} color={theme.colors.danger} strokeWidth={2.6} />
                  </Pressable>
                </View>
                {i < 2 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Recent activity */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Activity size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>Recent activity</Text>
            <Pressable><Text style={styles.panelLink}>See all</Text></Pressable>
          </View>
          <View style={styles.panelBody}>
            {[
              { who: "Dr. Selam", did: "wrote a prescription for Abebe Kebede", when: "5m ago" },
              { who: "Hana Bekele", did: "logged vitals for Room 205", when: "12m ago" },
              { who: "Meron Tadesse", did: "checked in Yohannes Getu", when: "28m ago" },
              { who: "Dr. Yonas", did: "ordered Troponin (STAT)", when: "1h ago" },
              { who: "Admin", did: "approved patient Aster Tesfaye", when: "2h ago" },
            ].map((a, i) => (
              <View key={i} style={styles.activityRow}>
                <View style={styles.activityDot} />
                <Text style={styles.activityText}>
                  <Text style={styles.activityWho}>{a.who}</Text> {a.did}
                </Text>
                <Text style={styles.activityTime}>{a.when}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Quick links */}
      <View style={styles.quickRow}>
        {[
          { Icon: UserCog,   label: "Manage staff",     hint: "Add/edit staff accounts" },
          { Icon: Users,     label: "Patient records",  hint: "Search + view history" },
          { Icon: BedDouble, label: "Bed occupancy",    hint: "6 of 8 rooms in use" },
          { Icon: CalendarDays, label: "Appointments",  hint: "Schedule + reschedule" },
        ].map((q) => (
          <Pressable key={q.label} style={({ hovered }: any) => [styles.quickCard, hovered && styles.quickCardHover]}>
            <View style={styles.quickIcon}>
              <q.Icon size={18} color={theme.colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.quickContent}>
              <Text style={styles.quickLabel}>{q.label}</Text>
              <Text style={styles.quickHint}>{q.hint}</Text>
            </View>
            <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
          </Pressable>
        ))}
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

  kpiRow: { flexDirection: "row", gap: theme.spacing.md, flexWrap: "wrap" },
  kpiCard: {
    flex: 1, minWidth: 200, borderRadius: theme.radius.md,
    padding: theme.spacing.lg, gap: 6,
  },
  kpiTop: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs },
  kpiLabel: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 11,
    letterSpacing: 1, textTransform: "uppercase",
  },
  kpiValue: {
    fontFamily: theme.fontFamily.heading, fontSize: 32, letterSpacing: -0.8,
  },
  kpiHint: { fontFamily: theme.fontFamily.body, fontSize: 12.5 },

  cols: { flexDirection: "row", gap: theme.spacing.lg, alignItems: "flex-start" },
  colsStack: { flexDirection: "column" },
  panel: {
    flex: 1, backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md, borderWidth: 1,
    borderColor: theme.colors.border, overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  panelTitle: {
    fontFamily: theme.fontFamily.headingMedium, fontSize: 14,
    color: theme.colors.text, flex: 1,
  },
  panelMeta: { fontFamily: theme.fontFamily.body, fontSize: 12, color: theme.colors.muted },
  panelLink: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.primary,
  },
  panelBody: { paddingVertical: 4 },

  approvalRow: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: {
    fontFamily: theme.fontFamily.bodyBold, fontSize: 12,
    color: theme.colors.textInverse, letterSpacing: 0.3,
  },
  approvalContent: { flex: 1, minWidth: 0 },
  approvalName: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.text,
  },
  approvalMeta: {
    fontFamily: theme.fontFamily.body, fontSize: 12.5,
    color: theme.colors.muted, marginTop: 2,
  },
  actionSmall: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: theme.spacing.md, paddingVertical: 6,
    borderRadius: theme.radius.sm,
  },
  actionApprove: { backgroundColor: theme.colors.primary },
  actionApproveText: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 12,
    color: theme.colors.textInverse,
  },
  actionReject: {
    borderWidth: 1, borderColor: theme.colors.dangerBg,
    paddingHorizontal: 8,
  },
  divider: {
    height: 1, backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.lg,
  },

  activityRow: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  activityDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.secondary,
  },
  activityText: {
    fontFamily: theme.fontFamily.body, fontSize: 13.5,
    color: theme.colors.text, flex: 1, flexShrink: 1,
  },
  activityWho: { fontFamily: theme.fontFamily.bodyBold },
  activityTime: {
    fontFamily: theme.fontFamily.body, fontSize: 12, color: theme.colors.muted,
  },

  quickRow: { flexDirection: "row", gap: theme.spacing.md, flexWrap: "wrap" },
  quickCard: {
    flex: 1, minWidth: 260, flexDirection: "row", alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  quickCardHover: { borderColor: theme.colors.primary },
  quickIcon: {
    width: 40, height: 40, borderRadius: theme.radius.sm,
    backgroundColor: "rgba(42,42,114,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  quickContent: { flex: 1, minWidth: 0 },
  quickLabel: {
    fontFamily: theme.fontFamily.headingMedium, fontSize: 14.5, color: theme.colors.text,
  },
  quickHint: {
    fontFamily: theme.fontFamily.body, fontSize: 12.5,
    color: theme.colors.muted, marginTop: 2,
  },
});
