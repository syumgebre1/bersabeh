/**
 * Reception dashboard — trilingual.
 */

import {
  ArrowRight, CalendarPlus, CheckCircle2, Clock, UserPlus, Wallet,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from "react-native";

import { useAppointments, useBills } from "@/lib/admin";
import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app";


export default function ReceptionDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;

  const { data: appts, isLoading: aLoad } = useAppointments({ limit: 200 });
  const { data: bills } = useBills({ limit: 200 });

  const firstName = (user?.full_name ?? "").split(" ")[0] || "there";
  const today = new Date().toISOString().slice(0, 10);
  const todaysAppts = (appts ?? []).filter((a) =>
    new Date(a.scheduled_at).toISOString().slice(0, 10) === today,
  );
  const arrivedCount = todaysAppts.filter((a) => a.status === "checked_in" || a.status === "in_room").length;
  const expectedCount = todaysAppts.filter((a) => a.status === "scheduled").length;

  const paidToday = (bills ?? [])
    .filter((b) => b.paid_at && new Date(b.paid_at).toISOString().slice(0, 10) === today)
    .reduce((sum, b) => sum + Number(b.paid_amount_etb ?? 0), 0);
  const unpaidCount = (bills ?? []).filter((b) => b.status !== "paid" && b.status !== "cancelled").length;
  const outstanding = (bills ?? [])
    .filter((b) => b.status !== "paid" && b.status !== "cancelled")
    .reduce((sum, b) => sum + (Number(b.amount_etb) - Number(b.paid_amount_etb)), 0);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.greeting}>
        <Text style={styles.eyebrow}>{t("reception.eyebrow")}</Text>
        <Text style={styles.hello}>{t("reception.greeting", { name: firstName })}</Text>
        <Text style={styles.sub}>
          {todaysAppts.length} {t("reception.appointmentsToday")} · {arrivedCount} {t("reception.arrived")} · {expectedCount} {t("reception.expected")}
        </Text>
      </View>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <Pressable
          onPress={() => router.push("/(app)/reception/walkin" as any)}
          style={({ hovered }: any) => [styles.quickBtn, styles.quickBtnPrimary, hovered && styles.hovered]}
        >
          <UserPlus size={15} color={theme.colors.textInverse} strokeWidth={2.4} />
          <Text style={styles.quickBtnTextPrimary}>{t("reception.nav.walkin")}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(app)/reception/book" as any)}
          style={({ hovered }: any) => [styles.quickBtn, styles.quickBtnOutline, hovered && styles.hovered]}
        >
          <CalendarPlus size={15} color={theme.colors.primary} strokeWidth={2.4} />
          <Text style={styles.quickBtnTextOutline}>{t("reception.nav.book")}</Text>
        </Pressable>
      </View>

      <View style={[styles.cols, !isWide && styles.colsStack]}>
        {/* Today's calendar */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Clock size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>{t("reception.appointmentsToday")}</Text>
            <Text style={styles.panelMeta}>{todaysAppts.length}</Text>
          </View>
          <View style={styles.panelBody}>
            {aLoad ? (
              <View style={styles.emptyRow}><ActivityIndicator size="small" color={theme.colors.primary} /></View>
            ) : todaysAppts.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>{t("reception.noAppointmentsToday")}</Text>
              </View>
            ) : (
              todaysAppts.slice(0, 8).map((b, idx) => (
                <View key={b.id}>
                  <Pressable
                    onPress={() => router.push("/(app)/reception" as any)}
                    style={({ hovered }: any) => [styles.bookingRow, hovered && styles.hovered]}
                  >
                    <Text style={styles.bookingTime}>
                      {new Date(b.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    <View style={styles.bookingContent}>
                      <Text style={styles.patientName}>{b.patient?.full_name ?? "—"}</Text>
                      <Text style={styles.reason}>{b.doctor?.full_name ?? ""}</Text>
                    </View>
                    {b.status === "checked_in" ? (
                      <CheckCircle2 size={16} color={theme.colors.success} strokeWidth={2.4} />
                    ) : (
                      <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
                    )}
                  </Pressable>
                  {idx < todaysAppts.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            )}
          </View>
        </View>

        {/* Billing snapshot */}
        <View style={styles.col}>
          <Pressable
            onPress={() => router.push("/(app)/reception/billing" as any)}
            style={({ hovered }: any) => [styles.billCard, hovered && styles.hovered]}
          >
            <View style={styles.billHeader}>
              <Wallet size={16} color={theme.colors.textInverse} strokeWidth={2.2} />
              <Text style={styles.billTitle}>{t("reception.billing.title")}</Text>
            </View>
            <Text style={styles.billAmount}>{paidToday.toLocaleString()} ETB</Text>
            <Text style={styles.billSub}>{t("reception.collectedToday")}</Text>

            <View style={styles.billDivider} />

            <View style={styles.billRow}>
              <Text style={styles.billRowLabel}>{t("status.unpaid")}</Text>
              <Text style={styles.billRowValue}>{unpaidCount}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billRowLabel}>{t("reception.collectedToday")}</Text>
              <Text style={styles.billRowValue}>{outstanding.toLocaleString()} ETB</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(app)/reception/messages" as any)}
            style={({ hovered }: any) => [styles.messagesCta, hovered && styles.hovered]}
          >
            <Text style={styles.messagesCtaTitle}>{t("reception.messages.title")}</Text>
            <ArrowRight size={16} color={theme.colors.textInverse} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 1300, width: "100%", alignSelf: "center" },
  greeting: { gap: 4 },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  hello: { fontFamily: theme.fontFamily.heading, fontSize: 32, lineHeight: 38, letterSpacing: -0.6, color: theme.colors.text },
  sub: { fontFamily: theme.fontFamily.body, fontSize: 15, color: theme.colors.muted },
  hovered: { opacity: 0.92 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md },
  quickBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs + 2, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md, cursor: "pointer" as any },
  quickBtnPrimary: { backgroundColor: theme.colors.primary },
  quickBtnOutline: { borderWidth: 1.5, borderColor: theme.colors.primary },
  quickBtnTextPrimary: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: theme.colors.textInverse },
  quickBtnTextOutline: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: theme.colors.primary },
  cols: { flexDirection: "row", gap: theme.spacing.lg, alignItems: "flex-start" },
  colsStack: { flexDirection: "column" },
  col: { flex: 1, gap: theme.spacing.lg },
  panel: { flex: 1.4, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  panelTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, color: theme.colors.text, flex: 1 },
  panelMeta: { fontFamily: theme.fontFamily.body, fontSize: 12, color: theme.colors.muted },
  panelBody: { paddingVertical: 4 },
  emptyRow: { padding: theme.spacing.lg, alignItems: "center" },
  emptyText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.muted },
  bookingRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  bookingTime: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, color: theme.colors.text, width: 52, letterSpacing: -0.1 },
  bookingContent: { flex: 1, minWidth: 0 },
  patientName: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.text },
  reason: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginHorizontal: theme.spacing.lg },
  billCard: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, padding: theme.spacing.lg, gap: theme.spacing.xs, cursor: "pointer" as any },
  billHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs + 2 },
  billTitle: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, letterSpacing: 1.2, color: theme.colors.accent, textTransform: "uppercase" },
  billAmount: { fontFamily: theme.fontFamily.heading, fontSize: 36, color: theme.colors.textInverse, letterSpacing: -0.8, marginTop: 4 },
  billSub: { fontFamily: theme.fontFamily.body, fontSize: 13, color: "rgba(255,255,255,0.7)" },
  billDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: theme.spacing.md },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  billRowLabel: { fontFamily: theme.fontFamily.body, fontSize: 13, color: "rgba(255,255,255,0.75)" },
  billRowValue: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, color: theme.colors.textInverse },
  messagesCta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md, backgroundColor: theme.colors.secondary, borderRadius: theme.radius.md, padding: theme.spacing.lg, cursor: "pointer" as any },
  messagesCtaTitle: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: theme.colors.textInverse },
});
