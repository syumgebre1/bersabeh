/**
 * Admin dashboard — real KPIs, real pending queue, real audit preview.
 * All cards are clickable and navigate to their sub-route.
 */

import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  FlaskConical,
  Pill,
  Receipt,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from "react-native";

import {
  useAppointments,
  useApprovePatient,
  useAuditLogs,
  useBills,
  usePendingPatients,
  usePrescriptions,
  useStaffList,
} from "@/lib/admin";
import type { SessionUser } from "@/store/app";
import { theme } from "@/constants/theme";


export default function AdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 1000;

  const { data: staff } = useStaffList();
  const { data: appts, isLoading: aLoad }  = useAppointments({ limit: 500 });
  const { data: rxs }                      = usePrescriptions({ limit: 500 });
  const { data: bills }                    = useBills({ limit: 500 });
  const { data: logs }                     = useAuditLogs({ limit: 5 });
  const { data: pending, refetch: refetchPending } = usePendingPatients();
  const approve = useApprovePatient();

  const staffCount    = (staff ?? []).filter((u: SessionUser) => u.role !== "patient").length;
  const patientsCount = (staff ?? []).filter((u: SessionUser) => u.role === "patient").length;
  const apptsCount    = appts?.length ?? 0;
  const rxsCount      = rxs?.length ?? 0;
  const paidTotal     = (bills ?? [])
    .filter((b) => b.status === "paid")
    .reduce((sum, b) => sum + Number(b.amount_etb ?? 0), 0);

  const handleApprove = async (userId: string) => {
    try {
      await approve.mutateAsync(userId);
      await refetchPending();
    } catch {
      // Silently fail — the pending page has proper error UI
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.hello}>Hi {(staff?.find((u: SessionUser) => u.role === "admin")?.full_name ?? "there").split(" ")[0]}.</Text>
        <Text style={styles.sub}>Here's your clinic at a glance.</Text>
      </View>

      {/* KPI cards — clickable */}
      <View style={[styles.kpiRow, !isWide && styles.kpiStack]}>
        <Pressable
          onPress={() => router.push("/(app)/admin/reports" as any)}
          style={({ hovered }: any) => [styles.kpiCard, { backgroundColor: theme.colors.primary }, hovered && styles.kpiHover]}
        >
          <CalendarCheck size={20} color={theme.colors.textInverse} strokeWidth={2.2} />
          <Text style={styles.kpiLabelLight}>APPOINTMENTS</Text>
          <Text style={styles.kpiValueLight}>{aLoad ? "…" : apptsCount}</Text>
          <Text style={styles.kpiSubLight}>Total in system</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(app)/admin/staff" as any)}
          style={({ hovered }: any) => [styles.kpiCard, { backgroundColor: theme.colors.secondary }, hovered && styles.kpiHover]}
        >
          <Users size={20} color={theme.colors.textInverse} strokeWidth={2.2} />
          <Text style={styles.kpiLabelLight}>REGISTERED PATIENTS</Text>
          <Text style={styles.kpiValueLight}>{patientsCount}</Text>
          <Text style={styles.kpiSubLight}>+{staffCount} staff</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(app)/admin/reports" as any)}
          style={({ hovered }: any) => [styles.kpiCard, { backgroundColor: theme.colors.accent }, hovered && styles.kpiHover]}
        >
          <Pill size={20} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.kpiLabelDark}>PRESCRIPTIONS</Text>
          <Text style={styles.kpiValueDark}>{rxsCount}</Text>
          <Text style={styles.kpiSubDark}>Written</Text>
        </Pressable>
      </View>

      {/* Revenue strip */}
      <Pressable
        onPress={() => router.push("/(app)/admin/reports" as any)}
        style={({ hovered }: any) => [styles.revenueStrip, hovered && styles.kpiHover]}
      >
        <View style={styles.revenueLeft}>
          <Wallet size={20} color={theme.colors.textInverse} strokeWidth={2.2} />
          <View>
            <Text style={styles.revenueLabel}>REVENUE COLLECTED</Text>
            <Text style={styles.revenueValue}>{paidTotal.toLocaleString()} ETB</Text>
          </View>
        </View>
        <ArrowRight size={18} color="rgba(255,255,255,0.7)" strokeWidth={2.2} />
      </Pressable>

      {/* Pending approvals — real data + working buttons */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending patient approvals</Text>
          <Pressable onPress={() => router.push("/(app)/admin/patients" as any)}>
            <Text style={styles.sectionLink}>
              {(pending?.length ?? 0)} in queue → view all
            </Text>
          </Pressable>
        </View>

        {(!pending || pending.length === 0) ? (
          <View style={styles.emptyCard}>
            <CheckCircle2 size={22} color={theme.colors.success} strokeWidth={2} />
            <Text style={styles.emptyText}>All caught up — no pending patients.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {pending.slice(0, 3).map((p: any) => (
              <View key={p.id} style={styles.pendingRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {p.full_name.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
                  </Text>
                </View>
                <View style={styles.pendingContent}>
                  <Text style={styles.pendingName}>{p.full_name}</Text>
                  <Text style={styles.pendingMeta}>{p.phone ?? p.email}</Text>
                </View>
                <Pressable
                  onPress={() => handleApprove(p.id)}
                  disabled={approve.isPending}
                  style={[styles.approveBtn, approve.isPending && styles.btnDisabled]}
                >
                  <CheckCircle2 size={14} color={theme.colors.textInverse} strokeWidth={2.4} />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push("/(app)/admin/patients" as any)}
                  style={styles.rejectIconBtn}
                >
                  <X size={14} color={theme.colors.danger} strokeWidth={2.4} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Recent audit */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Pressable onPress={() => router.push("/(app)/super-admin/audit" as any)}>
            <Text style={styles.sectionLink}>Full log →</Text>
          </Pressable>
        </View>
        <View style={styles.list}>
          {(logs ?? []).slice(0, 5).map((e, idx, arr) => (
            <View key={e.id} style={[styles.auditRow, idx < arr.length - 1 && styles.auditBorder]}>
              <View style={styles.auditBadge}>
                <Text style={styles.auditBadgeText}>{e.action.slice(0, 6).toUpperCase()}</Text>
              </View>
              <Text style={styles.auditDesc} numberOfLines={1}>{e.description}</Text>
              <Text style={styles.auditTime}>
                {new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 1300, width: "100%", alignSelf: "center" },
  greeting: { gap: 4 },
  hello: { fontFamily: theme.fontFamily.heading, fontSize: 32, lineHeight: 38, letterSpacing: -0.6, color: theme.colors.text },
  sub: { fontFamily: theme.fontFamily.body, fontSize: 15, color: theme.colors.muted },

  kpiRow: { flexDirection: "row", gap: theme.spacing.md },
  kpiStack: { flexDirection: "column" },
  kpiCard: { flex: 1, padding: theme.spacing.lg, borderRadius: theme.radius.md, gap: 6 },
  kpiHover: { opacity: 0.94 },
  kpiLabelLight: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, color: "rgba(255,255,255,0.75)", marginTop: 4 },
  kpiValueLight: { fontFamily: theme.fontFamily.heading, fontSize: 40, color: theme.colors.textInverse, letterSpacing: -1 },
  kpiSubLight: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: "rgba(255,255,255,0.7)" },
  kpiLabelDark: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, color: "rgba(20,20,31,0.65)", marginTop: 4 },
  kpiValueDark: { fontFamily: theme.fontFamily.heading, fontSize: 40, color: theme.colors.text, letterSpacing: -1 },
  kpiSubDark: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: "rgba(20,20,31,0.65)" },

  revenueStrip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.colors.success, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  revenueLeft: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  revenueLabel: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, color: "rgba(255,255,255,0.75)" },
  revenueValue: { fontFamily: theme.fontFamily.heading, fontSize: 28, color: theme.colors.textInverse, letterSpacing: -0.6, marginTop: 2 },

  section: { gap: theme.spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  sectionTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  sectionLink: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.primary },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  emptyCard: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg },
  emptyText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },

  pendingRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13, color: theme.colors.textInverse, letterSpacing: 0.3 },
  pendingContent: { flex: 1, minWidth: 0 },
  pendingName: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14.5, color: theme.colors.text },
  pendingMeta: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2 },
  approveBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: theme.spacing.md, paddingVertical: 7, backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm },
  approveBtnText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 12.5, color: theme.colors.textInverse },
  btnDisabled: { opacity: 0.5 },
  rejectIconBtn: { width: 30, height: 30, borderRadius: theme.radius.sm, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border },

  auditRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  auditBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  auditBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.radius.sm, backgroundColor: theme.colors.bgSunken },
  auditBadgeText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 10, letterSpacing: 0.5, color: theme.colors.muted },
  auditDesc: { flex: 1, fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.text },
  auditTime: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.mutedLight },
});
