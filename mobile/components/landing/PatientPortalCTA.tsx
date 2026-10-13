/**
 * PatientPortalCTA — full-width terracotta band for existing patients.
 *
 * Visually distinct from every other section: terracotta bg, inverted
 * white button with terracotta text. Asymmetric parallelogram accent on
 * the right edge (Ethiopian geometric cue).
 */

import { ArrowRight, UserCircle } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";


export function PatientPortalCTA() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWide = width >= 800;

  return (
    <View style={styles.band}>
      {/* Decorative parallelogram — Urban Ethio geometric cue */}
      <View style={styles.accentShape} pointerEvents="none" />

      <View style={[styles.inner, !isWide && styles.innerStack]}>
        <View style={styles.copy}>
          <View style={styles.eyebrowRow}>
            <UserCircle size={16} color={theme.colors.textInverse} strokeWidth={2.2} />
            <Text style={styles.eyebrow}>Patient portal</Text>
          </View>

          <Text style={[styles.title, !isWide && styles.titleNarrow]}>
            {t("portal.title")}
          </Text>

          <Text style={styles.body}>{t("portal.body")}</Text>
        </View>

        <View style={styles.action}>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel={t("portal.cta")}
          >
            <Text style={styles.buttonText}>{t("portal.cta")}</Text>
            <ArrowRight size={18} color={theme.colors.secondary} strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  band: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.huge,
    paddingHorizontal: theme.spacing.lg,
    position: "relative",
    overflow: "hidden",
  },
  accentShape: {
    position: "absolute",
    right: -80,
    top: -40,
    bottom: -40,
    width: 260,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    transform: [{ skewX: "-14deg" }],
  },
  inner: {
    width: "100%",
    maxWidth: theme.layout.maxContentWidth,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.xl,
  },
  innerStack: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  copy: {
    flexShrink: 1,
    gap: theme.spacing.md,
    maxWidth: 640,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    opacity: 0.9,
  },
  eyebrow: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: theme.colors.textInverse,
  },
  title: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
    color: theme.colors.textInverse,
  },
  titleNarrow: {
    fontSize: 30,
    lineHeight: 36,
  },
  body: {
    fontFamily: theme.fontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    color: "rgba(255, 255, 255, 0.88)",
  },
  action: {
    // Wrapper so the button doesn't stretch on wide screens.
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.textInverse,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.base,
    borderRadius: theme.radius.md,
    ...theme.shadow.md,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 15.5,
    color: theme.colors.secondary,
    letterSpacing: 0.2,
  },
});


export default PatientPortalCTA;
