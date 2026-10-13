/**
 * Super-admin: audit log viewer with filters.
 * Every mutation in the platform lands here.
 */

import { ArrowLeft, Filter, Search } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { useAuditLogs } from "@/lib/admin";
import { theme } from "@/constants/theme";


const ACTION_OPTIONS = ["", "create", "update", "delete", "login", "logout"];
const ENTITY_OPTIONS = ["", "User", "Appointment", "Encounter", "Prescription", "Vital", "LabOrder", "LabResult", "Bill", "VideoCall", "Thread", "Message", "ContentBlock"];


function actionColor(action: string): { bg: string; fg: string } {
  switch (action) {
    case "create": return { bg: theme.colors.successBg, fg: theme.colors.success };
    case "update": return { bg: theme.colors.infoBg,    fg: theme.colors.info };
    case "delete": return { bg: theme.colors.dangerBg,  fg: theme.colors.danger };
    case "login":  return { bg: theme.colors.warningBg, fg: theme.colors.warning };
    default:       return { bg: theme.colors.bgSunken,  fg: theme.colors.muted };
  }
}


export default function AuditLogScreen() {
  const router = useRouter();
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [search, setSearch] = useState("");

  const { data: entries, isLoading, isError, refetch } = useAuditLogs({
    action: action || undefined,
    entity_type: entityType || undefined,
    limit: 200,
  });

  const filtered = (entries ?? []).filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.description.toLowerCase().includes(q) ||
      e.actor_email?.toLowerCase().includes(q) ||
      e.entity_type.toLowerCase().includes(q)
    );
  });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>System</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>System operations</Text>
          <Text style={styles.title}>Audit log</Text>
        </View>
        <Text style={styles.count}>{filtered.length} entries</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersCard}>
        <View style={styles.filterRow}>
          <View style={styles.filterLabelRow}>
            <Filter size={12} color={theme.colors.muted} strokeWidth={2.2} />
            <Text style={styles.filterLabel}>Action</Text>
          </View>
          <View style={styles.pillRow}>
            {ACTION_OPTIONS.map((a) => (
              <Pressable
                key={a || "all"}
                onPress={() => setAction(a)}
                style={[styles.pill, action === a && styles.pillActive]}
              >
                <Text style={[styles.pillText, action === a && styles.pillTextActive]}>
                  {a || "All"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterLabelRow}>
            <Filter size={12} color={theme.colors.muted} strokeWidth={2.2} />
            <Text style={styles.filterLabel}>Entity</Text>
          </View>
          <View style={styles.pillRow}>
            {ENTITY_OPTIONS.slice(0, 8).map((e) => (
              <Pressable
                key={e || "all"}
                onPress={() => setEntityType(e)}
                style={[styles.pill, entityType === e && styles.pillActive]}
              >
                <Text style={[styles.pillText, entityType === e && styles.pillTextActive]}>
                  {e || "All"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Search size={14} color={theme.colors.muted} strokeWidth={2.2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by description, actor, or entity..."
            placeholderTextColor={theme.colors.mutedLight}
            style={styles.searchInput}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.mutedText}>Loading audit log...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load audit log.</Text>
          <Button label="Retry" variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>No entries match your filters.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((e) => {
            const c = actionColor(e.action);
            return (
              <View key={e.id} style={styles.entry}>
                <View style={[styles.actionBadge, { backgroundColor: c.bg }]}>
                  <Text style={[styles.actionText, { color: c.fg }]}>
                    {e.action.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.entryContent}>
                  <Text style={styles.description}>{e.description}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaEntity}>{e.entity_type}</Text>
                    {e.actor_email ? (
                      <>
                        <Text style={styles.metaSep}>·</Text>
                        <Text style={styles.metaActor}>{e.actor_email}</Text>
                      </>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.timestamp}>
                  {new Date(e.created_at).toLocaleString([], {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </Text>
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
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 1200, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  count: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted },
  filtersCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg, gap: theme.spacing.md },
  filterRow: { gap: theme.spacing.sm },
  filterLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  filterLabel: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: theme.colors.muted },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
  pill: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.radius.full, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, color: theme.colors.text },
  pillTextActive: { color: theme.colors.textInverse },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: 8 },
  searchInput: { flex: 1, fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.text },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  entry: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  actionBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.sm, minWidth: 64, alignItems: "center" },
  actionText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 10.5, letterSpacing: 0.5 },
  entryContent: { flex: 1, minWidth: 0 },
  description: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13.5, color: theme.colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  metaEntity: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.primary, letterSpacing: 0.2 },
  metaSep: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.mutedLight },
  metaActor: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.muted },
  timestamp: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.mutedLight },
});
