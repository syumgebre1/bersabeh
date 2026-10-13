/**
 * Patient: All bills list — trilingual.
 */

import { ArrowLeft, ArrowRight, Receipt } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { useBills } from "@/lib/admin";
import { theme } from "@/constants/theme";


function statusChip(status: string, t: (k: string) => string) {
  switch (status) {
    case "paid":      return { bg: theme.colors.successBg, fg: theme.colors.success, label: t("status.paid") };
    case "partial":   return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: t("status.partial") };
    case "cancelled": return { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: t("status.cancelled") };
    default:          return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: t("status.unpaid") };
  }
}


export default function PatientBills() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: bills, isLoading, isError, refetch } = useBills({ limit: 100 });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>{t("common.back")}</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.title}>{t("patient.bills.bills")}</Text>
        </View>
        <Text style={styles.count}>{bills?.length ?? 0}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="small" color={theme.colors.primary} /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{t("common.error")}</Text>
          <Button label={t("common.retry")} variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : !bills || bills.length === 0 ? (
        <View style={styles.center}>
          <Receipt size={32} color={theme.colors.muted} strokeWidth={1.6} />
          <Text style={styles.mutedText}>{t("patient.bills.noBills")}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {bills.map((b, idx) => {
            const c = statusChip(b.status, t);
            const outstanding = Number(b.amount_etb) - Number(b.paid_amount_etb);
            return (
              <Pressable
                key={b.id}
                onPress={() => router.push(`/(app)/patient/bills/${b.id}` as any)}
                style={({ hovered }: any) => [
                  styles.row, idx < bills.length - 1 && styles.rowBorder, hovered && styles.rowHover,
                ]}
              >
                <View style={styles.iconCol}>
                  <Receipt size={16} color={theme.colors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>
                    {Number(b.amount_etb).toLocaleString()} ETB
                  </Text>
                  <Text style={styles.rowSub}>
                    {new Date(b.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                    {outstanding > 0 ? ` · ${outstanding.toLocaleString()} ETB ${t("patient.bills.amountDue")}` : ""}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: c.bg }]}>
                  <Text style={[styles.chipText, { color: c.fg }]}>{c.label}</Text>
                </View>
                <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.lg, maxWidth: 1000, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  count: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowHover: { backgroundColor: "rgba(42,42,114,0.02)" },
  iconCol: { width: 36, height: 36, borderRadius: theme.radius.sm, backgroundColor: "rgba(42,42,114,0.06)", alignItems: "center", justifyContent: "center" },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14.5, color: theme.colors.text },
  rowSub: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 3 },
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
});
