/**
 * Reception dashboard — booking + check-in + billing cockpit.
 *
 * Layout:
 *   - Big "New walk-in" + "Book appointment" CTAs
 *   - Today's calendar strip (horizontal time slots)
 *   - Check-in queue (patients expected today)
 *   - Billing snapshot card
 */

import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  Clock,
  UserPlus,
  Wallet,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app";


interface Booking {
  time: string;
  patient: string;
  doctor: string;
  status: "expected" | "arrived" | "seen" | "missed";
}

const TODAYS_BOOKINGS: Booking[] = [
  { time: "09:00", patient: "Abebe Kebede",  doctor: "Dr. Selam",  status: "seen" },
  { time: "09:30", patient: "Sara Haile",    doctor: "Dr. Dawit",  status: "seen" },
  { time: "10:00", patient: "Meron Tadesse", doctor: "Dr. Selam",  status: "arrived" },
  { time: "10:30", patient: "Yohannes Getu", doctor: "Dr. Selam",  status: "arrived" },
  { time: "11:00", patient: "Hana Bekele",   doctor: "Dr. Hana",   status: "expected" },
  { time: "11:30", patient: "Dawit Assefa",  doctor: "Dr. Yonas",  status: "expected" },
  { time: "12:00", patient: "Bekele Worku",  doctor: "Dr. Selam",  status: "expected" },
];


function statusChip(s: Booking["status"]) {
  switch (s) {
    case "seen":     return { bg: theme.colors.successBg, fg: theme.colors.success, label: "Seen" };
    case "arrived":  return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: "Arrived" };
    case "missed":   return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: "Missed" };
    default:         return { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: "Expected" };
  }
}


