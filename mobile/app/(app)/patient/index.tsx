/**
 * Patient dashboard — the first role dashboard.
 *
 * Layout:
 *   - Greeting banner
 *   - Next appointment card (with mock data)
 *   - Two-column grid: prescriptions | lab results
 *   - Bills strip
 */

import {
  ArrowRight,
  CalendarClock,
  FlaskConical,
  Pill,
  Receipt,
  Video,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app";


export default function PatientDashboard() {
  const user = useAppStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 1000;

  const firstName = (user?.full_name ?? "there").split(" ")[0];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.hello}>Hello, {firstName}.</Text>
        <Text style={styles.sub}>Here's your care summary.</Text>
      </View>

      {/* Next appointment */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Next appointment</Text>
        </View>
        <View style={styles.apptCard}>
          <View style={styles.apptLeft}>
            <View style={styles.apptDateBadge}>
              <Text style={styles.apptDateMonth}>OCT</Text>
              <Text style={styles.apptDateDay}>26</Text>
            </View>
            <View style={styles.apptMeta}>
              <Text style={styles.apptTitle}>Dr. Selam Tesfaye</Text>
              <Text style={styles.apptSub}>Internal Medicine · 10:00 AM</Text>
              <Text style={styles.apptSub}>Bole · Room 204</Text>
            </View>
          </View>
          <View style={styles.apptActions}>
            <Pressable style={[styles.actionBtn, styles.actionBtnOutline]}>
              <Video size={14} color={theme.colors.primary} strokeWidth={2.2} />
              <Text style={styles.actionBtnText}>Video</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.actionBtnPrimary]}>
              <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>Details</Text>
              <ArrowRight size={14} color={theme.colors.textInverse} strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Prescriptions + Labs grid */}
      <View style={[styles.grid, !isWide && styles.gridStack]}>
        {/* Prescriptions */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Pill size={16} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>My prescriptions</Text>
            <Pressable style={styles.panelLink}>
              <Text style={styles.panelLinkText}>See all</Text>
            </Pressable>
          </View>
          <View style={styles.panelBody}>
            <View style={styles.listRow}>
              <View style={styles.listIcon}>
                <Pill size={14} color={theme.colors.secondary} strokeWidth={2.4} />
              </View>
              <View style={styles.listContent}>
                <Text style={styles.listTitle}>Amoxicillin 500mg</Text>
                <Text style={styles.listSub}>3x daily · 7 days · Active</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: theme.colors.successBg }]}>
                <Text style={[styles.chipText, { color: theme.colors.success }]}>Active</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.listRow}>
              <View style={styles.listIcon}>
                <Pill size={14} color={theme.colors.secondary} strokeWidth={2.4} />
              </View>
              <View style={styles.listContent}>
                <Text style={styles.listTitle}>Ibuprofen 400mg</Text>
                <Text style={styles.listSub}>2x daily · 5 days · Completed</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: theme.colors.bgSunken }]}>
                <Text style={[styles.chipText, { color: theme.colors.muted }]}>Done</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Labs */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <FlaskConical size={16} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>Lab results</Text>
            <Pressable style={styles.panelLink}>
              <Text style={styles.panelLinkText}>See all</Text>
            </Pressable>
          </View>
          <View style={styles.panelBody}>
            <View style={styles.listRow}>
              <View style={styles.listIcon}>
                <FlaskConical size={14} color={theme.colors.secondary} strokeWidth={2.4} />
              </View>
              <View style={styles.listContent}>
                <Text style={styles.listTitle}>Complete Blood Count</Text>
                <Text style={styles.listSub}>7.8 10³/µL · Within range</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: theme.colors.successBg }]}>
                <Text style={[styles.chipText, { color: theme.colors.success }]}>Ready</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Bills strip */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Billing</Text>
        </View>
        <View style={styles.billStrip}>
          <View style={styles.billLeft}>
            <Receipt size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <View>
              <Text style={styles.billTitle}>Outstanding balance</Text>
              <Text style={styles.billSub}>Last bill: 2026-10-12 · 1 item</Text>
            </View>
          </View>
          <Text style={styles.billAmount}>0.00 ETB</Text>
        </View>
      </View>
    </ScrollView>
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
  section: { gap: theme.spacing.md },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 14,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: theme.colors.muted,
  },

  // Appointment card
  apptCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.lg,
    flexWrap: "wrap",
  },
  apptLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.lg,
    flexShrink: 1,
  },
  apptDateBadge: {
    width: 60, height: 60,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  apptDateMonth: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.colors.accent,
  },
  apptDateDay: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 22,
    color: theme.colors.textInverse,
    letterSpacing: -0.5,
  },
  apptMeta: { gap: 2 },
  apptTitle: {
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 17,
    color: theme.colors.text,
  },
  apptSub: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    color: theme.colors.muted,
  },
  apptActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  actionBtnPrimary: {
    backgroundColor: theme.colors.primary,
  },
  actionBtnText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    color: theme.colors.primary,
  },
  actionBtnTextPrimary: {
    color: theme.colors.textInverse,
    fontFamily: theme.fontFamily.bodyBold,
  },

  // Grid
  grid: {
    flexDirection: "row",
    gap: theme.spacing.lg,
  },
  gridStack: {
    flexDirection: "column",
  },
  panel: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
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
  panelLink: {},
  panelLinkText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12.5,
    color: theme.colors.primary,
  },
  panelBody: { paddingVertical: theme.spacing.xs },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  listIcon: {
    width: 32, height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: "rgba(199, 91, 57, 0.08)",
    alignItems: "center", justifyContent: "center",
  },
  listContent: { flex: 1 },
  listTitle: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14,
    color: theme.colors.text,
  },
  listSub: {
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
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.lg,
  },

  // Bills
  billStrip: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.lg,
  },
  billLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  billTitle: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14,
    color: theme.colors.text,
  },
  billSub: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: theme.colors.muted,
    marginTop: 2,
  },
  billAmount: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 22,
    color: theme.colors.success,
    letterSpacing: -0.3,
  },
});
