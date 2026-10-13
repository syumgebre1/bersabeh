/**
 * DetailCard — surface card wrapper for sections on detail pages.
 *
 * Variants:
 *   plain   — surface bg + border (default)
 *   accent  — plain + left border in terracotta (for notes / quotes)
 *   success — success bg (for positive states)
 *   warning — warning bg (for pending states)
 *   dark    — indigo bg (for emphasis)
 *   info    — info bg
 */

import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { theme } from "@/constants/theme";


type Variant = "plain" | "accent" | "success" | "warning" | "danger" | "dark" | "info";


interface DetailCardProps {
  children: ReactNode;
  variant?: Variant;
  style?: ViewStyle;
}


function getStyle(variant: Variant): ViewStyle {
  switch (variant) {
    case "accent":
      return {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.secondary,
      };
    case "success":
      return { backgroundColor: theme.colors.successBg, borderColor: "transparent" };
    case "warning":
      return { backgroundColor: theme.colors.warningBg, borderColor: "transparent" };
    case "danger":
      return { backgroundColor: theme.colors.dangerBg, borderColor: "transparent" };
    case "info":
      return { backgroundColor: theme.colors.infoBg, borderColor: "transparent" };
    case "dark":
      return { backgroundColor: theme.colors.primaryDark, borderColor: "transparent" };
    default:
      return { backgroundColor: theme.colors.surface, borderColor: theme.colors.border };
  }
}


export function DetailCard({ children, variant = "plain", style }: DetailCardProps) {
  return <View style={[styles.base, getStyle(variant), style]}>{children}</View>;
}


const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.lg,
  },
});
