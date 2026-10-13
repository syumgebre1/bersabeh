/**
 * HowItWorks — 3-step timeline with ghost 01/02/03 numbers.
 */

import { useTranslation } from "react-i18next";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";


export function HowItWorks() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWide = width >= 800;

  const steps = [
    { num: "01", title: t("hero.ctaPrimary"),  body: "" },
    { num: "02", title: t("location.title"),   body: "" },
    { num: "03", title: t("header.patientPortal"), body: "" },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t("howItWorks.title")}</Text>
          <Text style={styles.title}>{t("howItWorks.title")}</Text>
        </View>

        <View style={[styles.row, !isWide && styles.rowStack]}>
          {steps.map((s, idx) => (
            <View key={idx} style={styles.step}>
              <Text style={styles.ghostNum}>{s.num}</Text>
              <Text style={styles.stepTitle}>{s.title}</Text>
              {s.body ? <Text style={styles.stepBody}>{s.body}</Text> : null}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  section: { backgroundColor: theme.colors.bg, paddingVertical: theme.spacing.huge, paddingHorizontal: theme.spacing.lg },
  inner: { width: "100%", maxWidth: theme.layout.maxContentWidth, alignSelf: "center", gap: theme.spacing.xxl },
  header: { gap: theme.spacing.xs },
  eyebrow: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: theme.colors.secondary,
  },
  title: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
    color: theme.colors.text,
  },
  row: { flexDirection: "row", gap: theme.spacing.xl },
  rowStack: { flexDirection: "column" },
  step: { flex: 1, gap: theme.spacing.sm },
  ghostNum: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 96,
    lineHeight: 96,
    letterSpacing: -3,
    color: "rgba(232,178,58,0.22)",
  },
  stepTitle: {
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 22,
    color: theme.colors.text,
    letterSpacing: -0.4,
  },
  stepBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.muted,
  },
});


export default HowItWorks;
