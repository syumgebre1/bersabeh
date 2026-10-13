/**
 * TopBar — global actions strip above the dashboard body.
 *
 * Right side: language switcher · notification bell · logout.
 * Left side: current section title (placeholder; will become dynamic).
 */

import { useRouter } from "expo-router";
import { Bell, LogOut, Search } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { theme } from "@/constants/theme";
import { useLogout } from "@/lib/auth";
import { useAppStore } from "@/store/app";


export function TopBar() {
  const { t } = useTranslation();
  const router = useRouter();
  const logout = useLogout();
  const user = useAppStore((s) => s.user);

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.replace("/(public)/" as any);
  };

  return (
    <View style={styles.bar}>
      {/* Left: search */}
      <View style={styles.searchWrap}>
        <Search size={14} color={theme.colors.muted} strokeWidth={2.2} />
        <TextInput
          placeholder="Search patients, appointments, …"
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.searchInput}
        />
      </View>

      {/* Right: language · notifications · logout */}
      <View style={styles.actions}>
        <LanguageSwitcher compact />

        <Pressable style={styles.iconBtn} accessibilityLabel={t("header.notifications", "Notifications")}>
          <Bell size={16} color={theme.colors.text} strokeWidth={2} />
          {/* Placeholder unread dot — will be replaced with real WS badge */}
          <View style={styles.dot} />
        </Pressable>

        <View style={styles.userChip}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.full_name ?? "—"}
          </Text>
        </View>

        <Pressable
          style={styles.iconBtn}
          onPress={handleLogout}
          accessibilityLabel="Log out"
        >
          <LogOut size={16} color={theme.colors.text} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  bar: {
    height: theme.layout.headerHeight,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  searchWrap: {
    flex: 1,
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    color: theme.colors.text,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: theme.radius.sm,
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  dot: {
    position: "absolute",
    top: 8, right: 8,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: theme.colors.secondary,
  },
  userChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.bg,
  },
  userName: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    color: theme.colors.text,
    maxWidth: 140,
  },
});
