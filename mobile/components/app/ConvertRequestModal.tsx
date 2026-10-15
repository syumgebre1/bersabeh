/**
 * ConvertRequestModal — turn a booking request into a real appointment.
 *
 * Reception picks a final date + time, optionally links to an existing
 * patient, and submits. Backend creates the patient (if needed) and the
 * appointment in one transaction.
 */

import { Calendar, Check, X } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { DateStrip } from "@/components/ui/DateStrip";
import { TimeSlotGrid } from "@/components/ui/TimeSlotGrid";
import { useConvertBookingRequest, type BookingRequestRead } from "@/lib/public";
import { usePatients } from "@/lib/admin";
import { theme } from "@/constants/theme";


interface Props {
  request: BookingRequestRead;
  onClose: () => void;
  onConverted: (appointmentId: string | null) => void;
}


export function ConvertRequestModal({ request, onClose, onConverted }: Props) {
  const { t } = useTranslation();
  const { data: patientsData } = usePatients();
  const patients = patientsData ?? [];
  const convert = useConvertBookingRequest();

  const [dateIso, setDateIso] = useState<string | null>(
    request.preferred_at ? request.preferred_at.slice(0, 10) : null,
  );
  const [time, setTime] = useState<string | null>(
    request.preferred_at
      ? new Date(request.preferred_at).toISOString().slice(11, 16)
      : null,
  );
  const [linkPatientId, setLinkPatientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!dateIso && !!time && !convert.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      const scheduledAt = new Date(`${dateIso}T${time}:00`).toISOString();
      const result = await convert.mutateAsync({
        id: request.id,
        payload: {
          scheduled_at: scheduledAt,
          duration_minutes: 30,
          existing_patient_id: linkPatientId,
          reason: request.reason,
        },
      });
      onConverted(result.converted_appointment_id);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message :
        (typeof e === "object" && e !== null && "detail" in e)
          ? String((e as any).detail)
          : typeof e === "string" ? e : t("common.error");
      setError(String(msg));
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Calendar size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.title}>{t("requests.convertTitle")}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={theme.colors.muted} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryName}>{request.full_name}</Text>
              <Text style={styles.summaryMeta}>{request.phone}</Text>
              {request.reason ? (
                <Text style={styles.summaryReason}>{request.reason}</Text>
              ) : null}
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Date */}
            <Text style={styles.label}>{t("patient.appointments.selectDate")}</Text>
            <DateStrip value={dateIso ?? ""} onChange={setDateIso} />

            {/* Time */}
            <Text style={[styles.label, styles.labelSpaced]}>{t("patient.appointments.selectTime")}</Text>
            <TimeSlotGrid value={time ?? ""} onChange={setTime} />

            {/* Link to existing patient (optional) */}
            <Text style={[styles.label, styles.labelSpaced]}>{t("requests.linkPatient")}</Text>
            <Text style={styles.hint}>{t("requests.linkPatientHint")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              <Pressable
                onPress={() => setLinkPatientId(null)}
                style={[styles.pill, linkPatientId === null && styles.pillActive]}
              >
                <Text style={[styles.pillText, linkPatientId === null && styles.pillTextActive]}>
                  {t("requests.createNew")}
                </Text>
              </Pressable>
              {patients.slice(0, 20).map((p) => {
                const active = linkPatientId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setLinkPatientId(p.id)}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {p.full_name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.actions}>
              <Button label={t("common.cancel")} variant="ghost" size="md" onPress={onClose} />
              <Button
                label={convert.isPending ? t("common.saving") : t("requests.convertConfirm")}
                variant="primary"
                size="md"
                loading={convert.isPending}
                disabled={!canSubmit}
                leftIcon={<Check size={14} color={theme.colors.textInverse} strokeWidth={2.6} />}
                onPress={handleSubmit}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(20,20,31,0.5)", alignItems: "center", justifyContent: "center", padding: theme.spacing.lg },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, width: "100%", maxWidth: 620, maxHeight: "90%", overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, padding: theme.spacing.xl, paddingBottom: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { flex: 1, fontFamily: theme.fontFamily.heading, fontSize: 20, color: theme.colors.text, letterSpacing: -0.3 },
  closeBtn: { padding: theme.spacing.xs, cursor: "pointer" as any },
  body: { padding: theme.spacing.xl, gap: theme.spacing.sm },
  summaryBox: { backgroundColor: theme.colors.bg, padding: theme.spacing.md, borderRadius: theme.radius.sm, marginBottom: theme.spacing.md },
  summaryName: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: theme.colors.text },
  summaryMeta: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted, marginTop: 2 },
  summaryReason: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.text, marginTop: 6, lineHeight: 18 },
  errorBanner: { backgroundColor: theme.colors.dangerBg, padding: theme.spacing.md, borderRadius: theme.radius.sm },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.danger },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted },
  labelSpaced: { marginTop: theme.spacing.md },
  hint: { fontFamily: theme.fontFamily.body, fontSize: 12, color: theme.colors.mutedLight, marginTop: 2, marginBottom: 4 },
  pillRow: { flexDirection: "row", gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  pill: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.full, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.bg, cursor: "pointer" as any },
  pillActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  pillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  pillTextActive: { color: theme.colors.textInverse },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing.sm, marginTop: theme.spacing.lg },
});
