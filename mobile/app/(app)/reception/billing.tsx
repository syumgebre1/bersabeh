/**
 * Reception: Billing — list of bills with a "Record payment" modal.
 */

import { ArrowLeft, Receipt, Wallet, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { useBills } from "@/lib/admin";
import { theme } from "@/constants/theme";


const FILTERS = ["all", "unpaid", "partial", "paid"];
const METHODS = ["cash", "telebirr", "cbe_birr", "chapa", "card"];


function statusChip(s: string) {
  switch (s) {
    case "paid":     return { bg: theme.colors.successBg, fg: theme.colors.success, label: "Paid" };
    case "partial":  return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: "Partial" };
    case "cancelled":return { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: "Cancelled" };
    default:         return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: "Unpaid" };
  }
}


export default function ReceptionBilling() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: bills, isLoading, isError, refetch } = useBills({ limit: 200 });
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
      if (!payingBillId) throw new Error("No bill selected");
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
      setError(err instanceof Error ? err.message : "Could not record payment");
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
          <Text style={styles.backText}>Reception</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>Finance</Text>
          <Text style={styles.title}>Billing</Text>
        </View>
        <Text style={styles.count}>{filtered.length} bills</Text>
      </View>

      {/* Filters */}
      <View style={styles.pillRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.pill, filter === f && styles.pillActive]}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="small" color={theme.colors.primary} /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load bills.</Text>
          <Button label="Retry" variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Receipt size={32} color={theme.colors.muted} strokeWidth={1.6} />
          <Text style={styles.mutedText}>No bills match this filter.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((b, idx) => {
            const c = statusChip(b.status);
            const due = Number(b.amount_etb) - Number(b.paid_amount_etb);
            return (
              <View
                key={b.id}
                style={[
                  styles.row,
                  idx < filtered.length - 1 && styles.rowBorder,
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
                    {due > 0.01 ? ` · ${due.toLocaleString()} ETB due` : " · settled"}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: c.bg }]}>
                  <Text style={[styles.chipText, { color: c.fg }]}>{c.label}</Text>
                </View>
                {b.status !== "paid" && b.status !== "cancelled" ? (
                  <Pressable
                    onPress={() => openModal(b.id)}
                    style={styles.payBtn}
                  >
                    <Wallet size={13} color={theme.colors.textInverse} strokeWidth={2.4} />
                    <Text style={styles.payBtnText}>Pay</Text>
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
              <Text style={styles.modalTitle}>Record payment</Text>
              <Pressable onPress={closeModal} style={styles.modalClose}>
                <X size={16} color={theme.colors.muted} strokeWidth={2.2} />
              </Pressable>
            </View>

            {payingBill ? (
              <Text style={styles.modalInfo}>
                Bill total: <Text style={styles.modalInfoBold}>{Number(payingBill.amount_etb).toLocaleString()} ETB</Text>
                {"  ·  "}Outstanding: <Text style={styles.modalInfoBold}>{outstanding.toLocaleString()} ETB</Text>
              </Text>
            ) : null}

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Amount (ETB)</Text>
            <TextInput
              value={amountStr}
              onChangeText={(v) => setAmountStr(v.replace(/[^0-9.]/g, ""))}
              placeholder={outstanding.toFixed(2)}
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />

            <Text style={[styles.label, styles.labelSpaced]}>Method</Text>
            <View style={styles.methodRow}>
              {METHODS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMethod(m)}
                  style={[styles.method, method === m && styles.methodActive]}
                >
                  <Text style={[styles.methodText, method === m && styles.methodTextActive]}>
                    {m.replace("_", " ")}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, styles.labelSpaced]}>Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Partial payment"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <Button label="Cancel" variant="ghost" size="md" onPress={closeModal} />
              <Button
                label="Record payment"
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
  pill: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.radius.full, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.text, textTransform: "capitalize" },
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
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
  payBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: theme.spacing.md, paddingVertical: 7, backgroundColor: theme.colors.secondary, borderRadius: theme.radius.sm },
  payBtnText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 12.5, color: theme.colors.textInverse },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(20,20,31,0.5)", alignItems: "center", justifyContent: "center", padding: theme.spacing.lg },
  modalCard: { width: "100%", maxWidth: 480, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.xl, gap: theme.spacing.sm },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.sm },
  modalTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 18, color: theme.colors.text, flex: 1 },
  modalClose: { padding: theme.spacing.xs },
  modalInfo: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted, marginBottom: theme.spacing.sm },
  modalInfoBold: { fontFamily: theme.fontFamily.bodyBold, color: theme.colors.text },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted },
  labelSpaced: { marginTop: theme.spacing.md },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.bg },
  methodRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
  method: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.bg },
  methodActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  methodText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.text, textTransform: "capitalize" },
  methodTextActive: { color: theme.colors.textInverse, fontFamily: theme.fontFamily.bodyBold },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing.sm, marginTop: theme.spacing.lg },
});
