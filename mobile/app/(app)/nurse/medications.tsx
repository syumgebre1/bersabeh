/**
 * Nurse: Medications — real scheduled doses with administer/skip.
 */

import { ArrowLeft, Check, Clock, Pill, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import {
  useAdministerDose,
  useSkipDose,
  useTodaysMedications,
  type DoseStatus,
  type ScheduledDose,
  type SkipReason,
} from "@/lib/nurse";
import { theme } from "@/constants/theme";


const FILTERS: { key: DoseStatus | "all"; labelKey: string }[] = [
  { key: "all",          labelKey: "superAdmin.all" },
  { key: "pending",      labelKey: "status.pending" },
  { key: "administered", labelKey: "medications.statusAdministered" },
  { key: "skipped",      labelKey: "medications.statusSkipped" },
];

const SKIP_REASONS: { key: SkipReason; labelKey: string }[] = [
  { key: "patient_refused",   labelKey: "medications.skipPatientRefused" },
  { key: "patient_absent",    labelKey: "medications.skipPatientAbsent" },
  { key: "npo",               labelKey: "medications.skipNpo" },
  { key: "adverse_reaction",  labelKey: "medications.skipAdverseReaction" },
  { key: "doctor_hold",       labelKey: "medications.skipDoctorHold" },
  { key: "other",             labelKey: "medications.skipOther" },
];


function statusChip(status: DoseStatus, t: (k: string) => string) {
  switch (status) {
    case "administered": return { bg: theme.colors.successBg, fg: theme.colors.success, label: t("medications.statusAdministered") };
    case "skipped":      return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: t("medications.statusSkipped") };
    case "cancelled":    return { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: t("status.cancelled") };
    default:             return { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: t("status.pending") };
  }
}


