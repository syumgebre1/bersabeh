/**
 * Lab dashboard — pending orders + completed results.
 * Rows are clickable → open /lab/orders/{id}.
 */

import { ArrowRight, FlaskConical } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { useLabOrders } from "@/lib/admin";
import { theme } from "@/constants/theme";


function statusChip(s: string) {
  switch (s) {
    case "completed":   return { bg: theme.colors.successBg, fg: theme.colors.success, label: "Ready" };
    case "in_progress": return { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: "In progress" };
    case "cancelled":   return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: "Cancelled" };
    default:            return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: "Pending" };
  }
}


function priorityColor(p: string) {
  switch (p) {
    case "stat":   return theme.colors.danger;
    case "urgent": return theme.colors.warning;
    default:       return theme.colors.muted;
  }
}


export default function LabDashboard() {
  const router = useRouter();
  const { data: labs, isLoading, isError, refetch } = useLabOrders({ limit: 100 });

  const pending = (labs ?? []).filter((o) => o.status === "pending" || o.status === "in_progress");
  const ready   = (labs ?? []).filter((o) => o.status === "completed");

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Laboratory</Text>
        <Text style={styles.title}>Lab dashboard</Text>
        <Text style={styles.subtitle}>
          {pending.length} pending · {ready.length} ready
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.mutedText}>Loading orders...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load orders.</Text>
          <Button label="Retry" variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : (
        <>
          {/* Pending */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending orders</Text>
            {pending.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.mutedText}>No pending orders. All caught up.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {pending.map((o, idx) => {
                  const c = statusChip(o.status);
                  const pc = priorityColor(o.priority);
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => router.push(`/(app)/lab/orders/${o.id}` as any)}
                      style={({ hovered }: any) => [
                        styles.row,
                        idx < pending.length - 1 && styles.rowBorder,
                        hovered && styles.rowHover,
                      ]}
                    >
                      <View style={[styles.iconCol, { backgroundColor: c.bg }]}>
                        <FlaskConical size={16} color={c.fg} strokeWidth={2.2} />
                      </View>
                      <View style={styles.rowContent}>
                        <View style={styles.titleRow}>
                          <Text style={styles.testName}>{o.test_name}</Text>
                          <View style={[styles.priorityDot, { backgroundColor: pc }]} />
                          <Text style={[styles.priorityText, { color: pc }]}>
                            {o.priority.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.date}>
                          Ordered {new Date(o.ordered_at).toLocaleDateString([], { month: "short", day: "numeric" })}
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
          </View>

          {/* Ready */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed results</Text>
            {ready.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.mutedText}>No completed results yet.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {ready.map((o, idx) => {
                  const c = statusChip(o.status);
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => router.push(`/(app)/lab/orders/${o.id}` as any)}
                      style={({ hovered }: any) => [
                        styles.row,
                        idx < ready.length - 1 && styles.rowBorder,
                        hovered && styles.rowHover,
                      ]}
                    >
                      <View style={[styles.iconCol, { backgroundColor: c.bg }]}>
                        <FlaskConical size={16} color={c.fg} strokeWidth={2.2} />
                      </View>
                      <View style={styles.rowContent}>
                        <Text style={styles.testName}>{o.test_name}</Text>
                        <Text style={styles.date}>
                          {o.result?.value_numeric ?? o.result?.value_text ?? "—"} {o.result?.units ?? ""}
                        </Text>
                      </View>
                      <View style={[styles.chip, { backgroundColor: c.bg }]}>
                        <Text style={[styles.chipText, { color: c.fg }]}>Ready</Text>
                      </View>
                      <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 1100, width: "100%", alignSelf: "center" },
  header: { gap: 4 },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 32, letterSpacing: -0.6, color: theme.colors.text },
  subtitle: { fontFamily: theme.fontFamily.body, fontSize: 15, color: theme.colors.muted, marginTop: 4 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  section: { gap: theme.spacing.md },
  sectionTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  emptyCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg, alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowHover: { backgroundColor: "rgba(42,42,114,0.02)" },
  iconCol: { width: 36, height: 36, borderRadius: theme.radius.sm, alignItems: "center", justifyContent: "center" },
  rowContent: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  testName: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14.5, color: theme.colors.text },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 10.5, letterSpacing: 0.5 },
  date: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 3 },
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
});
