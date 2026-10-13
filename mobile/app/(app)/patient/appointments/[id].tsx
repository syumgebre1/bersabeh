/**
 * Patient: Appointment detail (read-only).
 */

import { CalendarCheck, Clock, MapPin, Stethoscope } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { DetailCard, DetailHeader } from "@/components/app";
import { apiFetch } from "@/lib/api";
import { theme } from "@/constants/theme";


interface AppointmentDetail {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  reason: string | null;
  room: string | null;
  doctor?: { full_name: string; specialty: string | null };
}


export default function AppointmentDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: appt, isLoading, isError, refetch } = useQuery({
    queryKey: ["appointment", id],
    queryFn: () => apiFetch<AppointmentDetail>(`/api/v1/appointments/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !appt) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t("common.error")}</Text>
        <Button label={t("common.retry")} variant="outline" size="sm" onPress={() => refetch()} />
      </View>
    );
  }

  let chip: { bg: string; fg: string; label: string } = {
    bg: theme.colors.bgSunken,
    fg: theme.colors.muted,
    label: t("status.scheduled"),
  };
  switch (appt.status) {
    case "completed":  chip = { bg: theme.colors.successBg, fg: theme.colors.success, label: t("status.completed") }; break;
    case "in_room":    chip = { bg: theme.colors.warningBg, fg: theme.colors.warning, label: t("status.inRoom") }; break;
    case "checked_in": chip = { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: t("status.checkedIn") }; break;
    case "cancelled":  chip = { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: t("status.cancelled") }; break;
  }

  const when = new Date(appt.scheduled_at);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <DetailHeader backLabel={t("patient.appointments.appointments")} chip={chip} />

      <View style={styles.hero}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateMonth}>{when.toLocaleDateString([], { month: "short" }).toUpperCase()}</Text>
          <Text style={styles.dateDay}>{when.getDate()}</Text>
        </View>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{appt.doctor?.full_name ?? t("patient.prescriptions.yourDoctor")}</Text>
          <Text style={styles.heroSub}>{appt.doctor?.specialty ?? t("patient.appointments.specialty")}</Text>
          <View style={styles.metaRow}>
            <Clock size={13} color={theme.colors.muted} strokeWidth={2} />
            <Text style={styles.metaText}>
              {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {appt.duration_minutes ? ` · ${appt.duration_minutes} min` : ""}
            </Text>
          </View>
          {appt.room ? (
            <View style={styles.metaRow}>
              <MapPin size={13} color={theme.colors.muted} strokeWidth={2} />
              <Text style={styles.metaText}>{t("patient.appointments.room")} {appt.room}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {appt.reason ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("patient.appointments.reason")}</Text>
          <DetailCard variant="accent">
            <Text style={styles.reasonText}>{appt.reason}</Text>
          </DetailCard>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("patient.appointments.whatToBring")}</Text>
        <DetailCard>
          <View style={styles.bringRow}>
            <CalendarCheck size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.bringText}>{t("patient.appointments.bringId")}</Text>
          </View>
          <View style={styles.bringRow}>
            <Stethoscope size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.bringText}>{t("patient.appointments.listMedications")}</Text>
          </View>
        </DetailCard>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 900, width: "100%", alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: theme.spacing.md, padding: theme.spacing.xxl },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.danger },
  hero: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg },
  dateBadge: { width: 68, height: 68, borderRadius: theme.radius.sm, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  dateMonth: { fontFamily: theme.fontFamily.bodyBold, fontSize: 11, letterSpacing: 1, color: theme.colors.accent },
  dateDay: { fontFamily: theme.fontFamily.heading, fontSize: 26, color: theme.colors.textInverse, letterSpacing: -0.5 },
  heroContent: { flex: 1, gap: 3 },
  heroTitle: { fontFamily: theme.fontFamily.heading, fontSize: 22, color: theme.colors.text, letterSpacing: -0.4 },
  heroSub: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  metaText: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted },
  section: { gap: theme.spacing.md },
  sectionTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  reasonText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  bringRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  bringText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.text },
});
