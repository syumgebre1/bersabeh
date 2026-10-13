/**
 * Patient: Bill detail — trilingual.
 */

import { Receipt, Wallet } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { DetailCard, DetailHeader, DownloadButton } from "@/components/app";
import { apiFetch } from "@/lib/api";
import { theme } from "@/constants/theme";


interface BillDetail {
  id: string;
  amount_etb: number;
  paid_amount_etb: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unit_price_etb: number;
  }>;
}


export default function PatientBillDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: bill, isLoading, isError, refetch } = useQuery({
    queryKey: ["bill", id],
    queryFn: () => apiFetch<BillDetail>(`/api/v1/bills/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !bill) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t("common.error")}</Text>
        <Button label={t("common.retry")} variant="outline" size="sm" onPress={() => refetch()} />
      </View>
    );
  }

  let chip: { bg: string; fg: string; label: string } = { bg: theme.colors.dangerBg, fg: theme.colors.danger, label: t("status.unpaid") };
  switch (bill.status) {
    case "paid":      chip = { bg: theme.colors.successBg, fg: theme.colors.success, label: t("status.paid") }; break;
    case "partial":   chip = { bg: theme.colors.warningBg, fg: theme.colors.warning, label: t("status.partial") }; break;
    case "cancelled": chip = { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: t("status.cancelled") }; break;
  }

  const outstanding = Number(bill.amount_etb) - Number(bill.paid_amount_etb);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <DetailHeader backLabel={t("patient.bills.bills")} chip={chip} />

      <DetailCard variant={bill.status === "paid" ? "success" : "warning"}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Wallet size={22} color={theme.colors.textInverse} strokeWidth={2.2} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.amount}>{Number(bill.amount_etb).toLocaleString()} ETB</Text>
            <Text style={styles.amountSub}>
              {bill.status === "paid"
                ? `${t("status.paid")}${bill.paid_at ? ` · ${new Date(bill.paid_at).toLocaleDateString([], { month: "short", day: "numeric" })}` : ""}`
                : `${t("patient.bills.amountDue")}: ${outstanding.toLocaleString()} ETB`}
            </Text>
          </View>
        </View>
      </DetailCard>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("patient.bills.lineItems")}</Text>
        <View style={styles.itemsCard}>
          {bill.items.map((item, idx) => (
            <View
              key={idx}
              style={[styles.itemRow, idx < bill.items.length - 1 && styles.itemRowBorder]}
            >
              <View style={styles.itemContent}>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} × {Number(item.unit_price_etb).toLocaleString()} ETB
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {(item.quantity * Number(item.unit_price_etb)).toLocaleString()} ETB
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t("patient.bills.total")}</Text>
            <Text style={styles.totalValue}>{Number(bill.amount_etb).toLocaleString()} ETB</Text>
          </View>
        </View>
      </View>

      {bill.payment_method ? (
        <DetailCard>
          <View style={styles.payRow}>
            <Receipt size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.payText}>
              {t("patient.bills.paidVia")} {bill.payment_method}
              {bill.paid_at ? ` · ${new Date(bill.paid_at).toLocaleDateString()}` : ""}
            </Text>
          </View>
        </DetailCard>
      ) : null}

      <View style={styles.actions}>
        <DownloadButton
          path={`/api/v1/bills/${id}/pdf`}
          filename={`bill-${id}.pdf`}
          label={t("common.downloadPdf")}
        />
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 900, width: "100%", alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: theme.spacing.md, padding: theme.spacing.xxl },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.danger },
  headerRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  headerIcon: { width: 48, height: 48, borderRadius: theme.radius.sm, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  headerContent: { flex: 1 },
  amount: { fontFamily: theme.fontFamily.heading, fontSize: 32, color: theme.colors.text, letterSpacing: -0.8 },
  amountSub: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.muted, marginTop: 4 },
  section: { gap: theme.spacing.md },
  sectionTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  itemsCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  itemContent: { flex: 1 },
  itemDesc: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.text },
  itemMeta: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 3 },
  itemTotal: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14.5, color: theme.colors.text },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, backgroundColor: theme.colors.bg, borderTopWidth: 1, borderTopColor: theme.colors.border },
  totalLabel: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, color: theme.colors.text, textTransform: "uppercase", letterSpacing: 0.8 },
  totalValue: { fontFamily: theme.fontFamily.heading, fontSize: 20, color: theme.colors.primary, letterSpacing: -0.4 },
  payRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  payText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.text },
  actions: { flexDirection: "row", gap: theme.spacing.md, marginTop: theme.spacing.md },
});
