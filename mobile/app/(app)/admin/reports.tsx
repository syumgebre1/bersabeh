/**
 * Admin: Reports — KPI dashboard with real counts from backend.
 */

import { ArrowLeft, CalendarCheck, FlaskConical, Pill, TrendingUp, Users, Wallet } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from "react-native";

import {
  useAppointments, useBills, useLabOrders, usePrescriptions, useStaffList,
} from "@/lib/admin";
import type { SessionUser } from "@/store/app";
import { theme } from "@/constants/theme";


export default function ReportsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;

  const { data: staff } = useStaffList();
  const { data: appts,    isLoading: apptsLoading }  = useAppointments({ limit: 500 });
  const { data: rxs,      isLoading: rxsLoading }    = usePrescriptions({ limit: 500 });
  const { data: labs,     isLoading: labsLoading }   = useLabOrders({ limit: 500 });
  const { data: bills,    isLoading: billsLoading }  = useBills({ limit: 500 });

  const loading = apptsLoading || rxsLoading || labsLoading || billsLoading;

  const staffCount    = (staff ?? []).filter((u: SessionUser) => u.role !== "patient").length;
  const patientsCount = (staff ?? []).filter((u: SessionUser) => u.role === "patient").length;
  const apptsCount    = appts?.length ?? 0;
  const rxsCount      = rxs?.length ?? 0;
  const labsCount     = labs?.length ?? 0;
  const billsCount    = bills?.length ?? 0;
  const paidTotal     = (bills ?? [])
    .filter((b) => b.status === "paid")
    .reduce((sum, b) => sum + Number(b.amount_etb ?? 0), 0);
  const outstandingTotal = (bills ?? [])
    .filter((b) => b.status !== "paid" && b.status !== "cancelled")
    .reduce((sum, b) => sum + (Number(b.amount_etb ?? 0) - Number(b.paid_amount_etb ?? 0)), 0);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>Admin</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>Operations</Text>
          <Text style={styles.title}>Reports</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.mutedText}>Loading reports...</Text>
        </View>
      ) : (
        <>
          {/* KPI grid */}
          <View style={[styles.grid, !isWide && styles.gridStack]}>
            <StatCard Icon={Users}         label="Staff"            value={staffCount}     accent={theme.colors.primary}     />
            <StatCard Icon={Users}         label="Patients"         value={patientsCount}  accent={theme.colors.secondary}   />
            <StatCard Icon={CalendarCheck} label="Appointments"     value={apptsCount}     accent={theme.colors.info}        />
            <StatCard Icon={Pill}          label="Prescriptions"    value={rxsCount}       accent={theme.colors.accentDark}  />
            <StatCard Icon={FlaskConical}  label="Lab orders"       value={labsCount}      accent={theme.colors.success}     />
            <StatCard Icon={Wallet}        label="Bills issued"     value={billsCount}     accent={theme.colors.primaryDark} />
          </View>

          {/* Financial summary */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={16} color={theme.colors.primary} strokeWidth={2.2} />
              <Text style={styles.sectionTitle}>Financials</Text>
            </View>
            <View style={styles.finRow}>
              <View style={styles.finCard}>
                <Text style={styles.finLabel}>Paid revenue</Text>
                <Text style={styles.finValue}>{paidTotal.toLocaleString()} ETB</Text>
                <Text style={styles.finSub}>Collected bills</Text>
              </View>
              <View style={styles.finCard}>
                <Text style={styles.finLabel}>Outstanding</Text>
                <Text style={[styles.finValue, { color: theme.colors.danger }]}>
                  {outstandingTotal.toLocaleString()} ETB
                </Text>
                <Text style={styles.finSub}>Unpaid or partial</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}


function StatCard({
  Icon, label, value, accent,
}: {
  Icon: typeof Users;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: accent }]}>
        <Icon size={16} color={theme.colors.textInverse} strokeWidth={2.2} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 1200, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md },
  gridStack: { flexDirection: "column" },
  statCard: { flex: 1, minWidth: 180, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg, gap: 6 },
  statIcon: { width: 32, height: 32, borderRadius: theme.radius.sm, alignItems: "center", justifyContent: "center" },
  statValue: { fontFamily: theme.fontFamily.heading, fontSize: 32, letterSpacing: -0.8, color: theme.colors.text },
  statLabel: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted },
  section: { gap: theme.spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  sectionTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  finRow: { flexDirection: "row", gap: theme.spacing.md, flexWrap: "wrap" },
  finCard: { flex: 1, minWidth: 220, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg, gap: 4 },
  finLabel: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted },
  finValue: { fontFamily: theme.fontFamily.heading, fontSize: 24, color: theme.colors.success, letterSpacing: -0.4, marginTop: 4 },
  finSub: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.mutedLight, marginTop: 2 },
});