export default function NurseMedications() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: doses, isLoading, isError, refetch } = useTodaysMedications();
  const administer = useAdministerDose();
  const skip = useSkipDose();

  const [filter, setFilter] = useState<DoseStatus | "all">("all");
  const [skippingDose, setSkippingDose] = useState<ScheduledDose | null>(null);
  const [skipReason, setSkipReason] = useState<SkipReason>("patient_refused");
  const [skipNotes, setSkipNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = doses ?? [];
    if (filter === "all") return list;
    return list.filter((d) => d.status === filter);
  }, [doses, filter]);

  const handleAdminister = async (doseId: string) => {
    setError(null);
    try {
      await administer.mutateAsync({ doseId });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleSkip = async () => {
    if (!skippingDose) return;
    setError(null);
    try {
      await skip.mutateAsync({
        doseId: skippingDose.id,
        reason: skipReason,
        notes: skipNotes || undefined,
      });
      setSkippingDose(null);
      setSkipNotes("");
      setSkipReason("patient_refused");
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
          <Text style={styles.eyebrow}>{t("nurse.thisShift")}</Text>
          <Text style={styles.title}>{t("nurse.medications")}</Text>
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
              {t(f.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{t("common.error")}</Text>
          <Button label={t("common.retry")} variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Pill size={32} color={theme.colors.muted} strokeWidth={1.6} />
          <Text style={styles.mutedText}>{t("nurse.noMedsToday")}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((dose, idx) => {
            const c = statusChip(dose.status, t);
            const isPending = dose.status === "pending";
            return (
              <View
                key={dose.id}
                style={[styles.row, idx < filtered.length - 1 && styles.rowBorder]}
              >
                <View style={styles.timeCol}>
                  <Clock size={12} color={theme.colors.muted} strokeWidth={2.2} />
                  <Text style={styles.timeText}>
                    {new Date(dose.scheduled_for).toLocaleTimeString([], {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </Text>
                </View>

                <View style={styles.rowContent}>
                  <Text style={styles.medName}>
                    {dose.medication_name} <Text style={styles.medDose}>{dose.dose}</Text>
                  </Text>
                  <Text style={styles.patientName}>{dose.patient?.full_name ?? "—"}</Text>
                  <Text style={styles.freq}>{dose.frequency}</Text>
                </View>

                <View style={[styles.chip, { backgroundColor: c.bg }]}>
                  <Text style={[styles.chipText, { color: c.fg }]}>{c.label}</Text>
                </View>

                {isPending ? (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => handleAdminister(dose.id)}
                      disabled={administer.isPending}
                      style={({ hovered }: any) => [styles.giveBtn, hovered && styles.giveBtnHover]}
                    >
                      <Check size={14} color={theme.colors.textInverse} strokeWidth={2.6} />
                    </Pressable>
                    <Pressable
                      onPress={() => setSkippingDose(dose)}
                      style={({ hovered }: any) => [styles.skipBtn, hovered && styles.skipBtnHover]}
                    >
                      <X size={14} color={theme.colors.danger} strokeWidth={2.6} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {/* Skip modal */}
      <Modal
        visible={skippingDose !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSkippingDose(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("medications.skipTitle")}</Text>
              <Pressable onPress={() => setSkippingDose(null)} style={styles.modalClose}>
                <X size={16} color={theme.colors.muted} strokeWidth={2.2} />
              </Pressable>
            </View>

            {skippingDose ? (
              <Text style={styles.modalInfo}>
                {skippingDose.medication_name} {skippingDose.dose} · {skippingDose.patient?.full_name ?? "—"}
              </Text>
            ) : null}

            <Text style={styles.label}>{t("medications.skipReason")}</Text>
            <View style={styles.reasonList}>
              {SKIP_REASONS.map((r) => (
                <Pressable
                  key={r.key}
                  onPress={() => setSkipReason(r.key)}
                  style={[styles.reasonChoice, skipReason === r.key && styles.reasonChoiceActive]}
                >
                  <View style={[styles.radio, skipReason === r.key && styles.radioActive]}>
                    {skipReason === r.key ? (
                      <View style={styles.radioInner} />
                    ) : null}
                  </View>
                  <Text style={[styles.reasonText, skipReason === r.key && styles.reasonTextActive]}>
                    {t(r.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, styles.labelSpaced]}>{t("medications.skipNotes")}</Text>
            <TextInput
              value={skipNotes}
              onChangeText={setSkipNotes}
              multiline
              numberOfLines={2}
              placeholderTextColor={theme.colors.mutedLight}
              style={[styles.input, styles.inputMultiline]}
            />

            <View style={styles.modalActions}>
              <Button label={t("common.cancel")} variant="ghost" size="md" onPress={() => setSkippingDose(null)} />
              <Button
                label={t("medications.skipConfirm")}
                variant="primary"
                size="md"
                loading={skip.isPending}
                onPress={handleSkip}
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
  errorBanner: { backgroundColor: theme.colors.dangerBg, padding: theme.spacing.md, borderRadius: theme.radius.md },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  timeCol: { width: 64, flexDirection: "row", alignItems: "center", gap: 4 },
  timeText: { fontFamily: theme.fontFamily.headingMedium, fontSize: 13, color: theme.colors.text, letterSpacing: -0.1 },
  rowContent: { flex: 1, minWidth: 0 },
  medName: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14.5, color: theme.colors.text },
  medDose: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14.5, color: theme.colors.muted },
  patientName: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2 },
  freq: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.mutedLight, marginTop: 2 },
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
  actions: { flexDirection: "row", gap: theme.spacing.xs },
  giveBtn: { width: 32, height: 32, borderRadius: theme.radius.sm, backgroundColor: theme.colors.success, alignItems: "center", justifyContent: "center", cursor: "pointer" as any },
  giveBtnHover: { opacity: 0.9 },
  skipBtn: { width: 32, height: 32, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.danger, alignItems: "center", justifyContent: "center", cursor: "pointer" as any },
  skipBtnHover: { backgroundColor: theme.colors.dangerBg },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(20,20,31,0.5)", alignItems: "center", justifyContent: "center", padding: theme.spacing.lg },
  modalCard: { width: "100%", maxWidth: 480, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.xl, gap: theme.spacing.sm, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.sm },
  modalTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 18, color: theme.colors.text, flex: 1 },
  modalClose: { padding: theme.spacing.xs, cursor: "pointer" as any },
  modalInfo: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted, marginBottom: theme.spacing.sm },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted },
  labelSpaced: { marginTop: theme.spacing.md },
  reasonList: { gap: 4 },
  reasonChoice: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius.sm, cursor: "pointer" as any },
  reasonChoiceActive: { backgroundColor: "rgba(42,42,114,0.05)" },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: theme.colors.borderStrong, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: theme.colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },
  reasonText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.text },
  reasonTextActive: { fontFamily: theme.fontFamily.bodyMedium, color: theme.colors.primary },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.bg },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing.sm, marginTop: theme.spacing.lg },
});
