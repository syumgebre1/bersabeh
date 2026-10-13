/**
 * Doctor: Prescriptions written by this doctor.
 */

import { ArrowLeft, ArrowRight, Pill } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { usePrescriptions } from "@/lib/admin";
import { theme } from "@/constants/theme";


function statusChip(s: string) {
  switch (s) {
    case "active":    return { bg: theme.colors.successBg, fg: theme.colors.success, label: "Active" };
    case "completed": return { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: "Completed" };
    case "cancelled": return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: "Cancelled" };
    default:          return { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: s };
  }
}


export default function DoctorPrescribe() {
  const router = useRouter();
  const { data: rxs, isLoading, isError, refetch } = usePrescriptions({ limit: 200 });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>Doctor</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>Clinical</Text>
          <Text style={styles.title}>Prescriptions</Text>
        </View>
        <Text style={styles.count}>{rxs?.length ?? 0} written</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.mutedText}>Loading prescriptions...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load prescriptions.</Text>
          <Button label="Retry" variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : !rxs || rxs.length === 0 ? (
        <View style={styles.center}>
          <Pill size={32} color={theme.colors.muted} strokeWidth={1.6} />
          <Text style={styles.mutedText}>No prescriptions yet.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {rxs.map((r, idx) => {
            const c = statusChip(r.status);
            const firstItem = r.items?.[0];
            return (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/(app)/doctor/prescribe/${r.id}` as any)}
                style={({ hovered }: any) => [
                  styles.row,
                  idx < rxs.length - 1 && styles.rowBorder,
                  hovered && styles.rowHover,
                ]}
              >
                <View style={styles.iconCol}>
                  <Pill size={18} color={theme.colors.secondary} strokeWidth={2.2} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.patient}>{r.patient?.full_name ?? "—"}</Text>
                  <Text style={styles.meds}>
                    {firstItem
                      ? `${firstItem.medication_name} ${firstItem.dose} · ${firstItem.frequency}`
                      : "—"}
                    {r.items && r.items.length > 1 ? ` +${r.items.length - 1} more` : ""}
                  </Text>
                  <Text style={styles.date}>
                    {new Date(r.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: c.bg }]}>
                  <Text style={[styles.chipText, { color: c.fg }]}>{c.label}</Text>
                </View>
                <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
              </Pressable>
            );
          })}
        </View>
      )}
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
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  rowHover: { backgroundColor: "rgba(42,42,114,0.02)" },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconCol: { width: 36, height: 36, borderRadius: theme.radius.sm, backgroundColor: "rgba(199,91,57,0.08)", alignItems: "center", justifyContent: "center" },
  rowContent: { flex: 1, minWidth: 0 },
  patient: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14.5, color: theme.colors.text },
  meds: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2 },
  date: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.mutedLight, marginTop: 3 },
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
});
