/**
 * BookingModal — guest booking request from the public landing page.
 *
 * Flow:
 *   1. Pick doctor (optional — falls back to "Any available")
 *   2. Pick preferred date + time (optional)
 *   3. Enter name + phone (+ optional email + reason)
 *   4. Submit → POST /public/booking-requests
 *   5. Confirmation card
 *
 * No account is created. Reception follows up by phone.
 */

import { X } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { DateStrip } from "@/components/ui/DateStrip";
import { TimeSlotGrid } from "@/components/ui/TimeSlotGrid";
import { useCreateBookingRequest } from "@/lib/public";
import { useDoctors } from "@/lib/admin";
import { theme } from "@/constants/theme";


interface Props {
  visible: boolean;
  onClose: () => void;
  defaultDepartment?: string;
  defaultDate?: string;
}


export function BookingModal({ visible, onClose, defaultDate }: Props) {
  const { t } = useTranslation();
  const { data: doctors, isLoading: doctorsLoading } = useDoctors();
  const createRequest = useCreateBookingRequest();

  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [dateIso, setDateIso] = useState<string | null>(defaultDate ?? null);
  const [time, setTime] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = fullName.trim().length > 1
    && phone.trim().length >= 7
    && !createRequest.isPending;

  const reset = () => {
    setDoctorId(null);
    setDateIso(defaultDate ?? null);
    setTime(null);
    setFullName("");
    setPhone("");
    setEmail("");
    setReason("");
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);

    // Combine date + time into ISO if both provided
    let preferredAt: string | null = null;
    if (dateIso && time) {
      try {
        preferredAt = new Date(`${dateIso}T${time}:00`).toISOString();
      } catch {
        preferredAt = null;
      }
    }

    try {
      await createRequest.mutateAsync({
        full_name: fullName,
        phone,
        email: email || null,
        doctor_id: doctorId,
        preferred_at: preferredAt,
        reason: reason || null,
      });
      setSuccess(true);
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("booking.title")}</Text>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <X size={18} color={theme.colors.muted} strokeWidth={2.2} />
            </Pressable>
          </View>

          {success ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>{t("booking.successTitle")}</Text>
              <Text style={styles.successBody}>{t("booking.successBody")}</Text>
              <Button
                label={t("common.close")}
                variant="primary"
                size="md"
                onPress={handleClose}
              />
            </View>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Doctor (optional) */}
              <Text style={styles.label}>{t("booking.doctor")}</Text>
              {doctorsLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <View style={styles.pillRow}>
                  <Pressable
                    onPress={() => setDoctorId(null)}
                    style={[styles.pill, doctorId === null && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, doctorId === null && styles.pillTextActive]}>
                      {t("booking.anyDoctor")}
                    </Text>
                  </Pressable>
                  {(doctors ?? []).map((d) => {
                    const active = doctorId === d.id;
                    return (
                      <Pressable
                        key={d.id}
                        onPress={() => setDoctorId(d.id)}
                        style={[styles.pill, active && styles.pillActive]}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>
                          {d.full_name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Date (optional) */}
              <Text style={[styles.label, styles.labelSpaced]}>{t("booking.date")}</Text>
              <DateStrip value={dateIso ?? ""} onChange={setDateIso} />

              {/* Time (optional) */}
              {dateIso ? (
                <>
                  <Text style={[styles.label, styles.labelSpaced]}>{t("booking.time")}</Text>
                  <TimeSlotGrid value={time ?? ""} onChange={setTime} />
                </>
              ) : null}

              {/* Contact */}
              <Text style={[styles.label, styles.labelSpaced]}>{t("booking.fullName")}</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder={t("booking.fullNamePlaceholder")}
                placeholderTextColor={theme.colors.mutedLight}
                style={styles.input}
              />

              <Text style={[styles.label, styles.labelSpaced]}>{t("booking.phone")}</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+251 911 234 567"
                keyboardType="phone-pad"
                placeholderTextColor={theme.colors.mutedLight}
                style={styles.input}
              />

              <Text style={[styles.label, styles.labelSpaced]}>{t("booking.email")}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={theme.colors.mutedLight}
                style={styles.input}
              />

              <Text style={[styles.label, styles.labelSpaced]}>{t("booking.reason")}</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder={t("booking.reasonPlaceholder")}
                multiline
                numberOfLines={3}
                placeholderTextColor={theme.colors.mutedLight}
                style={[styles.input, styles.textarea]}
              />

              <View style={styles.actions}>
                <Button
                  label={t("common.cancel")}
                  variant="ghost"
                  size="md"
                  onPress={handleClose}
                />
                <Button
                  label={createRequest.isPending ? t("common.saving") : t("booking.submit")}
                  variant="primary"
                  size="md"
                  loading={createRequest.isPending}
                  disabled={!canSubmit}
                  onPress={handleSubmit}
                />
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,20,31,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: "100%",
    maxWidth: 600,
    maxHeight: "90%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    flex: 1,
    fontFamily: theme.fontFamily.heading,
    fontSize: 22,
    color: theme.colors.text,
    letterSpacing: -0.4,
  },
  closeBtn: { padding: theme.spacing.xs, cursor: "pointer" as any },
  scroll: { maxHeight: 600 },
  scrollContent: { padding: theme.spacing.xl, gap: theme.spacing.sm },
  label: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 11.5,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: theme.colors.muted,
  },
  labelSpaced: { marginTop: theme.spacing.md },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  pill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    cursor: "pointer" as any,
  },
  pillActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  pillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
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
  textarea: { minHeight: 80, textAlignVertical: "top" },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  errorBanner: {
    backgroundColor: theme.colors.dangerBg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
  },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.danger },
  successBox: {
    padding: theme.spacing.xxl,
    alignItems: "center",
    gap: theme.spacing.md,
  },
  successTitle: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 22,
    color: theme.colors.success,
    letterSpacing: -0.4,
  },
  successBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14.5,
    color: theme.colors.text,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: theme.spacing.md,
  },
});
