/**
 * Super-admin dashboard — audit-first operations console.
 *
 * Distinct from admin by:
 *   - Darker, denser audit log feed as the primary panel
 *   - Admin management (create/deactivate other admins) front and center
 *   - System health strip (DB / WebSocket / mail)
 *   - Quieter visual rhythm — this is a compliance console, not a UI showpiece
 */

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Database,
  FileText,
  Mail,
  Radio,
  Shield,
  UserCog,
  Users,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app";


interface AuditEntry {
  id: string;
  actor: string;
  actorInitials: string;
  actorRole: "super_admin" | "admin" | "doctor" | "nurse" | "reception" | "system";
  action: string;
  entity: string;
  entityId: string;
  when: string;
}

const AUDIT_FEED: AuditEntry[] = [
  { id: "a1", actor: "Rahel Kidane",  actorInitials: "RK", actorRole: "admin",       action: "approved", entity: "User",         entityId: "…78bf",  when: "2m ago" },
  { id: "a2", actor: "Dr. Selam",     actorInitials: "ST", actorRole: "doctor",      action: "created",  entity: "Prescription", entityId: "…a4c1",  when: "5m ago" },
  { id: "a3", actor: "Meron Tadesse", actorInitials: "MT", actorRole: "reception",   action: "checked-in", entity: "Appointment", entityId: "…19d2",  when: "28m ago" },
  { id: "a4", actor: "System",        actorInitials: "SY", actorRole: "system",      action: "expired",  entity: "RefreshToken", entityId: "…77f3",  when: "42m ago" },
  { id: "a5", actor: "Dr. Yonas",     actorInitials: "YA", actorRole: "doctor",      action: "ordered",  entity: "LabOrder",     entityId: "…1045",  when: "1h ago" },
  { id: "a6", actor: "Hana Bekele",   actorInitials: "HB", actorRole: "nurse",       action: "logged",   entity: "Vital",        entityId: "…5534",  when: "1h ago" },
  { id: "a7", actor: "Rahel Kidane",  actorInitials: "RK", actorRole: "admin",       action: "updated",  entity: "ContentBlock", entityId: "…hero",  when: "2h ago" },
  { id: "a8", actor: "Admin",         actorInitials: "AD", actorRole: "admin",       action: "approved", entity: "Patient",      entityId: "…tesf",  when: "2h ago" },
];


function actorColor(role: AuditEntry["actorRole"]) {
  switch (role) {
    case "super_admin": return theme.colors.primaryDark;
    case "admin":       return theme.colors.primary;
    case "doctor":      return theme.colors.secondary;
    case "nurse":       return theme.colors.success;
    case "reception":   return theme.colors.accentDark;
    case "system":      return theme.colors.muted;
  }
}


function actionTone(action: string) {
  if (action === "delete" || action === "expired") return { fg: theme.colors.danger, bg: theme.colors.dangerBg };
  if (action === "approved" || action === "created") return { fg: theme.colors.success, bg: theme.colors.successBg };
  if (action === "updated" || action === "ordered" || action === "logged" || action === "checked-in")
    return { fg: theme.colors.info, bg: theme.colors.infoBg };
  return { fg: theme.colors.muted, bg: theme.colors.bgSunken };
}


