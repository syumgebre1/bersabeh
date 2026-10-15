/**
 * Sidebar — role-aware left navigation.
 *
 * Each role has its own nav items. On wide screens (>900px) it shows
 * labels; on narrow screens it collapses to a 64px icon-only rail.
 */

import { useRouter, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  FileText,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Pill,
  Receipt,
  Shield,
  Stethoscope,
  UserCircle,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app";


// ============================================================
// Role → nav items
// ============================================================
interface NavItem {
  key: string;
  labelKey: string;  // i18n key; falls back to English
  labelFallback: string;
  href: string;
  Icon: LucideIcon;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  patient: [
    { key: "overview",      labelKey: "patient.nav.overview",      labelFallback: "Overview",       href: "/(app)/patient",                 Icon: LayoutDashboard },
    { key: "appointments",  labelKey: "patient.nav.appointments",  labelFallback: "Appointments",   href: "/(app)/patient/appointments",    Icon: CalendarDays },
    { key: "prescriptions", labelKey: "patient.nav.prescriptions", labelFallback: "Prescriptions",  href: "/(app)/patient/prescriptions",   Icon: Pill },
    { key: "labs",          labelKey: "patient.nav.labs",          labelFallback: "Lab results",    href: "/(app)/patient/labs",            Icon: FlaskConical },
    { key: "bills",         labelKey: "patient.nav.bills",         labelFallback: "Bills",          href: "/(app)/patient/bills",           Icon: Receipt },
    { key: "messages",      labelKey: "patient.nav.messages",      labelFallback: "Messages",       href: "/(app)/patient/messages",        Icon: MessageSquare },
  ],
  doctor: [
    { key: "today",      labelKey: "doctor.nav.today",      labelFallback: "Today",         href: "/(app)/doctor",          Icon: LayoutDashboard },
    { key: "queue",      labelKey: "doctor.nav.queue",      labelFallback: "Patient queue", href: "/(app)/doctor/queue",    Icon: Users },
    { key: "prescribe",  labelKey: "doctor.nav.prescribe",  labelFallback: "Prescribe",     href: "/(app)/doctor/prescribe",Icon: Pill },
    { key: "labs",       labelKey: "doctor.nav.labs",       labelFallback: "Lab orders",    href: "/(app)/doctor/labs",     Icon: FlaskConical },
    { key: "messages",   labelKey: "doctor.nav.messages",   labelFallback: "Messages",      href: "/(app)/doctor/messages", Icon: MessageSquare },
  ],
  nurse: [
    { key: "wards",      labelKey: "nurse.nav.wards",      labelFallback: "Wards",         href: "/(app)/nurse",              Icon: LayoutDashboard },
    { key: "vitals",     labelKey: "nurse.nav.vitals",     labelFallback: "Log vitals",    href: "/(app)/nurse/vitals",       Icon: Activity },
    { key: "meds",       labelKey: "nurse.nav.medications",labelFallback: "Medications",   href: "/(app)/nurse/medications",  Icon: Pill },
    { key: "handover",   labelKey: "nurse.nav.handover",   labelFallback: "Handover",      href: "/(app)/nurse/handover",     Icon: ClipboardList },
    { key: "messages",   labelKey: "nurse.nav.messages",   labelFallback: "Messages",      href: "/(app)/nurse/messages",     Icon: MessageSquare },
  ],
  reception: [
    { key: "checkin",  labelKey: "reception.nav.checkin",  labelFallback: "Check-in",  href: "/(app)/reception",          Icon: LayoutDashboard },
    { key: "book",     labelKey: "reception.nav.book",     labelFallback: "Book",      href: "/(app)/reception/book",     Icon: CalendarDays },
    { key: "walkin",   labelKey: "reception.nav.walkin",   labelFallback: "Walk-in",   href: "/(app)/reception/walkin",   Icon: UserPlus },
    { key: "requests", labelKey: "requests.title",         labelFallback: "Booking requests", href: "/(app)/reception/requests", Icon: Inbox },
    { key: "billing",  labelKey: "reception.nav.billing",  labelFallback: "Billing",   href: "/(app)/reception/billing",  Icon: Receipt },
    { key: "messages", labelKey: "reception.nav.messages", labelFallback: "Messages",  href: "/(app)/reception/messages", Icon: MessageSquare },
  ],
  lab: [
    { key: "pending",  labelKey: "lab.nav.pending",  labelFallback: "Pending",  href: "/(app)/lab",          Icon: LayoutDashboard },
    { key: "results",  labelKey: "lab.nav.results",  labelFallback: "Results",  href: "/(app)/lab/orders",   Icon: FlaskConical },
  ],
  admin: [
    { key: "overview",  labelKey: "admin.nav.overview",  labelFallback: "Overview",      href: "/(app)/admin",              Icon: LayoutDashboard },
    { key: "content",   labelKey: "admin.nav.content",   labelFallback: "Content CMS",   href: "/(app)/admin/content",      Icon: FileText },
    { key: "staff",     labelKey: "admin.nav.staff",     labelFallback: "Staff",         href: "/(app)/admin/staff",        Icon: Users },
    { key: "patients",  labelKey: "admin.nav.patients",  labelFallback: "Patients",      href: "/(app)/admin/patients",     Icon: UserCircle },
    { key: "reports",   labelKey: "admin.nav.reports",   labelFallback: "Reports",       href: "/(app)/admin/reports",      Icon: Activity },
  ],
  super_admin: [
    { key: "overview",  labelKey: "superAdmin.nav.overview",  labelFallback: "Overview",      href: "/(app)/super-admin",         Icon: LayoutDashboard },
    { key: "admins",    labelKey: "superAdmin.nav.admins",    labelFallback: "Admins",        href: "/(app)/super-admin/admins",  Icon: Shield },
    { key: "audit",     labelKey: "superAdmin.nav.audit",     labelFallback: "Audit log",     href: "/(app)/super-admin/audit",   Icon: FileText },
    { key: "clinic",    labelKey: "superAdmin.nav.clinic",    labelFallback: "Clinic config", href: "/(app)/super-admin/clinic",  Icon: Stethoscope },
  ],
};


// ============================================================
// Component
// ============================================================
export function Sidebar() {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const router = useRouter();
  const pathname = usePathname();

  const role = user?.role ?? "patient";
  const items = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.patient;

  const brand =
    role === "super_admin" ? "SA" :
    role === "admin" ? "AD" :
    role === "doctor" ? "DR" :
    role === "nurse" ? "NU" :
    role === "reception" ? "RC" :
    role === "lab" ? "LB" :
    "PT";

  return (
    <View style={[styles.rail, !isWide && styles.railNarrow]}>
      {/* Brand */}
      <View style={styles.brand}>
        <View style={styles.brandDot} />
        {isWide && <Text style={styles.brandText}>Bersabeh</Text>}
      </View>

      {/* Nav */}
      <View style={styles.nav}>
        {items.map((item, idx) => {
          const active = idx === 0;   // first item is the primary screen
          return (
            <Pressable
              key={`${item.key}-${idx}`}
              onPress={() => router.push(item.href as any)}
              style={({ hovered }: any) => [
                styles.navItem,
                active && styles.navItemActive,
                hovered && !active && styles.navItemHover,
              ]}
            >
              <item.Icon
                size={18}
                color={active ? theme.colors.textInverse : theme.colors.muted}
                strokeWidth={active ? 2.4 : 2}
              />
              {isWide && (
                <Text
                  style={[styles.navLabel, active && styles.navLabelActive]}
                  numberOfLines={1}
                >
                  {t(item.labelKey, { defaultValue: item.labelFallback })}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Role badge at bottom */}
      <View style={styles.footer}>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{brand}</Text>
        </View>
        {isWide && (
          <View style={styles.roleMeta}>
            <Text style={styles.roleName} numberOfLines={1}>
              {user?.full_name ?? "—"}
            </Text>
            <Text style={styles.roleSub} numberOfLines={1}>
              {user?.role ?? ""}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  rail: {
    width: 220,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.lg,
  },
  railNarrow: {
    width: 64,
    paddingHorizontal: 6,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs + 2,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  brandDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: theme.colors.secondary,
  },
  brandText: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 17,
    color: theme.colors.primary,
    letterSpacing: -0.3,
  },
  nav: { gap: 2, flex: 1 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.radius.sm,
  },
  navItemActive: {
    backgroundColor: theme.colors.primary,
  },
  navItemHover: {
    backgroundColor: "rgba(42,42,114,0.05)",
  },
  navLabel: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13.5,
    color: theme.colors.text,
    flexShrink: 1,
  },
  navLabelActive: {
    color: theme.colors.textInverse,
    fontFamily: theme.fontFamily.bodyBold,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  roleBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.primaryDark,
    alignItems: "center", justifyContent: "center",
  },
  roleText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.textInverse,
    letterSpacing: 0.5,
  },
  roleMeta: { flex: 1, minWidth: 0 },
  roleName: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12.5,
    color: theme.colors.text,
  },
  roleSub: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.muted,
    textTransform: "capitalize",
  },
});
