/**
 * Pending patient approvals queue.
 *
 * Admin approves (→ status=active) or rejects with a reason (→ status=rejected).
 * Both actions call the backend, which sends the reason to the patient.
 */

import { ArrowLeft, CheckCircle2, Mail, Phone, X, XCircle } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import {
  useApprovePatient,
  usePendingPatients,
  useRejectPatient,
} from "@/lib/admin";
import { theme } from "@/constants/theme";


interface Pending {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
}


function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


export default function PendingPatientsScreen() {
  const router = useRouter();
  const { data: pending, isLoading, isError, refetch } = usePendingPatients();
  const approve = useApprovePatient();
  const reject = useRejectPatient();

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApprove = async (userId: string) => {
    setBusyId(userId);
    setErrorMessage(null);
    try {
      await approve.mutateAsync(userId);
      await refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not approve");
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId || !reason.trim()) return;
    setBusyId(rejectingId);
    setErrorMessage(null);
    try {
      await reject.mutateAsync({ userId: rejectingId, reason: reason.trim() });
      setRejectingId(null);
      setReason("");
      await refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not reject");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>Admin</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>Patient verification</Text>
          <Text style={styles.title}>Pending approvals</Text>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.mutedText}>Loading pending patients...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load pending patients.</Text>
          <Button label="Retry" variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : !pending || pending.length === 0 ? (
        <View style={styles.empty}>
          <CheckCircle2 size={40} color={theme.colors.success} strokeWidth={1.8} />
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.mutedText}>
            No pending patient registrations right now.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {(pending as Pending[]).map((p) => {
            const isBusy = busyId === p.id;
            return (
              <View key={p.id} style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialsOf(p.full_name)}</Text>
                </View>

                <View style={styles.rowContent}>
                  <Text style={styles.name}>{p.full_name}</Text>
                  <View style={styles.metaRow}>
                    <Mail size={12} color={theme.colors.muted} strokeWidth={2} />
                    <Text style={styles.metaText}>{p.email}</Text>
                  </View>
                  {p.phone ? (
                    <View style={styles.metaRow}>
                      <Phone size={12} color={theme.colors.muted} strokeWidth={2} />
                      <Text style={styles.metaText}>{p.phone}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.requested}>
                    Requested {new Date(p.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <Button
                    label="Approve"
                    variant="primary"
                    size="sm"
                    disabled={isBusy}
                    loading={isBusy && approve.isPending}
                    onPress={() => handleApprove(p.id)}
                  />
                  <Button
                    label="Reject"
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onPress={() => {
                      setRejectingId(p.id);
                      setReason("");
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Rejection modal */}
      <Modal
        visible={rejectingId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectingId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <XCircle size={20} color={theme.colors.danger} strokeWidth={2.2} />
              <Text style={styles.modalTitle}>Reject registration</Text>
              <Pressable onPress={() => setRejectingId(null)} style={styles.modalClose}>
                <X size={16} color={theme.colors.muted} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={styles.modalBody}>
              The reason is shown to the patient. Be specific and polite.
            </Text>

            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Unable to verify identity. Please visit reception with a valid ID."
              placeholderTextColor={theme.colors.mutedLight}
              multiline
              numberOfLines={4}
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="ghost"
                size="md"
                onPress={() => setRejectingId(null)}
              />
              <Button
                label="Reject patient"
                variant="secondary"
                size="md"
                disabled={!reason.trim() || busyId !== null}
                loading={busyId !== null}
                onPress={handleRejectConfirm}
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
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 1000, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  errorBanner: { backgroundColor: theme.colors.dangerBg, padding: theme.spacing.md, borderRadius: theme.radius.md },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.sm },
  emptyTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 20, color: theme.colors.text },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: theme.colors.textInverse, letterSpacing: 0.3 },
  rowContent: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 15, color: theme.colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  metaText: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted },
  requested: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.mutedLight, marginTop: 4 },
  actions: { flexDirection: "row", gap: theme.spacing.sm },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(20,20,31,0.5)", alignItems: "center", justifyContent: "center", padding: theme.spacing.lg },
  modalCard: { width: "100%", maxWidth: 480, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.xl, gap: theme.spacing.md },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  modalTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 16, color: theme.colors.text, flex: 1 },
  modalClose: { padding: theme.spacing.xs },
  modalBody: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.muted, lineHeight: 19 },
  modalInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.bg, minHeight: 100, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing.sm },
});