export default function SuperAdminDashboard() {
  const user = useAppStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 1200;

  const firstName = (user?.full_name ?? "System").split(" ")[0];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.greeting}>
        <View style={styles.greetingRow}>
          <Shield size={20} color={theme.colors.secondary} strokeWidth={2.4} />
          <Text style={styles.hello}>{firstName} · Operations</Text>
        </View>
        <Text style={styles.sub}>Full audit trail · admin management · system health</Text>
      </View>

      {/* KPI strip — dark, compact */}
      <View style={styles.kpiRow}>
        <KpiCard label="Audit entries (24h)" value="1,482" hint="+124 since yesterday" accent="primary" />
        <KpiCard label="Active users"        value="612"   hint="7 roles · 4 on-duty doctors" accent="success" />
        <KpiCard label="Admins"              value="3"     hint="1 super · 2 regular" accent="secondary" />
        <KpiCard label="Uptime (7d)"         value="99.97" hint="% · 1 minor incident" accent="accent" />
      </View>

      {/* Two column */}
      <View style={[styles.cols, !isWide && styles.colsStack]}>
        {/* Audit feed */}
        <View style={styles.auditPanel}>
          <View style={styles.auditHeader}>
            <FileText size={14} color={theme.colors.textInverse} strokeWidth={2.2} />
            <Text style={styles.auditTitle}>Live audit log</Text>
            <Pressable style={styles.auditAction}>
              <Text style={styles.auditActionText}>Full log</Text>
              <ArrowRight size={12} color={theme.colors.accent} strokeWidth={2.4} />
            </Pressable>
          </View>
          <View style={styles.auditBody}>
            {AUDIT_FEED.map((e, i) => {
              const chip = actionTone(e.action);
              return (
                <View key={e.id} style={styles.auditRow}>
                  <View
                    style={[
                      styles.actorAvatar,
                      { backgroundColor: actorColor(e.actorRole) },
                    ]}
                  >
                    <Text style={styles.actorInitials}>{e.actorInitials}</Text>
                  </View>

                  <View style={styles.auditContent}>
                    <Text style={styles.auditLine} numberOfLines={1}>
                      <Text style={styles.auditActor}>{e.actor}</Text>
                      <Text style={styles.auditVerb}> {e.action} </Text>
                      <Text style={styles.auditEntity}>{e.entity}</Text>
                      <Text style={styles.auditId}> {e.entityId}</Text>
                    </Text>
                  </View>

                  <View style={[styles.actionChip, { backgroundColor: chip.bg }]}>
                    <Text style={[styles.actionChipText, { color: chip.fg }]}>{e.action}</Text>
                  </View>

                  <Text style={styles.auditTime}>{e.when}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Right column: admins + clinic config */}
        <View style={styles.col}>
          {/* Admins */}
          <View style={styles.lightPanel}>
            <View style={styles.lightHeader}>
              <UserCog size={14} color={theme.colors.primary} strokeWidth={2.2} />
              <Text style={styles.lightTitle}>Admins</Text>
              <Pressable><Text style={styles.lightLink}>+ Add</Text></Pressable>
            </View>
            <View style={styles.lightBody}>
              {[
                { name: "Rahel Kidane",  role: "Admin",       active: true },
                { name: "Daniel Yosef",  role: "Admin",       active: true },
                { name: "Syum Gebreyes", role: "Super admin", active: true },
              ].map((a, i) => (
                <View key={i}>
                  <View style={styles.adminRow}>
                    <View style={styles.adminAvatar}>
                      <Text style={styles.adminInitials}>
                        {a.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </Text>
                    </View>
                    <View style={styles.adminContent}>
                      <Text style={styles.adminName}>{a.name}</Text>
                      <Text style={styles.adminRole}>{a.role}</Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: a.active ? theme.colors.success : theme.colors.muted }]} />
                  </View>
                  {i < 2 && <View style={styles.lightDivider} />}
                </View>
              ))}
            </View>
          </View>

          {/* Clinic config shortcut */}
          <Pressable style={({ hovered }: any) => [styles.configCard, hovered && styles.configCardHover]}>
            <View style={styles.configIcon}>
              <Database size={18} color={theme.colors.accent} strokeWidth={2.2} />
            </View>
            <View style={styles.configContent}>
              <Text style={styles.configTitle}>Clinic configuration</Text>
              <Text style={styles.configHint}>
                Address · phones · hours · license · departments
              </Text>
            </View>
            <ArrowRight size={14} color={theme.colors.accent} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      {/* System health strip */}
      <View style={styles.healthStrip}>
        <HealthItem
          Icon={Database}
          label="PostgreSQL"
          value="16.15"
          status="ok"
        />
        <HealthItem
          Icon={Radio}
          label="WebSocket connections"
          value="12 live"
          status="ok"
        />
        <HealthItem
          Icon={Mail}
          label="Mail queue"
          value="0 pending"
          status="ok"
        />
        <HealthItem
          Icon={Users}
          label="Active sessions"
          value="47"
          status="ok"
        />
      </View>
    </ScrollView>
  );
}


// ============================================================
// Sub-components
// ============================================================
function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: "primary" | "secondary" | "accent" | "success";
}) {
  const bg =
    accent === "secondary" ? theme.colors.secondary :
    accent === "accent" ? theme.colors.accentDark :
    accent === "success" ? theme.colors.success :
    theme.colors.primary;

  const fg =
    accent === "accent" ? theme.colors.text : theme.colors.textInverse;

  return (
    <View style={[styles.kpiCard, { backgroundColor: bg }]}>
      <Text style={[styles.kpiLabel, { color: fg, opacity: 0.85 }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.kpiValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.kpiHint, { color: fg, opacity: 0.75 }]}>{hint}</Text>
    </View>
  );
}

function HealthItem({
  Icon,
  label,
  value,
  status,
}: {
  Icon: typeof Database;
  label: string;
  value: string;
  status: "ok" | "warn" | "error";
}) {
  const dot =
    status === "ok" ? theme.colors.success :
    status === "warn" ? theme.colors.warning :
    theme.colors.danger;

  return (
    <View style={styles.healthItem}>
      <Icon size={14} color={theme.colors.muted} strokeWidth={2} />
      <View style={styles.healthContent}>
        <Text style={styles.healthLabel}>{label}</Text>
        <Text style={styles.healthValue}>{value}</Text>
      </View>
      <View style={[styles.healthDot, { backgroundColor: dot }]} />
    </View>
  );
}


