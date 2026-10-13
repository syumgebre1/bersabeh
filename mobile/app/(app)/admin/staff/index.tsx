/**
 * Staff list — non-patient users with role badges.
 */

import { ArrowLeft, Mail, Phone, Plus, UserPlus } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { useStaffList } from "@/lib/admin";
import type { SessionUser } from "@/store/app";
import { theme } from "@/constants/theme";


const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  reception: "Reception",
  lab: "Lab",
};

const ROLE_COLORS: Record<string, { bg: string; fg: string }> = {
  super_admin: { bg: theme.colors.primaryDark, fg: theme.colors.textInverse },
  admin:       { bg: theme.colors.primary,     fg: theme.colors.textInverse },
  doctor:      { bg: theme.colors.secondary,   fg: theme.colors.textInverse },
  nurse:       { bg: theme.colors.success,     fg: theme.colors.textInverse },
  reception:   { bg: theme.colors.accentDark,  fg: theme.colors.text },
  lab:         { bg: theme.colors.info,        fg: theme.colors.textInverse },
};


function initialsOf(name: string): string {
  const parts = name.replace(/^Dr\.?\s+/i, "").trim().split(/\s+/);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


export default function StaffListScreen() {
  const router = useRouter();
  const { data: users, isLoading, isError, refetch } = useStaffList();
  const [search, setSearch] = useState("");

  const staff = useMemo(() => {
    if (!users) return [];
    return users
      .filter((u: SessionUser) => u.role !== "patient")
      .filter((u: SessionUser) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        );
      });
  }, [users, search]);

  const grouped = useMemo(() => {
    const map: Record<string, SessionUser[]> = {};
    for (const u of staff) {
      if (!map[u.role]) map[u.role] = [];
      map[u.role].push(u);
    }
    return map;
  }, [staff]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>Admin</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>Staff management</Text>
          <Text style={styles.title}>Team</Text>
        </View>
        <View style={styles.topBarActions}>
          <Button
            label="Add staff"
            variant="primary"
            size="sm"
            leftIcon={<UserPlus size={14} color={theme.colors.textInverse} strokeWidth={2.2} />}
            onPress={() => router.push("/(app)/admin/staff/new" as any)}
          />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email..."
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.searchInput}
        />
        <Text style={styles.count}>
          {staff.length} {staff.length === 1 ? "member" : "members"}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.mutedText}>Loading staff...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load staff.</Text>
          <Button label="Retry" variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : staff.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>No staff match "{search}".</Text>
        </View>
      ) : (
        Object.entries(grouped).map(([role, list]) => (
          <View key={role} style={styles.group}>
            <Text style={styles.groupTitle}>{ROLE_LABELS[role] ?? role}</Text>
            <View style={styles.list}>
              {list.map((u: SessionUser) => {
                const c = ROLE_COLORS[u.role] ?? { bg: theme.colors.muted, fg: theme.colors.textInverse };
                return (
                  <Pressable
                    key={u.id}
                    style={({ hovered }: any) => [styles.row, hovered && styles.rowHover]}
                  >
                    <View style={[styles.avatar, { backgroundColor: c.bg }]}>
                      <Text style={[styles.avatarText, { color: c.fg }]}>{initialsOf(u.full_name)}</Text>
                    </View>

                    <View style={styles.rowContent}>
                      <Text style={styles.name}>{u.full_name}</Text>
                      <View style={styles.metaRow}>
                        <Mail size={12} color={theme.colors.muted} strokeWidth={2} />
                        <Text style={styles.metaText}>{u.email}</Text>
                        {u.phone ? (
                          <>
                            <Text style={styles.metaSep}>·</Text>
                            <Phone size={12} color={theme.colors.muted} strokeWidth={2} />
                            <Text style={styles.metaText}>{u.phone}</Text>
                          </>
                        ) : null}
                      </View>
                    </View>

                    <View style={[styles.rolePill, { backgroundColor: c.bg }]}>
                      <Text style={[styles.rolePillText, { color: c.fg }]}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 1000, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  searchRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  searchInput: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 2, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.surface },
  count: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  group: { gap: theme.spacing.sm },
  groupTitle: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowHover: { backgroundColor: "rgba(42,42,114,0.02)" },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13, letterSpacing: 0.3 },
  rowContent: { flex: 1, minWidth: 0 },
  name: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 15, color: theme.colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3, flexWrap: "wrap" },
  metaText: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted },
  metaSep: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.mutedLight, marginHorizontal: 2 },
  rolePill: { paddingHorizontal: theme.spacing.md, paddingVertical: 4, borderRadius: theme.radius.full },
  rolePillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.2 },
});
