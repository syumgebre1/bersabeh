/**
 * Reception: Billing — bills list with a "Record payment" modal.
 * Trilingual.
 */

import { ArrowLeft, Receipt, Wallet, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { useBills } from "@/lib/admin";
import { theme } from "@/constants/theme";


export default function ReceptionBilling() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: bills, isLoading, isError, refetch } = useBills({ limit: 200 });

  const FILTERS = [
    { key: "all",     label: t("reception.billing.filterAll") },
    { key: "unpaid",  label: t("reception.billing.filterUnpaid") },
    { key: "partial", label: t("reception.billing.filterPartial") },
    { key: "paid",    label: t("reception.billing.filterPaid") },
  ];

  const METHODS = [
    { key: "cash",     label: t("reception.billing.methodCash") },
    { key: "telebirr", label: t("reception.billing.methodTelebirr") },
    { key: "cbe_birr", label: t("reception.billing.methodCBE") },
    { key: "chapa",    label: t("reception.billing.methodChapa") },
    { key: "card",     label: t("reception.billing.methodCard") },
  ];

  const [filter, setFilter] = useState("all");
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const payingBill = useMemo(
    () => (bills ?? []).find((b) => b.id === payingBillId),
    [bills, payingBillId],
  );

  const outstanding = payingBill
    ? Number(payingBill.amount_etb) - Number(payingBill.paid_amount_etb)
    : 0;

  const filtered = useMemo(() => {
    const list = bills ?? [];
    if (filter === "all") return list;
    return list.filter((b) => b.status === filter);
  }, [bills, filter]);

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!payingBillId) throw new Error(t("common.error"));
      return apiFetch(`/api/v1/bills/${payingBillId}/pay`, {
        method: "POST",
        body: JSON.stringify({
          amount_etb: Number(amountStr),
          payment_method: method,
          notes: notes || null,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      closeModal();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : t("common.error"));
    },
  });

  const openModal = (billId: string) => {
    setPayingBillId(billId);
    setAmountStr("");
    setMethod("cash");
    setNotes("");
    setError(null);
  };

  const closeModal = () => {
    setPayingBillId(null);
    setAmountStr("");
    setNotes("");
    setError(null);
  };

  const canSubmit =
    Number(amountStr) > 0 &&
    Number(amountStr) <= outstanding + 0.01 &&
    !recordPayment.isPending;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>{t("reception.eyebrow")}</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>{t("reception.billing.eyebrow")}</Text>
          <Text style={styles.title}>{t("reception.billing.title")}</Text>
        </View>
        <Text style={styles.count}>{filtered.length}</Text>
      </View>

      {/* Filters */}
      <View style={styles.pillRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.pill, filter === f.key && styles.pillActive]}
          >
            <Text style={[styles.pillText, filter === f.key && styles.pillTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="small" color={theme.colors.primary} /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{t("common.error")}</Text>
          <Button label={t("common.retry")} variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Receipt size={32} color={theme.colors.muted} strokeWidth={1.6} />
          <Text style={styles.mutedText}>{t("patient.bills.noBills")}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((b, idx) => {
            const due = Number(b.amount_etb) - Number(b.paid_amount_etb);
            return (
              <View
                key={b.id}
                style={[styles.row, idx < filtered.length - 1 && styles.rowBorder]}
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
                    {due > 0.01 ? ` · ${due.toLocaleString()} ETB` : " · ✅"}
                  </Text>
                </View>
                {b.status !== "paid" && b.status !== "cancelled" ? (
                  <Pressable onPress={() => openModal(b.id)} style={styles.payBtn}>
                    <Wallet size={13} color={theme.colors.textInverse} strokeWidth={2.4} />
                    <Text style={styles.payBtnText}>{t("status.paid")}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {/* Payment modal */}
      <Modal visible={payingBillId !== null} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("reception.billing.recordPayment")}</Text>
              <Pressable onPress={closeModal} style={styles.modalClose}>
                <X size={16} color={theme.colors.muted} strokeWidth={2.2} />
              </Pressable>
            </View>

            {payingBill ? (
              <Text style={styles.modalInfo}>
                {Number(payingBill.amount_etb).toLocaleString()} ETB ·{" "}
                {outstanding.toLocaleString()} ETB
              </Text>
            ) : null}

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>{t("reception.billing.amount")}</Text>
            <TextInput
              value={amountStr}
              onChangeText={(v) => setAmountStr(v.replace(/[^0-9.]/g, ""))}
              placeholder={outstanding.toFixed(2)}
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />

            <Text style={[styles.label, styles.labelSpaced]}>{t("reception.billing.method")}</Text>
            <View style={styles.methodRow}>
              {METHODS.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => setMethod(m.key)}
                  style={[styles.method, method === m.key && styles.methodActive]}
                >
                  <Text style={[styles.methodText, method === m.key && styles.methodTextActive]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, styles.labelSpaced]}>{t("reception.billing.notes")}</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={t("patient.bills.partial")}
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <Button label={t("common.cancel")} variant="ghost" size="md" onPress={closeModal} />
              <Button
                label={t("reception.billing.recordPayment")}
                variant="primary"
                size="md"
                disabled={!canSubmit}
                loading={recordPayment.isPending}
                onPress={() => recordPayment.mutate()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.lg, maxWidth: 1100, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  count: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
  pill: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.radius.full, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, cursor: "pointer" as any },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.text },
  pillTextActive: { color: theme.colors.textInverse },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  errorBanner: { backgroundColor: theme.colors.dangerBg, padding: theme.spacing.md, borderRadius: theme.radius.md },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconCol: { width: 36, height: 36, borderRadius: theme.radius.sm, backgroundColor: "rgba(42,42,114,0.06)", alignItems: "center", justifyContent: "center" },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14.5, color: theme.colors.text },
  rowSub: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 3 },
  payBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: theme.spacing.md, paddingVertical: 7, backgroundColor: theme.colors.secondary, borderRadius: theme.radius.sm, cursor: "pointer" as any },
  payBtnText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 12.5, color: theme.colors.textInverse },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(20,20,31,0.5)", alignItems: "center", justifyContent: "center", padding: theme.spacing.lg },
  modalCard: { width: "100%", maxWidth: 480, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.xl, gap: theme.spacing.sm },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.sm },
  modalTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 18, color: theme.colors.text, flex: 1 },
  modalClose: { padding: theme.spacing.xs, cursor: "pointer" as any },
  modalInfo: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted, marginBottom: theme.spacing.sm },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted },
  labelSpaced: { marginTop: theme.spacing.md },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.bg },
  methodRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
  method: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.bg, cursor: "pointer" as any },
  methodActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  methodText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.text },
  methodTextActive: { color: theme.colors.textInverse, fontFamily: theme.fontFamily.bodyBold },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing.sm, marginTop: theme.spacing.lg },
});
