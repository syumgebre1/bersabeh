/**
 * CMS nested layout — a thin Stack for the content editor subscreens.
 */

import { Stack } from "expo-router";

import { theme } from "@/constants/theme";


export default function ContentLayout() {
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
