/**
 * Auth group layout.
 *
 * Contains: /login, /register
 * These screens render as a centered column with a warm background.
 */

import { Stack } from "expo-router";

import { theme } from "@/constants/theme";


export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.bg,
          alignItems: "center",
        },
        animation: "fade",
      }}
    />
  );
}
