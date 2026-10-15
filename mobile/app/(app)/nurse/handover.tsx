/**
 * Nurse: Handover — real notes + create form + sign/acknowledge flow.
 */

import { ArrowLeft, Check, ClipboardCheck, MessageSquare, Plus, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import {
  useAcknowledgeHandover,
  useCreateHandoverNote,
  useCurrentShift,
  useHandoverNotes,
  usePendingHandovers,
  useSignHandover,
  type HandoverSeverity,
  type HandoverNote,
} from "@/lib/nurse";
import { useStaffList } from "@/lib/admin";
import type { SessionUser } from "@/store/app";
import { theme } from "@/constants/theme";


const SEVERITIES: { key: HandoverSeverity; labelKey: string }[] = [
  { key: "stable",    labelKey: "handover.severityStable" },
  { key: "attention", labelKey: "handover.severityAttention" },
  { key: "critical",  labelKey: "handover.severityCritical" },
];


function severityChip(sev: HandoverSeverity, t: (k: string) => string) {
  switch (sev) {
    case "critical":  return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: t("handover.severityCritical") };
    case "attention": return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: t("handover.severityAttention") };
    default:          return { bg: theme.colors.successBg, fg: theme.colors.success, label: t("handover.severityStable") };
  }
}


export default function NurseHandover() {
  const { t } = useTranslation();
  const router = useRouter();

  const { data: shift } = useCurrentShift();
  const { data: notes, isLoading, isError, refetch } = useHandoverNotes();
  const { data: pending } = usePendingHandovers();
  const { data: users } = useStaffList();
  const createNote = useCreateHandoverNote();
  const signHandover = useSignHandover();
  const acknowledge = useAcknowledgeHandover();

  // Create note modal
  const [showCreate, setShowCreate] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSeverity, setNoteSeverity] = useState<HandoverSeverity>("stable");
  const [notePatientId, setNotePatientId] = useState<string | null>(null);

  // Sign handover modal
  const [showSign, setShowSign] = useState(false);
  const [signToNurseId, setSignToNurseId] = useState<string | null>(null);
  const [signNotes, setSignNotes] = useState("");

  const [error, setError] = useState<string | null>(null);

  const patients = (users ?? []).filter((u: SessionUser) => u.role === "patient");
  const nurses = (users ?? []).filter((u: SessionUser) => u.role === "nurse");

  const handleCreateNote = async () => {
    if (!noteText.trim()) return;
    setError(null);
    try {
      await createNote.mutateAsync({
        note: noteText.trim(),
        severity: noteSeverity,
        patient_id: notePatientId || undefined,
      });
      setShowCreate(false);
      setNoteText("");
      setNoteSeverity("stable");
      setNotePatientId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleSignHandover = async () => {
    setError(null);
    try {
      await signHandover.mutateAsync({
        toNurseId: signToNurseId || undefined,
        notes: signNotes || undefined,
      });
      setShowSign(false);
      setSignNotes("");
      setSignToNurseId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleAcknowledge = async (handoverId: string) => {
    setError(null);
    try {
      await acknowledge.mutateAsync(handoverId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>{t("nurse.roleName")}</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.title}>{t("nurse.handoverNotes")}</Text>
          {shift ? (
            <Text style={styles.subtitle}>
              {shift.ward} · {new Date(shift.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          ) : null}
        </View>
        <View style={styles.topActions}>
          <Pressable
            onPress={() => setShowCreate(true)}
            style={({ hovered }: any) => [styles.iconBtn, hovered && styles.iconBtnHover]}
          >
            <Plus size={16} color={theme.colors.primary} strokeWidth={2.4} />
            <Text style={styles.iconBtnText}>{t("handover.newNote")}</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowSign(true)}
            disabled={!shift}
            style={({ hovered }: any) => [styles.primaryBtn, hovered && styles.primaryBtnHover, !shift && styles.btnDisabled]}
          >
            <ClipboardCheck size={14} color={theme.colors.textInverse} strokeWidth={2.4} />
            <Text style={styles.primaryBtnText}>{t("handover.signHandover")}</Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Pending handovers to acknowledge */}
      {(pending ?? []).length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("handover.pendingTitle")}</Text>
          <View style={styles.pendingList}>
            {(pending ?? []).map((h) => (
              <View key={h.id} style={styles.pendingCard}>
                <View style={styles.pendingHeader}>
                  <ClipboardCheck size={16} color={theme.colors.warning} strokeWidth={2.2} />
                  <Text style={styles.pendingFrom}>
                    {h.from_nurse?.full_name ?? "—"} · {new Date(h.handed_over_at).toLocaleString([], {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </Text>
                  <Pressable
                    onPress={() => handleAcknowledge(h.id)}
                    disabled={acknowledge.isPending}
                    style={({ hovered }: any) => [styles.ackBtn, hovered && styles.ackBtnHover]}
                  >
                    <Check size={14} color={theme.colors.textInverse} strokeWidth={2.6} />
                    <Text style={styles.ackBtnText}>{t("handover.acknowledge")}</Text>
                  </Pressable>
                </View>
                {h.notes ? <Text style={styles.pendingNotes}>{h.notes}</Text> : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Notes list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("handover.notesTitle")} ({(notes ?? []).length})
        </Text>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{t("common.error")}</Text>
            <Button label={t("common.retry")} variant="outline" size="sm" onPress={() => refetch()} />
          </View>
        ) : (notes ?? []).length === 0 ? (
          <View style={styles.emptyCard}>
            <ClipboardCheck size={28} color={theme.colors.muted} strokeWidth={1.6} />
            <Text style={styles.emptyText}>{t("handover.noNotes")}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {(notes ?? []).map((n: HandoverNote, idx) => {
              const c = severityChip(n.severity, t);
              return (
                <View
                  key={n.id}
                  style={[styles.noteRow, idx < (notes ?? []).length - 1 && styles.noteBorder]}
                >
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteTime}>
                      {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    {n.patient ? (
                      <Text style={styles.notePatient}>
                        {n.patient.full_name}
                      </Text>
                    ) : null}
                    <View style={[styles.chip, { backgroundColor: c.bg }]}>
                      <Text style={[styles.chipText, { color: c.fg }]}>{c.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.noteBody}>{n.note}</Text>
                  <Text style={styles.noteAuthor}>
                    {t("handover.by")} {n.author?.full_name ?? "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ---------- Create note modal ---------- */}
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("handover.newNote")}</Text>
              <Pressable onPress={() => setShowCreate(false)} style={styles.modalClose}>
                <X size={16} color={theme.colors.muted} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={styles.label}>{t("handover.noteText")}</Text>
            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={4}
              placeholderTextColor={theme.colors.mutedLight}
              style={[styles.input, styles.inputMultiline]}
            />

            <Text style={[styles.label, styles.labelSpaced]}>{t("handover.severity")}</Text>
            <View style={styles.pillRow}>
              {SEVERITIES.map((s) => (
                <Pressable
                  key={s.key}
                  onPress={() => setNoteSeverity(s.key)}
                  style={[styles.pill, noteSeverity === s.key && styles.pillActive]}
                >
                  <Text style={[styles.pillText, noteSeverity === s.key && styles.pillTextActive]}>
                    {t(s.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, styles.labelSpaced]}>{t("handover.linkPatient")}</Text>
            <View style={styles.pillWrap}>
              <Pressable
                onPress={() => setNotePatientId(null)}
                style={[styles.pill, notePatientId === null && styles.pillActive]}
              >
                <Text style={[styles.pillText, notePatientId === null && styles.pillTextActive]}>
                  {t("handover.none")}
                </Text>
              </Pressable>
              {patients.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setNotePatientId(p.id)}
                  style={[styles.pill, notePatientId === p.id && styles.pillActive]}
                >
                  <Text style={[styles.pillText, notePatientId === p.id && styles.pillTextActive]}>
                    {p.full_name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button label={t("common.cancel")} variant="ghost" size="md" onPress={() => setShowCreate(false)} />
              <Button
                label={t("handover.saveNote")}
                variant="primary"
                size="md"
                disabled={!noteText.trim() || createNote.isPending}
                loading={createNote.isPending}
                onPress={handleCreateNote}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- Sign handover modal ---------- */}
      <Modal visible={showSign} transparent animationType="fade" onRequestClose={() => setShowSign(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("handover.signHandover")}</Text>
              <Pressable onPress={() => setShowSign(false)} style={styles.modalClose}>
                <X size={16} color={theme.colors.muted} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={styles.modalInfo}>{t("handover.signInfo")}</Text>

            <Text style={styles.label}>{t("handover.toNurse")}</Text>
            <View style={styles.pillWrap}>
              <Pressable
                onPress={() => setSignToNurseId(null)}
                style={[styles.pill, signToNurseId === null && styles.pillActive]}
              >
                <Text style={[styles.pillText, signToNurseId === null && styles.pillTextActive]}>
                  {t("handover.unassigned")}
                </Text>
              </Pressable>
              {nurses.map((n) => (
                <Pressable
                  key={n.id}
                  onPress={() => setSignToNurseId(n.id)}
                  style={[styles.pill, signToNurseId === n.id && styles.pillActive]}
                >
                  <Text style={[styles.pillText, signToNurseId === n.id && styles.pillTextActive]}>
                    {n.full_name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, styles.labelSpaced]}>{t("handover.signNotes")}</Text>
            <TextInput
              value={signNotes}
              onChangeText={setSignNotes}
              multiline
              numberOfLines={3}
              placeholderTextColor={theme.colors.mutedLight}
              style={[styles.input, styles.inputMultiline]}
            />

            <View style={styles.modalActions}>
              <Button label={t("common.cancel")} variant="ghost" size="md" onPress={() => setShowSign(false)} />
              <Button
                label={t("handover.confirmSign")}
                variant="primary"
                size="md"
                loading={signHandover.isPending}
                onPress={handleSignHandover}
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
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  subtitle: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted, marginTop: 4 },
  topActions: { flexDirection: "row", gap: theme.spacing.sm },
  iconBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, cursor: "pointer" as any },
  iconBtnHover: { borderColor: theme.colors.primary },
  iconBtnText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.primary },
  primaryBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm, cursor: "pointer" as any },
  primaryBtnHover: { opacity: 0.9 },
  primaryBtnText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13, color: theme.colors.textInverse },
  btnDisabled: { opacity: 0.5 },
  errorBanner: { backgroundColor: theme.colors.dangerBg, padding: theme.spacing.md, borderRadius: theme.radius.md },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  section: { gap: theme.spacing.md },
  sectionTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  noteRow: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, gap: theme.spacing.sm },
  noteBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  noteHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, flexWrap: "wrap" },
  noteTime: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, color: theme.colors.text, letterSpacing: -0.1 },
  notePatient: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted },
  noteBody: { fontFamily: theme.fontFamily.body, fontSize: 14, lineHeight: 20, color: theme.colors.text },
  noteAuthor: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.mutedLight },
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
  emptyCard: { alignItems: "center", justifyContent: "center", gap: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.xxl },
  emptyText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  pendingList: { gap: theme.spacing.sm },
  pendingCard: { backgroundColor: theme.colors.warningBg, borderRadius: theme.radius.md, padding: theme.spacing.lg, gap: theme.spacing.sm },
  pendingHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, flexWrap: "wrap" },
  pendingFrom: { flex: 1, fontFamily: theme.fontFamily.bodyMedium, fontSize: 13.5, color: theme.colors.text },
  ackBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.warning, borderRadius: theme.radius.sm, cursor: "pointer" as any },
  ackBtnHover: { opacity: 0.9 },
  ackBtnText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 12.5, color: theme.colors.textInverse },
  pendingNotes: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.text, lineHeight: 19 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(20,20,31,0.5)", alignItems: "center", justifyContent: "center", padding: theme.spacing.lg },
  modalCard: { width: "100%", maxWidth: 520, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.xl, gap: theme.spacing.sm, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.sm },
  modalTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 18, color: theme.colors.text, flex: 1 },
  modalClose: { padding: theme.spacing.xs, cursor: "pointer" as any },
  modalInfo: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.muted, marginBottom: theme.spacing.sm },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted },
  labelSpaced: { marginTop: theme.spacing.md },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.bg },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  pill: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.radius.full, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, cursor: "pointer" as any },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  pillTextActive: { color: theme.colors.textInverse, fontFamily: theme.fontFamily.bodyBold },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing.sm, marginTop: theme.spacing.lg },
});
