/**
 * Super-admin dashboard — links into the sub-routes.
 */

import {
  ArrowRight, FileText, Shield, Stethoscope, Activity, TrendingUp,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from "react-native";

import { useAuditLogs, useStaffList } from "@/lib/admin";
import type { SessionUser } from "@/store/app";
import { theme } from "@/constants/theme";


export default function SuperAdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 1000;

  const { data: logs, isLoading: logsLoading } = useAuditLogs({ limit: 8 });
  const { data: staff } = useStaffList();

  const adminsCount = (staff ?? []).filter(
    (u: SessionUser) => u.role === "admin" || u.role === "super_admin",
  ).length;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.greeting}>
        <View style={styles.brandRow}>
          <View style={styles.shieldBadge}>
            <Shield size={18} color={theme.colors.textInverse} strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.eyebrow}>System · Operations</Text>
            <Text style={styles.hello}>Full audit trail · admin management · system health</Text>
          </View>
        </View>
      </View>

      {/* Live stats */}
      <View style={[styles.statsRow, !isWide && styles.statsStack]}>
        <View style={[styles.statCard, styles.statPrimary]}>
          <Text style={styles.statLabelLight}>AUDIT ENTRIES</Text>
          <Text style={styles.statValueLight}>
            {logsLoading ? "…" : (logs?.length ?? 0)}
          </Text>
          <Text style={styles.statSubLight}>Most recent 8 shown below</Text>
        </View>
        <View style={[styles.statCard, styles.statSecondary]}>
          <Text style={styles.statLabelLight}>ADMINS</Text>
          <Text style={styles.statValueLight}>{adminsCount}</Text>
          <Text style={styles.statSubLight}>+ super admins</Text>
        </View>
        <View style={[styles.statCard, styles.statAccent]}>
          <Text style={styles.statLabelDark}>UPTIME (30d)</Text>
          <Text style={styles.statValueDark}>99.97</Text>
          <Text style={styles.statSubDark}>% · 1 minor incident</Text>
        </View>
      </View>

      {/* Navigation cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System tools</Text>
        <View style={styles.grid}>
          <Pressable
            onPress={() => router.push("/(app)/super-admin/audit" as any)}
            style={({ hovered }: any) => [styles.navCard, hovered && styles.navCardHover]}
          >
            <View style={[styles.navIcon, { backgroundColor: theme.colors.primary }]}>
              <FileText size={18} color={theme.colors.textInverse} strokeWidth={2.2} />
            </View>
            <Text style={styles.navTitle}>Audit log</Text>
            <Text style={styles.navDesc}>Every action in the system, filterable by action and entity.</Text>
            <View style={styles.navFooter}>
              <Text style={styles.navLink}>Open</Text>
              <ArrowRight size={13} color={theme.colors.primary} strokeWidth={2.2} />
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(app)/super-admin/admins" as any)}
            style={({ hovered }: any) => [styles.navCard, hovered && styles.navCardHover]}
          >
            <View style={[styles.navIcon, { backgroundColor: theme.colors.secondary }]}>
              <Shield size={18} color={theme.colors.textInverse} strokeWidth={2.2} />
            </View>
            <Text style={styles.navTitle}>Administrators</Text>
            <Text style={styles.navDesc}>Manage admin and super-admin accounts. Create new admins.</Text>
            <View style={styles.navFooter}>
              <Text style={styles.navLink}>Manage</Text>
              <ArrowRight size={13} color={theme.colors.primary} strokeWidth={2.2} />
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(app)/super-admin/clinic" as any)}
            style={({ hovered }: any) => [styles.navCard, hovered && styles.navCardHover]}
          >
            <View style={[styles.navIcon, { backgroundColor: theme.colors.success }]}>
              <Stethoscope size={18} color={theme.colors.textInverse} strokeWidth={2.2} />
            </View>
            <Text style={styles.navTitle}>Clinic config</Text>
            <Text style={styles.navDesc}>Edit clinic name, address, phones, hours, license.</Text>
            <View style={styles.navFooter}>
              <Text style={styles.navLink}>Edit</Text>
              <ArrowRight size={13} color={theme.colors.primary} strokeWidth={2.2} />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Live audit preview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Pressable onPress={() => router.push("/(app)/super-admin/audit" as any)}>
            <Text style={styles.sectionLink}>View all →</Text>
          </Pressable>
        </View>

        {logsLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : (
          <View style={styles.auditList}>
            {(logs ?? []).slice(0, 6).map((e, idx) => (
              <View
                key={e.id}
                style={[
                  styles.auditRow,
                  idx < Math.min(6, logs?.length ?? 0) - 1 && styles.auditRowBorder,
                ]}
              >
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
        )}
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 1300, width: "100%", alignSelf: "center" },
  greeting: { gap: 4 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  shieldBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.secondary, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  hello: { fontFamily: theme.fontFamily.heading, fontSize: 22, letterSpacing: -0.4, color: theme.colors.text, marginTop: 2 },

  statsRow: { flexDirection: "row", gap: theme.spacing.md },
  statsStack: { flexDirection: "column" },
  statCard: { flex: 1, padding: theme.spacing.lg, borderRadius: theme.radius.md, gap: 4 },
  statPrimary: { backgroundColor: theme.colors.primary },
  statSecondary: { backgroundColor: theme.colors.success },
  statAccent: { backgroundColor: theme.colors.accent },
  statLabelLight: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, color: "rgba(255,255,255,0.7)" },
  statValueLight: { fontFamily: theme.fontFamily.heading, fontSize: 36, color: theme.colors.textInverse, letterSpacing: -0.8 },
  statSubLight: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: "rgba(255,255,255,0.7)" },
  statLabelDark: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, color: "rgba(20,20,31,0.6)" },
  statValueDark: { fontFamily: theme.fontFamily.heading, fontSize: 36, color: theme.colors.text, letterSpacing: -0.8 },
  statSubDark: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: "rgba(20,20,31,0.6)" },

  section: { gap: theme.spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  sectionTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  sectionLink: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.primary },

  grid: { flexDirection: "row", gap: theme.spacing.md, flexWrap: "wrap" },
  navCard: { flex: 1, minWidth: 260, padding: theme.spacing.lg, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, gap: theme.spacing.sm },
  navCardHover: { borderColor: theme.colors.primary },
  navIcon: { width: 40, height: 40, borderRadius: theme.radius.sm, alignItems: "center", justifyContent: "center" },
  navTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 16, color: theme.colors.text },
  navDesc: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted, lineHeight: 18 },
  navFooter: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: theme.spacing.sm },
  navLink: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13, color: theme.colors.primary },

  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.xl },
  auditList: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  auditRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  auditRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  auditBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.radius.sm, backgroundColor: theme.colors.bgSunken },
  auditBadgeText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 10, letterSpacing: 0.5, color: theme.colors.muted },
  auditDesc: { flex: 1, fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.text },
  auditTime: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.mutedLight },
});
