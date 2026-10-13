/**
 * Public group layout.
 *
 * Contains everything reachable without logging in:
 *   - landing page
 *   - auth screens (login, register) — added in M11
 *   - legal pages — added later
 *
 * A plain <Stack> with headers disabled; pages provide their own chrome.
 */

import { Stack } from "expo-router";

import { theme } from "@/constants/theme";


export default function PublicLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
        animation: "fade",
      }}
    />
  );
}
