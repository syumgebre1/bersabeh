/**
 * Header — sticky top nav with clinic wordmark and working nav links.
 */

import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { CLINIC } from "@/constants/clinic";
import { theme } from "@/constants/theme";
import { scrollToSection, scrollToTop } from "@/lib/scroll";


export function Header() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const handleNav = (target: string) => {
    if (target === "top") {
      scrollToTop();
    } else {
      scrollToSection(target);
    }
  };

  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => handleNav("top")}
        style={({ hovered }: any) => [styles.brand, hovered && styles.brandHover]}
      >
        <View style={styles.brandDot} />
        <Text style={styles.brandText}>{CLINIC.name}</Text>
      </Pressable>

      {isWide && (
        <View style={styles.nav}>
          <Pressable onPress={() => handleNav("top")} style={styles.navItem}>
            <Text style={styles.navText}>{t("header.home")}</Text>
          </Pressable>
          <Pressable onPress={() => handleNav("departments")} style={styles.navItem}>
            <Text style={styles.navText}>{t("header.departments")}</Text>
          </Pressable>
          <Pressable onPress={() => handleNav("doctors")} style={styles.navItem}>
            <Text style={styles.navText}>{t("header.doctors")}</Text>
          </Pressable>
          <Pressable onPress={() => handleNav("services")} style={styles.navItem}>
            <Text style={styles.navText}>{t("header.services")}</Text>
          </Pressable>
          <Pressable onPress={() => handleNav("location")} style={styles.navItem}>
            <Text style={styles.navText}>{t("header.contact")}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.right}>
        <LanguageSwitcher />
        <Pressable
          onPress={() => router.push("/(auth)/login" as any)}
          style={({ hovered }: any) => [styles.portalBtn, hovered && styles.portalBtnHover]}
        >
          <Text style={styles.portalText}>{t("header.patientPortal")}</Text>
        </Pressable>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.lg,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs + 2, paddingVertical: 4 },
  brandHover: { opacity: 0.85 },
  brandDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.secondary },
  brandText: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 18,
    color: theme.colors.primary,
    letterSpacing: -0.3,
  },
  nav: { flexDirection: "row", gap: theme.spacing.lg },
  navItem: { paddingVertical: theme.spacing.xs, cursor: "pointer" as any },
  navText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14,
    color: theme.colors.text,
  },
  right: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  portalBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    cursor: "pointer" as any,
  },
  portalBtnHover: { opacity: 0.9 },
  portalText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.textInverse,
  },
});


export default Header;
