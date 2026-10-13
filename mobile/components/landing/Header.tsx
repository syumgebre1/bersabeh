/**
 * Header — the sticky wordmark + navigation + CTAs bar.
 *
 * Layout:
 *   [ 🔷 Bersabeh Clinic ]    Home · Departments · Doctors · Services · Contact    [ Patient Portal ] [ Book Appointment ]
 *
 * Responsive:
 *   - width >= 900: full nav + both CTAs
 *   - width < 900:  wordmark + a single "Book Appointment" CTA (hamburger comes later)
 */

import { Menu } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";


const NAV_ITEMS = [
  { key: "header.home",         href: "/" },
  { key: "header.departments",  href: "#departments" },
  { key: "header.doctors",      href: "#doctors" },
  { key: "header.services",     href: "#services" },
  { key: "header.contact",      href: "#location" },
] as const;


export function Header() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const showFullNav = width >= 900;

  return (
    <View style={styles.header}>
      <View style={styles.inner}>
        {/* Wordmark */}
        <View style={styles.brand}>
          <View style={styles.brandDot} />
          <Text style={styles.brandText}>Bersabeh Clinic</Text>
        </View>

        {/* Nav */}
        {showFullNav && (
          <View style={styles.nav}>
            {NAV_ITEMS.map((item) => (
              <Pressable
                key={item.key}
                style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
                accessibilityRole="link"
              >
                <Text style={styles.navText}>{t(item.key)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* CTAs */}
        <View style={styles.ctas}>
          {showFullNav && (
            <View style={styles.ctaSecondary}>
              <Button
                label={t("header.patientPortal")}
                variant="outline"
                size="sm"
                onPress={() => {}}
              />
            </View>
          )}
          <Button
            label={t("header.bookAppointment")}
            variant="primary"
            size="sm"
            onPress={() => {}}
          />
          {!showFullNav && (
            <Pressable style={styles.menuButton} accessibilityRole="button">
              <Menu size={20} color={theme.colors.text} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    // Sticky-ish shadow — subtle, no glass
    ...theme.shadow.sm,
  },
  inner: {
    height: theme.layout.headerHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    maxWidth: theme.layout.maxContentWidth,
    width: "100%",
    alignSelf: "center",
    gap: theme.spacing.lg,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs + 2,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.secondary,
  },
  brandText: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 20,
    letterSpacing: -0.4,
    color: theme.colors.primary,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.lg,
  },
  navItem: {
    paddingVertical: theme.spacing.xs,
  },
  navItemPressed: {
    opacity: 0.6,
  },
  navText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14.5,
    color: theme.colors.text,
    letterSpacing: 0.1,
  },
  ctas: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  ctaSecondary: {
    // wrapper to keep spacing consistent
  },
  menuButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
});


export default Header;
