/**
 * Super-admin: list of admin + super-admin accounts, with "Create admin" modal.
 */

import { ArrowLeft, Shield, UserPlus, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { useStaffList, useCreateAdmin } from "@/lib/admin";
import type { SessionUser } from "@/store/app";
import { theme } from "@/constants/theme";


function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


export default function AdminsScreen() {
  const router = useRouter();
  const { data: users, isLoading, isError, refetch } = useStaffList();
  const createAdmin = useCreateAdmin();

  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const admins = (users ?? []).filter(
    (u: SessionUser) => u.role === "admin" || u.role === "super_admin",
  );

  const handleCreate = async () => {
    setErrorMessage(null);
    try {
      await createAdmin.mutateAsync({ email, full_name: fullName, password, role });
      setShowCreate(false);
      setEmail(""); setFullName(""); setPassword(""); setRole("admin");
      await refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not create admin");
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>System</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>System operations</Text>
          <Text style={styles.title}>Administrators</Text>
        </View>
        <Button
          label="Create admin"
          variant="primary"
          size="sm"
          leftIcon={<UserPlus size={14} color={theme.colors.textInverse} strokeWidth={2.2} />}
          onPress={() => setShowCreate(true)}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.mutedText}>Loading administrators...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load administrators.</Text>
          <Button label="Retry" variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : (
        <View style={styles.list}>
          {admins.map((u: SessionUser) => (
            <View key={u.id} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsOf(u.full_name)}</Text>
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.name}>{u.full_name}</Text>
                <Text style={styles.meta}>{u.email}</Text>
              </View>
              <View style={[
                styles.rolePill,
                u.role === "super_admin" ? styles.roleSuper : styles.roleAdmin,
              ]}>
                <Shield size={12} color={theme.colors.textInverse} strokeWidth={2.4} />
                <Text style={styles.rolePillText}>
                  {u.role === "super_admin" ? "Super Admin" : "Admin"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Create admin modal */}
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create administrator</Text>
              <Pressable onPress={() => setShowCreate(false)} style={styles.modalClose}>
                <X size={16} color={theme.colors.muted} strokeWidth={2.2} />
              </Pressable>
            </View>

            {errorMessage ? (
              <View style={styles.errorBanner}><Text style={styles.errorText}>{errorMessage}</Text></View>
            ) : null}

            <Text style={styles.label}>Full name</Text>
            <TextInput value={fullName} onChangeText={setFullName}
              placeholder="Rahel Kidane" placeholderTextColor={theme.colors.mutedLight}
              style={styles.input} />

            <Text style={styles.label}>Email</Text>
            <TextInput value={email} onChangeText={setEmail}
              placeholder="rahel@bersabehclinic.com" autoCapitalize="none"
              keyboardType="email-address" placeholderTextColor={theme.colors.mutedLight}
              style={styles.input} />

            <Text style={styles.label}>Temporary password</Text>
            <TextInput value={password} onChangeText={setPassword}
              placeholder="At least 8 characters" secureTextEntry
              placeholderTextColor={theme.colors.mutedLight} style={styles.input} />

            <Text style={styles.label}>Role</Text>
            <View style={styles.roleRow}>
              <Pressable
                onPress={() => setRole("admin")}
                style={[styles.roleChoice, role === "admin" && styles.roleChoiceActive]}
              >
                <Text style={[styles.roleChoiceText, role === "admin" && styles.roleChoiceTextActive]}>Admin</Text>
              </Pressable>
              <Pressable
                onPress={() => setRole("super_admin")}
                style={[styles.roleChoice, role === "super_admin" && styles.roleChoiceActive]}
              >
                <Text style={[styles.roleChoiceText, role === "super_admin" && styles.roleChoiceTextActive]}>Super Admin</Text>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Button label="Cancel" variant="ghost" size="md" onPress={() => setShowCreate(false)} />
              <Button label="Create" variant="primary" size="md"
                disabled={!email || !fullName || password.length < 8 || createAdmin.isPending}
                loading={createAdmin.isPending} onPress={handleCreate} />
            </View>
          </View>
        </View>
      </Modal>
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
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primaryDark, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: theme.colors.textInverse, letterSpacing: 0.3 },
  rowContent: { flex: 1, minWidth: 0 },
  name: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 15, color: theme.colors.text },
  meta: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 2 },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: theme.spacing.md, paddingVertical: 4, borderRadius: theme.radius.full },
  roleAdmin: { backgroundColor: theme.colors.primary },
  roleSuper: { backgroundColor: theme.colors.secondary },
  rolePillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, color: theme.colors.textInverse, letterSpacing: 0.2 },
  errorBanner: { backgroundColor: theme.colors.dangerBg, padding: theme.spacing.md, borderRadius: theme.radius.md },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted, marginTop: theme.spacing.sm },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.bg },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(20,20,31,0.5)", alignItems: "center", justifyContent: "center", padding: theme.spacing.lg },
  modalCard: { width: "100%", maxWidth: 480, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.xl, gap: theme.spacing.sm },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  modalTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 16, color: theme.colors.text, flex: 1 },
  modalClose: { padding: theme.spacing.xs },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  roleRow: { flexDirection: "row", gap: theme.spacing.sm },
  roleChoice: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: "center", backgroundColor: theme.colors.bg },
  roleChoiceActive: { borderColor: theme.colors.primary, backgroundColor: "rgba(42,42,114,0.05)" },
  roleChoiceText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.muted },
  roleChoiceTextActive: { color: theme.colors.primary, fontFamily: theme.fontFamily.bodyBold },
});
