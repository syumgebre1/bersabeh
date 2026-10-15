/**
 * Patient dashboard — fully translated (EN / አማ / ትግ).
 */

import {
  ArrowRight, CalendarClock, FlaskConical, MessageSquare, Pill, Receipt,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from "react-native";

import {
  useAppointments, useBills, useLabOrders, usePrescriptions,
} from "@/lib/admin";
import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app";


function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}


export default function PatientDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 1000;

  const { data: appts, isLoading: aLoad } = useAppointments({ limit: 10 });
  const { data: rxs } = usePrescriptions({ limit: 5 });
  const { data: labs } = useLabOrders({ limit: 5 });
  const { data: bills } = useBills({ limit: 5 });

  const firstName = (user?.full_name ?? "there").split(" ")[0];
  const nextAppt = (appts ?? [])[0];
  const firstRx = (rxs ?? [])[0];
  const firstLab = (labs ?? [])[0];
  const outstanding = (bills ?? [])
    .filter((b) => b.status !== "paid" && b.status !== "cancelled")
    .reduce((sum, b) => sum + (Number(b.amount_etb) - Number(b.paid_amount_etb)), 0);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.greeting}>
        <Text style={styles.hello}>
          {t("patient.dashboard.greeting", { name: firstName })}
        </Text>
        <Text style={styles.sub}>{t("patient.dashboard.careSummary")}</Text>
      </View>

      {/* Next appointment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("patient.dashboard.nextAppointment")}</Text>
        {aLoad ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : nextAppt ? (
          <Pressable
            onPress={() => router.push(`/(app)/patient/appointments/${nextAppt.id}` as any)}
            style={({ hovered }: any) => [styles.apptCard, hovered && styles.hovered]}
          >
            <View style={styles.apptLeft}>
              <View style={styles.apptDateBadge}>
                <Text style={styles.apptDateMonth}>
                  {new Date(nextAppt.scheduled_at).toLocaleDateString([], { month: "short" }).toUpperCase()}
                </Text>
                <Text style={styles.apptDateDay}>{new Date(nextAppt.scheduled_at).getDate()}</Text>
              </View>
              <View style={styles.apptMeta}>
                <Text style={styles.apptTitle}>{nextAppt.doctor?.full_name ?? t("patient.prescriptions.yourDoctor")}</Text>
                <Text style={styles.apptSub}>
                  {new Date(nextAppt.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {nextAppt.doctor?.specialty ? ` · ${nextAppt.doctor.specialty}` : ""}
                </Text>
              </View>
            </View>
            <ArrowRight size={16} color={theme.colors.muted} strokeWidth={2} />
          </Pressable>
        ) : (
          <View style={styles.emptyCard}>
            <CalendarClock size={22} color={theme.colors.muted} strokeWidth={1.8} />
            <Text style={styles.emptyText}>{t("patient.dashboard.noUpcoming")}</Text>
            <Pressable
              onPress={() => router.push("/(app)/patient/appointments/new" as any)}
              style={({ hovered }: any) => [
                styles.bookBtn,
                hovered && styles.bookBtnHover,
              ]}
            >
              <Text style={styles.bookBtnText}>{t("patient.appointments.bookNew")}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Prescriptions + Labs */}
      <View style={[styles.grid, !isWide && styles.gridStack]}>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Pill size={16} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>{t("patient.dashboard.myPrescriptions")}</Text>
          </View>
          <View style={styles.panelBody}>
            {firstRx ? (
              <Pressable
                onPress={() => router.push(`/(app)/patient/prescriptions/${firstRx.id}` as any)}
                style={({ hovered }: any) => [styles.listRow, hovered && styles.hovered]}
              >
                <View style={styles.listIcon}>
                  <Pill size={14} color={theme.colors.secondary} strokeWidth={2.4} />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>{firstRx.items?.[0]?.medication_name ?? t("patient.prescriptions.medication")}</Text>
                  <Text style={styles.listSub}>
                    {firstRx.items?.[0]?.dose ?? ""} · {fmtDate(firstRx.created_at)}
                  </Text>
                </View>
                <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
              </Pressable>
            ) : (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>{t("patient.prescriptions.noPrescriptions")}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <FlaskConical size={16} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>{t("patient.dashboard.myLabResults")}</Text>
          </View>
          <View style={styles.panelBody}>
            {firstLab ? (
              <Pressable
                onPress={() => router.push(`/(app)/patient/labs/${firstLab.id}` as any)}
                style={({ hovered }: any) => [styles.listRow, hovered && styles.hovered]}
              >
                <View style={styles.listIcon}>
                  <FlaskConical size={14} color={theme.colors.secondary} strokeWidth={2.4} />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>{firstLab.test_name}</Text>
                  <Text style={styles.listSub}>{fmtDate(firstLab.ordered_at)}</Text>
                </View>
                <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
              </Pressable>
            ) : (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>{t("patient.labs.noResults")}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Billing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("patient.dashboard.billing")}</Text>
        <Pressable
          onPress={() => bills && bills[0] ? router.push(`/(app)/patient/bills/${bills[0].id}` as any) : null}
          style={({ hovered }: any) => [styles.billStrip, hovered && styles.hovered]}
        >
          <View style={styles.billLeft}>
            <Receipt size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <View>
              <Text style={styles.billTitle}>
                {outstanding > 0 ? t("patient.dashboard.outstanding") : t("patient.dashboard.allPaid")}
              </Text>
              <Text style={styles.billSub}>
                {bills?.length ?? 0} {bills?.length === 1 ? t("patient.dashboard.bill") : t("patient.dashboard.bills")}
              </Text>
            </View>
          </View>
          <Text style={[styles.billAmount, outstanding > 0 && styles.billAmountDue]}>
            {outstanding.toLocaleString()} ETB
          </Text>
        </Pressable>
      </View>

      {/* Messages */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("patient.dashboard.needToTalk")}</Text>
        <Pressable
          onPress={() => router.push("/(app)/patient/messages" as any)}
          style={({ hovered }: any) => [styles.messageCta, hovered && styles.hovered]}
        >
          <View style={styles.messageLeft}>
            <MessageSquare size={18} color={theme.colors.textInverse} strokeWidth={2.2} />
            <View>
              <Text style={styles.messageTitle}>{t("patient.dashboard.openMessages")}</Text>
              <Text style={styles.messageSub}>{t("patient.dashboard.askQuestions")}</Text>
            </View>
          </View>
          <ArrowRight size={16} color={theme.colors.textInverse} strokeWidth={2} />
        </Pressable>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 1200, width: "100%", alignSelf: "center" },
  greeting: { gap: 4 },
  hello: { fontFamily: theme.fontFamily.heading, fontSize: 32, lineHeight: 38, letterSpacing: -0.6, color: theme.colors.text },
  sub: { fontFamily: theme.fontFamily.body, fontSize: 15, color: theme.colors.muted },
  section: { gap: theme.spacing.md },
  sectionTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  hovered: { opacity: 0.92 },
  emptyCard: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg, justifyContent: "center" },
  emptyRow: { alignItems: "center", paddingVertical: theme.spacing.lg },
  bookBtn: { marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, cursor: "pointer" as any },
  bookBtnHover: { opacity: 0.9 },
  bookBtnText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.textInverse, letterSpacing: 0.2 },
  emptyText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.muted },
  apptCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.lg, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg },
  apptLeft: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexShrink: 1 },
  apptDateBadge: { width: 60, height: 60, borderRadius: theme.radius.sm, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  apptDateMonth: { fontFamily: theme.fontFamily.bodyBold, fontSize: 10, letterSpacing: 1, color: theme.colors.accent },
  apptDateDay: { fontFamily: theme.fontFamily.heading, fontSize: 22, color: theme.colors.textInverse, letterSpacing: -0.5 },
  apptMeta: { gap: 2 },
  apptTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 17, color: theme.colors.text },
  apptSub: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted },
  grid: { flexDirection: "row", gap: theme.spacing.lg },
  gridStack: { flexDirection: "column" },
  panel: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  panelTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, color: theme.colors.text, flex: 1 },
  panelBody: { paddingVertical: 4 },
  listRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  listIcon: { width: 32, height: 32, borderRadius: theme.radius.sm, backgroundColor: "rgba(199,91,57,0.08)", alignItems: "center", justifyContent: "center" },
  listContent: { flex: 1 },
  listTitle: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.text },
  listSub: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2 },
  billStrip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.lg, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg },
  billLeft: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  billTitle: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.text },
  billSub: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2 },
  billAmount: { fontFamily: theme.fontFamily.heading, fontSize: 22, color: theme.colors.success, letterSpacing: -0.3 },
  billAmountDue: { color: theme.colors.danger },
  messageCta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.lg, backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, padding: theme.spacing.lg },
  messageLeft: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  messageTitle: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: theme.colors.textInverse },
  messageSub: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: "rgba(255,255,255,0.75)", marginTop: 2 },
});
