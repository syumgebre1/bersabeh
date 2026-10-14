/**
 * Nurse: Medications schedule — trilingual.
 */

import { ArrowLeft, ClipboardCheck, Pill } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { theme } from "@/constants/theme";


const MEDS = [
  { time: "12:00", patient: "Hana Bekele",   med: "Amoxicillin 500mg",  done: false },
  { time: "12:30", patient: "Meron Tadesse", med: "Omeprazole 20mg",    done: false },
  { time: "13:00", patient: "Yohannes Getu", med: "Paracetamol 1g",     done: true },
  { time: "14:00", patient: "Abebe Kebede",  med: "Ibuprofen 400mg",    done: false },
  { time: "16:00", patient: "Sara Haile",    med: "Metformin 500mg",    done: false },
];


export default function NurseMedications() {
  const { t } = useTranslation();
  const router = useRouter();

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
      </View>

      <View style={styles.list}>
        {MEDS.map((m, idx) => (
          <Pressable
            key={idx}
            style={({ hovered }: any) => [
              styles.row,
              idx < MEDS.length - 1 && styles.rowBorder,
              m.done && styles.rowDone,
              hovered && styles.rowHover,
            ]}
          >
            <View style={[styles.check, m.done && styles.checkDone]}>
              {m.done && <ClipboardCheck size={12} color={theme.colors.textInverse} strokeWidth={2.6} />}
            </View>
            <View style={styles.timeCol}>
              <Text style={styles.timeText}>{m.time}</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.medName, m.done && styles.strikeText]}>{m.med}</Text>
              <Text style={styles.patient}>{m.patient}</Text>
            </View>
            <View style={styles.iconCol}>
              <Pill size={14} color={theme.colors.secondary} strokeWidth={2.4} />
            </View>
          </Pressable>
        ))}
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
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, cursor: "pointer" as any },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowDone: { opacity: 0.55 },
  rowHover: { backgroundColor: "rgba(42,42,114,0.02)" },
  check: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: theme.colors.borderStrong, alignItems: "center", justifyContent: "center" },
  checkDone: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  timeCol: { width: 52 },
  timeText: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, color: theme.colors.text, letterSpacing: -0.1 },
  rowContent: { flex: 1, minWidth: 0 },
  medName: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14.5, color: theme.colors.text },
  patient: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2 },
  strikeText: { textDecorationLine: "line-through" },
  iconCol: { width: 32, height: 32, borderRadius: theme.radius.sm, backgroundColor: "rgba(199,91,57,0.08)", alignItems: "center", justifyContent: "center" },
});
