/**
 * Authenticated app shell.
 *
 * Provides:
 *   - Auth guard: no token → redirect to /login
 *   - Role guard: user must have a role that matches the current route
 *   - Sidebar (left) + TopBar (top) + Stack for the actual screens
 *
 * Every dashboard (patient, doctor, nurse, ...) renders inside this shell.
 */

import { Redirect, Stack, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Sidebar } from "@/components/app/Sidebar";
import { TopBar } from "@/components/app/TopBar";
import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app";


export default function AppLayout() {
  const accessToken = useAppStore((s) => s.accessToken);
  const hydrated = useAppStore((s) => s.hydrated);
  const user = useAppStore((s) => s.user);
  const pathname = usePathname();

  // Wait until Zustand has read AsyncStorage before deciding.
  if (!hydrated) {
    return <View style={styles.boot} />;
  }

  // No token → send to login
  if (!accessToken || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Role guard — allow super_admin into admin routes, etc.
  const route = pathname.split("/")[1] ?? "";
  const role = user.role;
  const isAdminAlias =
    (route === "admin" && (role === "admin" || role === "super_admin")) ||
    (route === "super-admin" && role === "super_admin");

  if (route && route !== role && !isAdminAlias) {
    // Redirect to their own dashboard
    const target = role === "super_admin" ? "super-admin" : role;
    return <Redirect href={`/(app)/${target}` as any} />;
  }

  return (
    <View style={styles.root}>
      <Sidebar />
      <View style={styles.main}>
        <TopBar />
        <View style={styles.body}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.bg },
              animation: "fade",
            }}
          />
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: theme.colors.bg,
  },
  main: {
    flex: 1,
    flexDirection: "column",
  },
  body: {
    flex: 1,
  },
  boot: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
});