// ============================================================
// Styles
// ============================================================
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
  greetingRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  hello: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 32, lineHeight: 38, letterSpacing: -0.6,
    color: theme.colors.text,
  },
  sub: { fontFamily: theme.fontFamily.body, fontSize: 15, color: theme.colors.muted },

  kpiRow: { flexDirection: "row", gap: theme.spacing.md, flexWrap: "wrap" },
  kpiCard: {
    flex: 1, minWidth: 200, borderRadius: theme.radius.md,
    padding: theme.spacing.lg, gap: 4,
  },
  kpiLabel: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 11,
    letterSpacing: 1,
  },
  kpiValue: {
    fontFamily: theme.fontFamily.heading, fontSize: 32, letterSpacing: -0.8,
    marginTop: 2,
  },
  kpiHint: { fontFamily: theme.fontFamily.body, fontSize: 12.5 },

  cols: { flexDirection: "row", gap: theme.spacing.lg, alignItems: "flex-start" },
  colsStack: { flexDirection: "column" },
  col: { flex: 1, gap: theme.spacing.lg },

  // Dark audit panel
  auditPanel: {
    flex: 1.6,
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.md,
    overflow: "hidden",
  },
  auditHeader: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  auditTitle: {
    fontFamily: theme.fontFamily.headingMedium, fontSize: 14,
    color: theme.colors.textInverse, flex: 1,
  },
  auditAction: { flexDirection: "row", alignItems: "center", gap: 4 },
  auditActionText: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.accent,
  },
  auditBody: { paddingVertical: 4 },
  auditRow: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm + 2,
  },
  actorAvatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  actorInitials: {
    fontFamily: theme.fontFamily.bodyBold, fontSize: 10.5,
    color: theme.colors.textInverse, letterSpacing: 0.3,
  },
  auditContent: { flex: 1, minWidth: 0 },
  auditLine: {
    fontFamily: theme.fontFamily.body, fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },
  auditActor: { fontFamily: theme.fontFamily.bodyBold, color: theme.colors.textInverse },
  auditVerb: { color: "rgba(255,255,255,0.65)" },
  auditEntity: { fontFamily: theme.fontFamily.bodyMedium, color: theme.colors.accent },
  auditId: {
    fontFamily: theme.fontFamily.body, fontSize: 11.5,
    color: "rgba(255,255,255,0.5)",
  },
  actionChip: {
    paddingHorizontal: theme.spacing.sm, paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  actionChipText: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 10.5, letterSpacing: 0.3,
  },
  auditTime: {
    fontFamily: theme.fontFamily.body, fontSize: 11.5,
    color: "rgba(255,255,255,0.5)", minWidth: 56, textAlign: "right",
  },

  // Light panels
  lightPanel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border,
    overflow: "hidden",
  },
  lightHeader: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  lightTitle: {
    fontFamily: theme.fontFamily.headingMedium, fontSize: 14,
    color: theme.colors.text, flex: 1,
  },
  lightLink: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.primary,
  },
  lightBody: { paddingVertical: 4 },
  adminRow: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  adminAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  adminInitials: {
    fontFamily: theme.fontFamily.bodyBold, fontSize: 11,
    color: theme.colors.textInverse, letterSpacing: 0.3,
  },
  adminContent: { flex: 1, minWidth: 0 },
  adminName: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.text,
  },
  adminRole: {
    fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  lightDivider: {
    height: 1, backgroundColor: theme.colors.border, marginHorizontal: theme.spacing.lg,
  },

  // Config card
  configCard: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.md,
  },
  configCardHover: { opacity: 0.95 },
  configIcon: {
    width: 40, height: 40, borderRadius: theme.radius.sm,
    backgroundColor: "rgba(232,178,58,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  configContent: { flex: 1, minWidth: 0 },
  configTitle: {
    fontFamily: theme.fontFamily.headingMedium, fontSize: 14.5,
    color: theme.colors.textInverse,
  },
  configHint: {
    fontFamily: theme.fontFamily.body, fontSize: 12.5,
    color: "rgba(255,255,255,0.65)", marginTop: 2,
  },

  // Health strip
  healthStrip: {
    flexDirection: "row", gap: theme.spacing.md, flexWrap: "wrap",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  healthItem: {
    flex: 1, minWidth: 180,
    flexDirection: "row", alignItems: "center", gap: theme.spacing.sm,
  },
  healthContent: { flex: 1, minWidth: 0 },
  healthLabel: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 11,
    letterSpacing: 1, textTransform: "uppercase", color: theme.colors.muted,
  },
  healthValue: {
    fontFamily: theme.fontFamily.headingMedium, fontSize: 14.5,
    color: theme.colors.text, marginTop: 2,
  },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
});