export default function ReceptionDashboard() {
  const user = useAppStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;

  const firstName = (user?.full_name ?? "Reception").split(" ")[0];
  const arrived = TODAYS_BOOKINGS.filter((b) => b.status === "arrived").length;
  const expected = TODAYS_BOOKINGS.filter((b) => b.status === "expected").length;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.hello}>Good day, {firstName}.</Text>
        <Text style={styles.sub}>
          {TODAYS_BOOKINGS.length} appointments today · {arrived} arrived · {expected} expected
        </Text>
      </View>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <Pressable style={[styles.quickBtn, styles.quickBtnPrimary]}>
          <UserPlus size={15} color={theme.colors.textInverse} strokeWidth={2.4} />
          <Text style={styles.quickBtnTextPrimary}>New walk-in</Text>
        </Pressable>
        <Pressable style={[styles.quickBtn, styles.quickBtnOutline]}>
          <CalendarPlus size={15} color={theme.colors.primary} strokeWidth={2.4} />
          <Text style={styles.quickBtnTextOutline}>Book appointment</Text>
        </Pressable>
      </View>

      {/* Two-column: bookings + billing */}
      <View style={[styles.cols, !isWide && styles.colsStack]}>
        {/* Today's bookings */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Clock size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>Today's calendar</Text>
            <Text style={styles.panelMeta}>{TODAYS_BOOKINGS.length} bookings</Text>
          </View>
          <View style={styles.panelBody}>
            {TODAYS_BOOKINGS.map((b, i) => {
              const chip = statusChip(b.status);
              return (
                <View key={i}>
                  <View style={styles.bookingRow}>
                    <Text style={styles.bookingTime}>{b.time}</Text>
                    <View style={styles.bookingContent}>
                      <Text style={styles.patientName}>{b.patient}</Text>
                      <Text style={styles.reason}>{b.doctor}</Text>
                    </View>
                    <View style={[styles.chip, { backgroundColor: chip.bg }]}>
                      <Text style={[styles.chipText, { color: chip.fg }]}>{chip.label}</Text>
                    </View>
                    {b.status === "arrived" ? (
                      <Pressable style={styles.checkBtn}>
                        <CheckCircle2 size={16} color={theme.colors.success} strokeWidth={2.4} />
                      </Pressable>
                    ) : (
                      <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
                    )}
                  </View>
                  {i < TODAYS_BOOKINGS.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* Billing snapshot */}
        <View style={styles.col}>
          <View style={styles.billCard}>
            <View style={styles.billHeader}>
              <Wallet size={16} color={theme.colors.textInverse} strokeWidth={2.2} />
              <Text style={styles.billTitle}>Today's billing</Text>
            </View>
            <Text style={styles.billAmount}>4,250 ETB</Text>
            <Text style={styles.billSub}>12 payments received</Text>

            <View style={styles.billDivider} />

            <View style={styles.billRow}>
              <Text style={styles.billRowLabel}>Unpaid bills</Text>
              <Text style={styles.billRowValue}>3</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billRowLabel}>Outstanding</Text>
              <Text style={styles.billRowValue}>1,800 ETB</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Walk-ins · today</Text>
              <Pressable><Text style={styles.panelLink}>See all</Text></Pressable>
            </View>
            <View style={styles.panelBody}>
              {[
                { p: "Kebede Assefa",  t: "08:42" },
                { p: "Tsehay Worku",   t: "09:15" },
              ].map((w, i) => (
                <View key={i} style={styles.bookingRow}>
                  <View style={styles.listIcon}>
                    <UserPlus size={14} color={theme.colors.secondary} strokeWidth={2.4} />
                  </View>
                  <View style={styles.bookingContent}>
                    <Text style={styles.patientName}>{w.p}</Text>
                    <Text style={styles.reason}>Registered at {w.t}</Text>
                  </View>
                  <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
                </View>
              ))}
            </View>
          </View>
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
    maxWidth: 1300,
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
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md },
  quickBtn: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.xs + 2,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  quickBtnPrimary: { backgroundColor: theme.colors.primary },
  quickBtnOutline: { borderWidth: 1.5, borderColor: theme.colors.primary },
  quickBtnTextPrimary: {
    fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: theme.colors.textInverse,
  },
  quickBtnTextOutline: {
    fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: theme.colors.primary,
  },
  cols: { flexDirection: "row", gap: theme.spacing.lg, alignItems: "flex-start" },
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
    flexDirection: "row", alignItems: "center", gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  panelTitle: {
    fontFamily: theme.fontFamily.headingMedium, fontSize: 14,
    color: theme.colors.text, flex: 1,
  },
  panelMeta: {
    fontFamily: theme.fontFamily.body, fontSize: 12, color: theme.colors.muted,
  },
  panelLink: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.primary,
  },
  panelBody: { paddingVertical: 4 },
  bookingRow: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  bookingTime: {
    fontFamily: theme.fontFamily.headingMedium, fontSize: 14,
    color: theme.colors.text, width: 52, letterSpacing: -0.1,
  },
  bookingContent: { flex: 1, minWidth: 0 },
  patientName: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.text,
  },
  reason: {
    fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2,
  },
  chip: {
    paddingHorizontal: theme.spacing.sm, paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  chipText: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3,
  },
  checkBtn: { padding: 2 },
  divider: {
    height: 1, backgroundColor: theme.colors.border, marginHorizontal: theme.spacing.lg,
  },
  listIcon: {
    width: 32, height: 32, borderRadius: theme.radius.sm,
    backgroundColor: "rgba(199,91,57,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  billCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  billHeader: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.xs + 2,
  },
  billTitle: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 12,
    letterSpacing: 1.2, color: theme.colors.accent, textTransform: "uppercase",
  },
  billAmount: {
    fontFamily: theme.fontFamily.heading, fontSize: 36,
    color: theme.colors.textInverse, letterSpacing: -0.8, marginTop: 4,
  },
  billSub: {
    fontFamily: theme.fontFamily.body, fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  billDivider: {
    height: 1, backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: theme.spacing.md,
  },
  billRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "baseline",
  },
  billRowLabel: {
    fontFamily: theme.fontFamily.body, fontSize: 13,
    color: "rgba(255,255,255,0.75)",
  },
  billRowValue: {
    fontFamily: theme.fontFamily.headingMedium, fontSize: 14,
    color: theme.colors.textInverse,
  },
});
