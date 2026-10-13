/**
 * Doctor: Patient queue — today's appointments, filterable by status.
 */

import { ArrowLeft, Users } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { useAppointments } from "@/lib/admin";
import { theme } from "@/constants/theme";


const STATUS_FILTERS = ["all", "scheduled", "checked_in", "in_room", "completed"];


function statusChip(s: string) {
  switch (s) {
    case "completed":  return { bg: theme.colors.successBg, fg: theme.colors.success, label: "Done" };
    case "in_room":    return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: "In room" };
    case "checked_in": return { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: "Checked in" };
    case "scheduled":  return { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: "Scheduled" };
    case "cancelled":  return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: "Cancelled" };
    default:           return { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: s };
  }
}


export default function DoctorQueue() {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const { data: appts, isLoading, isError, refetch } = useAppointments({ limit: 200 });

  const filtered = useMemo(() => {
    const list = appts ?? [];
    if (filter === "all") return list;
    return list.filter((a) => a.status === filter);
  }, [appts, filter]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>Doctor</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>Clinical</Text>
          <Text style={styles.title}>Patient queue</Text>
        </View>
        <Text style={styles.count}>{filtered.length} appointments</Text>
      </View>

      {/* Filters */}
      <View style={styles.pillRow}>
        {STATUS_FILTERS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setFilter(s)}
            style={[styles.pill, filter === s && styles.pillActive]}
          >
            <Text style={[styles.pillText, filter === s && styles.pillTextActive]}>
              {s === "all" ? "All" : s.replace("_", " ")}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.mutedText}>Loading appointments...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load queue.</Text>
          <Button label="Retry" variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Users size={32} color={theme.colors.muted} strokeWidth={1.6} />
          <Text style={styles.mutedText}>No appointments in this filter.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((a, idx) => {
            const c = statusChip(a.status);
            return (
              <View
                key={a.id}
                style={[styles.row, idx < filtered.length - 1 && styles.rowBorder]}
              >
                <View style={styles.timeCol}>
                  <Text style={styles.time}>
                    {new Date(a.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  <Text style={styles.date}>
                    {new Date(a.scheduled_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </Text>
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.patient}>
                    {a.patient?.full_name ?? "—"}
                  </Text>
                  <Text style={styles.reason}>{a.reason ?? "General visit"}</Text>
                  {a.room ? <Text style={styles.room}>Room {a.room}</Text> : null}
                </View>
                <View style={[styles.chip, { backgroundColor: c.bg }]}>
                  <Text style={[styles.chipText, { color: c.fg }]}>{c.label}</Text>
                </View>
              </View>
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
  timeCol: { width: 60, alignItems: "flex-start" },
  time: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14, color: theme.colors.text, letterSpacing: -0.1 },
  date: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.muted, marginTop: 2 },
  rowContent: { flex: 1, minWidth: 0 },
  patient: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14.5, color: theme.colors.text },
  reason: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2 },
  room: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.primary, marginTop: 2 },
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
});
