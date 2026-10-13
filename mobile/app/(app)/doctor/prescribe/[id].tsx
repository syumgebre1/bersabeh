/**
 * Doctor: Prescription detail — refactored to use shared components.
 */

import { Pill } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { DetailCard, DetailHeader, DownloadButton } from "@/components/app";
import { apiFetch } from "@/lib/api";
import { theme } from "@/constants/theme";


interface PrescriptionDetail {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
  patient: { full_name: string; phone: string | null } | null;
  doctor: { full_name: string; specialty: string | null } | null;
  items: Array<{
    medication_name: string;
    dose: string;
    frequency: string;
    duration_days: number | null;
    instructions: string | null;
  }>;
}


function statusChip(s: string) {
  switch (s) {
    case "active":    return { bg: theme.colors.successBg, fg: theme.colors.success, label: "Active" };
    case "completed": return { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: "Completed" };
    case "cancelled": return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: "Cancelled" };
    default:          return { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: s };
  }
}


export default function PrescriptionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: rx, isLoading, isError, refetch } = useQuery({
    queryKey: ["prescription", id],
    queryFn: () => apiFetch<PrescriptionDetail>(`/api/v1/prescriptions/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !rx) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load prescription.</Text>
        <Button label="Retry" variant="outline" size="sm" onPress={() => refetch()} />
      </View>
    );
  }

  const chip = statusChip(rx.status);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <DetailHeader backLabel="Prescriptions" chip={chip} />

      <DetailCard>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Pill size={22} color={theme.colors.textInverse} strokeWidth={2.2} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.patientName}>{rx.patient?.full_name ?? "—"}</Text>
            <Text style={styles.patientMeta}>
              {rx.patient?.phone ?? "no phone"} ·{" "}
              Prescribed {new Date(rx.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </Text>
          </View>
        </View>
      </DetailCard>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medications</Text>
        <View style={styles.medsCard}>
          {rx.items.map((item, idx) => (
            <View
              key={idx}
              style={[styles.medRow, idx < rx.items.length - 1 && styles.medRowBorder]}
            >
              <View style={styles.medIcon}>
                <Pill size={14} color={theme.colors.secondary} strokeWidth={2.4} />
              </View>
              <View style={styles.medContent}>
                <Text style={styles.medName}>
                  {item.medication_name} <Text style={styles.medDose}>{item.dose}</Text>
                </Text>
                <Text style={styles.medMeta}>
                  {item.frequency}
                  {item.duration_days ? ` · ${item.duration_days} days` : ""}
                </Text>
                {item.instructions ? (
                  <Text style={styles.medInstructions}>💡 {item.instructions}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>

      {rx.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Doctor's notes</Text>
          <DetailCard variant="accent">
            <Text style={styles.notesText}>{rx.notes}</Text>
          </DetailCard>
        </View>
      ) : null}

      {rx.follow_up_date ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow-up</Text>
          <DetailCard variant="dark" style={styles.followUpCard}>
            <Text style={styles.followUpDate}>{rx.follow_up_date}</Text>
          </DetailCard>
        </View>
      ) : null}

      <View style={styles.actions}>
        <DownloadButton
          path={`/api/v1/prescriptions/${id}/pdf`}
          filename={`prescription-${id}.pdf`}
        />
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 900, width: "100%", alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: theme.spacing.md, padding: theme.spacing.xxl },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.danger },
  headerRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  headerIcon: { width: 48, height: 48, borderRadius: theme.radius.sm, backgroundColor: theme.colors.secondary, alignItems: "center", justifyContent: "center" },
  headerContent: { flex: 1 },
  patientName: { fontFamily: theme.fontFamily.heading, fontSize: 22, color: theme.colors.text, letterSpacing: -0.4 },
  patientMeta: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted, marginTop: 4 },
  section: { gap: theme.spacing.md },
  sectionTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  medsCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  medRow: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  medRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  medIcon: { width: 32, height: 32, borderRadius: theme.radius.sm, backgroundColor: "rgba(199,91,57,0.08)", alignItems: "center", justifyContent: "center", marginTop: 2 },
  medContent: { flex: 1 },
  medName: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: theme.colors.text },
  medDose: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 15, color: theme.colors.muted },
  medMeta: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted, marginTop: 3 },
  medInstructions: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.primary, marginTop: 6, fontStyle: "italic" },
  notesText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  followUpCard: { alignItems: "center" },
  followUpDate: { fontFamily: theme.fontFamily.heading, fontSize: 24, color: theme.colors.textInverse, letterSpacing: -0.5 },
  actions: { flexDirection: "row", gap: theme.spacing.md, marginTop: theme.spacing.md },
});
