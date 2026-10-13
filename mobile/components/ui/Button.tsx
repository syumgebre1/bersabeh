/**
 * Button — the shared primary/secondary/ghost button.
 *
 * Variants:
 *   - primary   — filled indigo (main CTAs)
 *   - secondary — filled terracotta (alternate CTAs)
 *   - outline   — transparent with indigo border
 *   - ghost     — text-only (for subtle actions)
 *
 * Sizes:
 *   - sm   — compact, for headers
 *   - md   — default
 *   - lg   — hero CTAs
 *
 * Loading state: shows a spinner and disables the press.
 */

import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { forwardRef } from "react";

import { theme } from "@/constants/theme";


export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";


interface Props {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}


export const Button = forwardRef<View, Props>(function Button(
  {
    label,
    onPress,
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    style,
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      ref={ref}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && pressedStyles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "outline" || variant === "ghost" ? theme.colors.primary : theme.colors.textInverse}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
          <Text style={[styles.text, sizeTextStyles[size], textVariantStyles[variant]]}>
            {label}
          </Text>
          {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
});


const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  fullWidth: {
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  iconLeft: { marginRight: 2 },
  iconRight: { marginLeft: 2 },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: theme.fontFamily.bodyBold,
    letterSpacing: 0.2,
  },
});


const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: { paddingHorizontal: 12, paddingVertical: 8 },
  md: { paddingHorizontal: 18, paddingVertical: 12 },
  lg: { paddingHorizontal: 24, paddingVertical: 16 },
};

const sizeTextStyles = {
  sm: { fontSize: 13 },
  md: { fontSize: 15 },
  lg: { fontSize: 16 },
} as const;

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.secondary },
  outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: theme.colors.primary },
  ghost: { backgroundColor: "transparent" },
};

const pressedStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: theme.colors.primaryDark },
  secondary: { backgroundColor: theme.colors.secondaryDark },
  outline: { backgroundColor: "rgba(42,42,114,0.06)" },
  ghost: { backgroundColor: "rgba(42,42,114,0.06)" },
};

const textVariantStyles = {
  primary: { color: theme.colors.textInverse },
  secondary: { color: theme.colors.textInverse },
  outline: { color: theme.colors.primary },
  ghost: { color: theme.colors.primary },
} as const;


export default Button;
