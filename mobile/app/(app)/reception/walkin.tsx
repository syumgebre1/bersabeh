/**
 * Reception: Register walk-in patient + create immediate appointment.
 * Trilingual.
 */

import { ArrowLeft, UserPlus } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { useStaffList } from "@/lib/admin";
import type { SessionUser } from "@/store/app";
import { theme } from "@/constants/theme";


interface RegisterResponse {
  user: { id: string; full_name: string; email: string };
  message: string;
}


export default function WalkInRegister() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: users } = useStaffList();
  const doctors = (users ?? []).filter((u: SessionUser) => u.role === "doctor");

  // Patient fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("WalkIn@12345");

  // Appointment fields
  const [doctorId, setDoctorId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const register = useMutation({
    mutationFn: async () => {
      // 1. Register patient
      const reg = await apiFetch<RegisterResponse>("/api/v1/auth/register/patient", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone: phone || null,
          password,
        }),
        auth: false,
      });
      const patientId = reg.user.id;

      // 2. Create appointment if a doctor was assigned
      if (doctorId) {
        const scheduledAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await apiFetch("/api/v1/appointments", {
          method: "POST",
          body: JSON.stringify({
            patient_id: patientId,
            doctor_id: doctorId,
            scheduled_at: scheduledAt,
            duration_minutes: 30,
            reason: reason || null,
          }),
        });
      }

      return reg;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["users-pending"] });
      router.back();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : t("common.error"));
    },
  });

  const canSubmit =
    fullName.trim().length >= 2 &&
    email.trim().length > 5 &&
    !register.isPending;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>{t("reception.eyebrow")}</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>{t("reception.walkin.eyebrow")}</Text>
          <Text style={styles.title}>{t("reception.walkin.title")}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        <Text style={styles.sectionLabel}>{t("reception.walkin.details")}</Text>

        <Text style={styles.label}>{t("auth.fullName")}</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Aster Tesfaye"
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.input}
        />

        <Text style={[styles.label, styles.labelSpaced]}>{t("auth.email")}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="aster@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.input}
        />

        <Text style={[styles.label, styles.labelSpaced]}>{t("auth.phoneOptional")}</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+251 911 234 567"
          keyboardType="phone-pad"
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.input}
        />

        <Text style={[styles.label, styles.labelSpaced]}>{t("auth.tempPassword")}</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="WalkIn@12345"
          secureTextEntry
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.input}
        />
        <Text style={styles.helpText}>{t("reception.walkin.tempPasswordNote")}</Text>

        <Text style={[styles.sectionLabel, styles.labelSpaced]}>
          {t("reception.walkin.assign")}
        </Text>
        {doctors.length === 0 ? (
          <Text style={styles.mutedText}>{t("reception.book.noDoctors")}</Text>
        ) : (
          <View style={styles.pillWrap}>
            {doctors.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => setDoctorId(d.id === doctorId ? "" : d.id)}
                style={[styles.pill, doctorId === d.id && styles.pillActive]}
              >
                <Text style={[styles.pillText, doctorId === d.id && styles.pillTextActive]}>
                  {d.full_name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.label, styles.labelSpaced]}>{t("reception.book.reason")}</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder={t("patient.appointments.reason")}
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.input}
        />

        <View style={styles.actions}>
          <Button
            label={t("common.cancel")}
            variant="ghost"
            size="md"
            onPress={() => router.back()}
          />
          <Button
            label={t("reception.walkin.registerAndBook")}
            variant="primary"
            size="md"
            disabled={!canSubmit}
            loading={register.isPending}
            leftIcon={<UserPlus size={14} color={theme.colors.textInverse} strokeWidth={2.2} />}
            onPress={() => register.mutate()}
          />
        </View>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 800, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  errorBanner: { backgroundColor: theme.colors.dangerBg, padding: theme.spacing.md, borderRadius: theme.radius.md },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  formCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.xl, gap: theme.spacing.sm },
  sectionLabel: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", color: theme.colors.primary },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted },
  labelSpaced: { marginTop: theme.spacing.lg },
  helpText: { fontFamily: theme.fontFamily.body, fontSize: 11.5, fontStyle: "italic", color: theme.colors.mutedLight },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.muted, paddingVertical: theme.spacing.md },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.bg },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  pill: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.full, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, cursor: "pointer" as any },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  pillTextActive: { color: theme.colors.textInverse, fontFamily: theme.fontFamily.bodyBold },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing.sm, marginTop: theme.spacing.xl },
});
