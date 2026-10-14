/**
 * Lab: All orders list — trilingual.
 */

import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { useLabOrders } from "@/lib/admin";
import { theme } from "@/constants/theme";


export default function LabOrdersList() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: labs, isLoading, isError, refetch } = useLabOrders({ limit: 200 });
  const [filter, setFilter] = useState("all");

  const FILTERS = [
    { key: "all",         label: t("superAdmin.all") },
    { key: "pending",     label: t("status.pending") },
    { key: "in_progress", label: t("status.inProgress") },
    { key: "completed",   label: t("status.ready") },
    { key: "cancelled",   label: t("status.cancelled") },
  ];

  const filtered = useMemo(() => {
    const list = labs ?? [];
    if (filter === "all") return list;
    return list.filter((o) => o.status === filter);
  }, [labs, filter]);

  const statusChip = (s: string) => {
    switch (s) {
      case "completed":   return { bg: theme.colors.successBg, fg: theme.colors.success, label: t("status.ready") };
      case "in_progress": return { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: t("status.inProgress") };
      case "cancelled":   return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: t("status.cancelled") };
      default:            return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: t("status.pending") };
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>{t("lab.roleName")}</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.title}>{t("lab.allOrders")}</Text>
        </View>
        <Text style={styles.count}>{filtered.length}</Text>
      </View>

      <View style={styles.pillRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.pill, filter === f.key && styles.pillActive]}
          >
            <Text style={[styles.pillText, filter === f.key && styles.pillTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="small" color={theme.colors.primary} /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{t("common.error")}</Text>
          <Button label={t("common.retry")} variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <FlaskConical size={32} color={theme.colors.muted} strokeWidth={1.6} />
          <Text style={styles.mutedText}>{t("lab.noPendingOrders")}</Text>
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
                  styles.row, idx < filtered.length - 1 && styles.rowBorder, hovered && styles.rowHover,
                ]}
              >
                <View style={[styles.iconCol, { backgroundColor: c.bg }]}>
                  <FlaskConical size={16} color={c.fg} strokeWidth={2.2} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.testName}>{o.test_name}</Text>
                  <Text style={styles.date}>
                    {t("doctor.ordered")} {new Date(o.ordered_at).toLocaleDateString([], { month: "short", day: "numeric" })}
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
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  count: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
  pill: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.radius.full, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, cursor: "pointer" as any },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.text },
  pillTextActive: { color: theme.colors.textInverse },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, cursor: "pointer" as any },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowHover: { backgroundColor: "rgba(42,42,114,0.02)" },
  iconCol: { width: 36, height: 36, borderRadius: theme.radius.sm, alignItems: "center", justifyContent: "center" },
  rowContent: { flex: 1, minWidth: 0 },
  testName: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14.5, color: theme.colors.text },
  date: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 3 },
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
});
