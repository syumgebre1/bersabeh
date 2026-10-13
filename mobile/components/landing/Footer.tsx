/**
 * Footer — brand + quick links + contact + social.
 */

import { Facebook, Instagram, Mail, MapPin, Phone, Twitter } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { CLINIC } from "@/constants/clinic";
import { theme } from "@/constants/theme";
import { scrollToSection, scrollToTop } from "@/lib/scroll";


const QUICK_LINKS = [
  { key: "header.home",        target: "top" },
  { key: "header.departments", target: "departments" },
  { key: "header.doctors",     target: "doctors" },
  { key: "header.services",    target: "services" },
  { key: "header.contact",     target: "location" },
];


export function Footer() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const handleNav = (target: string) => {
    if (target === "top") scrollToTop();
    else scrollToSection(target);
  };

  const handleCall = () => Linking.openURL(`tel:${CLINIC.receptionPhone.replace(/\s+/g, "")}`);
  const handleEmail = () => Linking.openURL(`mailto:${CLINIC.email}`);

  const openExternal = (url: string) => {
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener");
    else Linking.openURL(url);
  };

  return (
    <View style={styles.footer}>
      <View style={[styles.cols, !isWide && styles.colsStack]}>
        {/* Brand */}
        <View style={[styles.col, styles.brandCol]}>
          <Pressable
            onPress={() => handleNav("top")}
            style={({ hovered }: any) => [styles.brandRow, hovered && styles.hover]}
          >
            <View style={styles.brandDot} />
            <Text style={styles.brandText}>{CLINIC.name}</Text>
          </Pressable>
          <Text style={styles.tagline}>{t("footer.tagline")}</Text>
          <Text style={styles.license}>
            {t("footer.license")}: {CLINIC.licenseNumber}
          </Text>
        </View>

        {/* Quick links */}
        <View style={styles.col}>
          <Text style={styles.colTitle}>{t("footer.quickLinks")}</Text>
          {QUICK_LINKS.map((link) => (
            <Pressable
              key={link.key}
              onPress={() => handleNav(link.target)}
              style={({ hovered }: any) => [styles.link, hovered && styles.hover]}
            >
              <Text style={styles.linkText}>{t(link.key)}</Text>
            </Pressable>
          ))}
        </View>

        {/* Contact */}
        <View style={styles.col}>
          <Text style={styles.colTitle}>{t("footer.contact")}</Text>

          <View style={styles.contactRow}>
            <MapPin size={14} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            <Text style={styles.contactText}>{CLINIC.fullAddress}</Text>
          </View>

          <Pressable
            onPress={handleCall}
            style={({ hovered }: any) => [styles.contactRow, hovered && styles.hover]}
          >
            <Phone size={14} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            <Text style={styles.contactText}>{CLINIC.receptionPhone}</Text>
          </Pressable>

          <Pressable
            onPress={handleEmail}
            style={({ hovered }: any) => [styles.contactRow, hovered && styles.hover]}
          >
            <Mail size={14} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            <Text style={styles.contactText}>{CLINIC.email}</Text>
          </Pressable>
        </View>

        {/* Follow us */}
        <View style={styles.col}>
          <Text style={styles.colTitle}>{t("footer.followUs")}</Text>
          <View style={styles.socialRow}>
            <Pressable
              onPress={() => openExternal("https://facebook.com/bersabehclinic")}
              style={({ hovered }: any) => [styles.socialBtn, hovered && styles.hover]}
            >
              <Facebook size={18} color={theme.colors.textInverse} strokeWidth={2} />
            </Pressable>
            <Pressable
              onPress={() => openExternal("https://twitter.com/bersabehclinic")}
              style={({ hovered }: any) => [styles.socialBtn, hovered && styles.hover]}
            >
              <Twitter size={18} color={theme.colors.textInverse} strokeWidth={2} />
            </Pressable>
            <Pressable
              onPress={() => openExternal("https://instagram.com/bersabehclinic")}
              style={({ hovered }: any) => [styles.socialBtn, hovered && styles.hover]}
            >
              <Instagram size={18} color={theme.colors.textInverse} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Bottom strip */}
      <View style={styles.bottomStrip}>
        <Text style={styles.copyright}>
          © {new Date().getFullYear()} {CLINIC.name}. {t("footer.rights")}
        </Text>
        <Text style={styles.madeIn}>{t("footer.madeIn")} · በአዲስ የተሰራ</Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  footer: { backgroundColor: theme.colors.primaryDark, paddingTop: theme.spacing.huge, paddingHorizontal: theme.spacing.lg },
  cols: { flexDirection: "row", gap: theme.spacing.xl, maxWidth: theme.layout.maxContentWidth, width: "100%", alignSelf: "center", paddingBottom: theme.spacing.xxl },
  colsStack: { flexDirection: "column", gap: theme.spacing.xxl },
  col: { flex: 1, gap: theme.spacing.sm, minWidth: 200 },
  brandCol: { flex: 1.4 },
  hover: { opacity: 0.85 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs + 2, marginBottom: theme.spacing.sm },
  brandDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.secondary },
  brandText: { fontFamily: theme.fontFamily.heading, fontSize: 22, color: theme.colors.textInverse, letterSpacing: -0.4 },
  tagline: { fontFamily: theme.fontFamily.body, fontSize: 14, lineHeight: 21, color: "rgba(255, 255, 255, 0.65)", maxWidth: 380 },
  license: { fontFamily: theme.fontFamily.body, fontSize: 12, color: "rgba(255, 255, 255, 0.45)", marginTop: theme.spacing.sm },
  colTitle: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(255, 255, 255, 0.5)", marginBottom: theme.spacing.sm },
  link: { paddingVertical: theme.spacing.xs, cursor: "pointer" as any },
  linkText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: "rgba(255, 255, 255, 0.85)" },
  contactRow: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.xs + 2, paddingVertical: theme.spacing.xs, cursor: "pointer" as any },
  contactText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, lineHeight: 19, color: "rgba(255, 255, 255, 0.8)", flexShrink: 1 },
  socialRow: { flexDirection: "row", gap: theme.spacing.sm },
  socialBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.08)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.12)", cursor: "pointer" as any },
  bottomStrip: { borderTopWidth: 1, borderTopColor: "rgba(255, 255, 255, 0.1)", paddingVertical: theme.spacing.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: theme.spacing.md, maxWidth: theme.layout.maxContentWidth, width: "100%", alignSelf: "center" },
  copyright: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: "rgba(255, 255, 255, 0.55)" },
  madeIn: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: "rgba(255, 255, 255, 0.45)" },
});


export default Footer;
