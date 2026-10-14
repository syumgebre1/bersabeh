/**
 * Nurse: Handover notes — trilingual.
 */

import { ArrowLeft, ClipboardCheck, MessageSquare } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { theme } from "@/constants/theme";


const NOTES = [
  {
    time: "10:15",
    patient: "Hana Bekele",
    room: "205",
    note: "BP spike — 152/94. Notified doctor.",
    severity: "critical",
  },
  {
    time: "11:00",
    patient: "Sara Haile",
    room: "202",
    note: "Post-op check. Wound clean, no signs of infection.",
    severity: "stable",
  },
  {
    time: "13:45",
    patient: "Yohannes Getu",
    room: "204",
    note: "Requested additional pain medication.",
    severity: "attention",
  },
];


export default function NurseHandover() {
  const { t } = useTranslation();
  const router = useRouter();

  const sevChip = (sev: string) => {
    switch (sev) {
      case "critical":  return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: t("nurse.critical") };
      case "attention": return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: t("nurse.attention") };
      default:          return { bg: theme.colors.successBg, fg: theme.colors.success, label: t("nurse.stable") };
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
        </View>
        <Pressable
          onPress={() => router.push("/(app)/nurse/messages" as any)}
          style={({ hovered }: any) => [styles.notifyBtn, hovered && styles.notifyHover]}
        >
          <MessageSquare size={13} color={theme.colors.primary} strokeWidth={2.2} />
          <Text style={styles.notifyText}>{t("nurse.notifyDoctor")}</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {NOTES.map((n, idx) => {
          const c = sevChip(n.severity);
          return (
            <View
              key={idx}
              style={[styles.card, idx < NOTES.length - 1 && styles.cardBorder]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.timeWrap}>
                  <ClipboardCheck size={14} color={theme.colors.primary} strokeWidth={2.2} />
                  <Text style={styles.timeText}>{n.time}</Text>
                </View>
                <Text style={styles.patientText}>
                  {n.patient} · {t("patient.appointments.room")} {n.room}
                </Text>
                <View style={[styles.chip, { backgroundColor: c.bg }]}>
                  <Text style={[styles.chipText, { color: c.fg }]}>{c.label}</Text>
                </View>
              </View>
              <Text style={styles.noteText}>{n.note}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 900, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  notifyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, cursor: "pointer" as any },
  notifyHover: { borderColor: theme.colors.primary },
  notifyText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.primary },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  card: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  cardBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, flexWrap: "wrap" },
  timeWrap: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs },
  timeText: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, color: theme.colors.text, letterSpacing: -0.1 },
  patientText: { flex: 1, fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted },
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
  noteText: { fontFamily: theme.fontFamily.body, fontSize: 14, lineHeight: 20, color: theme.colors.text },
});
