/**
 * Lab: All lab orders (list view for the "Results" nav item).
 */

import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { useLabOrders } from "@/lib/admin";
import { theme } from "@/constants/theme";


const FILTERS = ["all", "pending", "in_progress", "completed", "cancelled"];


function statusChip(s: string) {
  switch (s) {
    case "completed":   return { bg: theme.colors.successBg, fg: theme.colors.success, label: "Ready" };
    case "in_progress": return { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: "In progress" };
    case "cancelled":   return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: "Cancelled" };
    default:            return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: "Pending" };
  }
}


export default function LabOrdersList() {
  const router = useRouter();
  const { data: labs, isLoading, isError, refetch } = useLabOrders({ limit: 200 });
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    const list = labs ?? [];
    if (filter === "all") return list;
    return list.filter((o) => o.status === filter);
  }, [labs, filter]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>Lab</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>Laboratory</Text>
          <Text style={styles.title}>All orders</Text>
        </View>
        <Text style={styles.count}>{filtered.length} orders</Text>
      </View>

      {/* Filters */}
      <View style={styles.pillRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.pill, filter === f && styles.pillActive]}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
              {f.replace("_", " ")}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.mutedText}>Loading...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load orders.</Text>
          <Button label="Retry" variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <FlaskConical size={32} color={theme.colors.muted} strokeWidth={1.6} />
          <Text style={styles.mutedText}>No orders match this filter.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((o, idx) => {
            const c = statusChip(o.status);
            return (
              <Pressable
                key={o.id}
                onPress={() => router.push(`/(app)/lab/orders/${o.id}` as any)}
                style={({ hovered }: any) => [
                  styles.row,
                  idx < filtered.length - 1 && styles.rowBorder,
                  hovered && styles.rowHover,
                ]}
              >
                <View style={[styles.iconCol, { backgroundColor: c.bg }]}>
                  <FlaskConical size={16} color={c.fg} strokeWidth={2.2} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.testName}>{o.test_name}</Text>
                  <Text style={styles.date}>
                    Ordered {new Date(o.ordered_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                    {o.result?.value_numeric != null ? ` · ${o.result.value_numeric} ${o.result.units ?? ""}` : ""}
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
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
  pill: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.radius.full, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.text, textTransform: "capitalize" },
  pillTextActive: { color: theme.colors.textInverse },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowHover: { backgroundColor: "rgba(42,42,114,0.02)" },
  iconCol: { width: 36, height: 36, borderRadius: theme.radius.sm, alignItems: "center", justifyContent: "center" },
  rowContent: { flex: 1, minWidth: 0 },
  testName: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14.5, color: theme.colors.text },
  date: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 3 },
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
});
