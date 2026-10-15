/**
 * Reusable "compose new message" modal.
 *
 * Nurse/doctor use it from dashboard CTAs and the messages list.
 * For kind='case', a patient must be selected (backend requires it).
 */

import { MessageSquare, Send, Users, User as UserIcon, X } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { useCreateThread, useDoctors, usePatients } from "@/lib/admin";
import { theme } from "@/constants/theme";


interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated?: (threadId: string) => void;
  /** Optional: default recipient (e.g. open from a specific doctor). */
  defaultDoctorId?: string;
  /** Optional: default patient (e.g. open from a room page). */
  defaultPatientId?: string;
}


export function ComposeMessage({
  visible, onClose, onCreated, defaultDoctorId, defaultPatientId,
}: Props) {
  const { t } = useTranslation();
  const { data: doctors, isLoading: doctorsLoading } = useDoctors();
  const { data: patients, isLoading: patientsLoading } = usePatients();
  const createThread = useCreateThread();

  const [patientId, setPatientId] = useState<string | null>(defaultPatientId ?? null);
  const [doctorId, setDoctorId] = useState<string | null>(defaultDoctorId ?? null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const canSubmit =
    !!patientId && !!doctorId && body.trim().length > 0 && !sending;

  const reset = () => {
    setPatientId(defaultPatientId ?? null);
    setDoctorId(defaultDoctorId ?? null);
    setSubject("");
    setBody("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    try {
      const thread = await createThread.mutateAsync({
        participant_ids: [doctorId!],
        kind: "case",
        subject: subject.trim() || "Nurse follow-up",
        patient_id: patientId!,
      });

      // Send the first message
      await apiFetch(`/api/v1/threads/${thread.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim() }),
      });

      reset();
      onClose();
      onCreated?.(thread.id);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message :
        (typeof e === "object" && e !== null && "detail" in e)
          ? String((e as any).detail)
          : typeof e === "string" ? e : t("common.error");
      setError(String(msg));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <MessageSquare size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.title}>{t("messages.composeTitle")}</Text>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <X size={18} color={theme.colors.muted} strokeWidth={2.2} />
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Patient picker */}
          <View style={styles.pickerHeader}>
            <Users size={13} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.label}>{t("messages.patient")}</Text>
          </View>
          {patientsLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : !patients || patients.length === 0 ? (
            <Text style={styles.emptyText}>{t("messages.noPatients")}</Text>
          ) : (
            <ScrollView style={styles.pickerScroll} contentContainerStyle={styles.pillList}>
              {patients.map((p) => {
                const active = patientId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setPatientId(p.id)}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {p.full_name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Doctor picker */}
          <View style={[styles.pickerHeader, styles.pickerHeaderSpaced]}>
            <UserIcon size={13} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.label}>{t("messages.recipient")}</Text>
          </View>
          {doctorsLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : !doctors || doctors.length === 0 ? (
            <Text style={styles.emptyText}>{t("messages.noRecipients")}</Text>
          ) : (
            <ScrollView style={styles.pickerScroll} contentContainerStyle={styles.pillList}>
              {doctors.map((d) => {
                const active = doctorId === d.id;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => setDoctorId(d.id)}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {d.full_name}
                      {d.specialty ? ` · ${d.specialty}` : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Subject */}
          <Text style={[styles.label, styles.labelSpaced]}>{t("messages.subjectOptional")}</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder={t("messages.subjectPlaceholder")}
            placeholderTextColor={theme.colors.mutedLight}
            style={styles.input}
          />

          {/* Body */}
          <Text style={[styles.label, styles.labelSpaced]}>{t("messages.message")}</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={t("messages.messagePlaceholder")}
            placeholderTextColor={theme.colors.mutedLight}
            multiline
            numberOfLines={4}
            style={[styles.input, styles.textarea]}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              label={t("common.cancel")}
              variant="ghost"
              size="md"
              onPress={handleClose}
            />
            <Button
              label={sending ? t("common.saving") : t("messages.send")}
              variant="primary"
              size="md"
              loading={sending}
              disabled={!canSubmit}
              leftIcon={<Send size={14} color={theme.colors.textInverse} strokeWidth={2.2} />}
              onPress={handleSubmit}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,20,31,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    width: "100%",
    maxWidth: 560,
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 20,
    color: theme.colors.text,
    flex: 1,
    letterSpacing: -0.3,
  },
  closeBtn: { padding: theme.spacing.xs, cursor: "pointer" as any },
  errorBanner: {
    backgroundColor: theme.colors.dangerBg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    color: theme.colors.danger,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  pickerHeaderSpaced: { marginTop: theme.spacing.md },
  label: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 11.5,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: theme.colors.muted,
  },
  labelSpaced: { marginTop: theme.spacing.md },
  loadingBox: { padding: theme.spacing.md, alignItems: "center" },
  emptyText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    color: theme.colors.muted,
    padding: theme.spacing.sm,
  },
  pickerScroll: { maxHeight: 120 },
  pillList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  pill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    cursor: "pointer" as any,
  },
  pillActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  pillText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    color: theme.colors.text,
  },
  pillTextActive: { color: theme.colors.textInverse },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontFamily: theme.fontFamily.body,
    fontSize: 14.5,
    color: theme.colors.text,
    backgroundColor: theme.colors.bg,
  },
  textarea: { minHeight: 96, textAlignVertical: "top" },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
});
