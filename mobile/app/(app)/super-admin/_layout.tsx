/**
 * Super-admin nested layout.
 */

import { Stack } from "expo-router";
import { theme } from "@/constants/theme";


export default function SuperAdminLayout() {
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
