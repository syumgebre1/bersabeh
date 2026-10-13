/**
 * HowItWorks — 3-step process section.
 *
 * Layout:   [ 01 Register ] —— [ 02 Verify ] —— [ 03 Book ]
 *
 * The 01/02/03 are large "ghost" numbers rendered in light gold behind
 * the step text — a subtle Ethiopian-geometric touch without being kitsch.
 * Steps are connected by a dashed line on wide screens.
 */

import { useTranslation } from "react-i18next";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";


interface StepProps {
  index: number;
  title: string;
  body: string;
  showConnector: boolean;
  compact: boolean;
}

function Step({ index, title, body, showConnector, compact }: StepProps) {
  const number = String(index).padStart(2, "0");

  return (
    <View style={[styles.stepRow, compact && styles.stepRowCompact]}>
      <View style={[styles.step, compact && styles.stepCompact]}>
        <Text style={styles.ghostNumber}>{number}</Text>
        <View style={styles.stepContent}>
          <Text style={styles.stepNumber}>{number}</Text>
          <Text style={styles.stepTitle}>{title}</Text>
          <Text style={styles.stepBody}>{body}</Text>
        </View>
      </View>
      {showConnector && <View style={styles.connector} />}
    </View>
  );
}


export function HowItWorks() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const steps = [
    { title: t("howItWorks.step1Title"), body: t("howItWorks.step1Body") },
    { title: t("howItWorks.step2Title"), body: t("howItWorks.step2Body") },
    { title: t("howItWorks.step3Title"), body: t("howItWorks.step3Body") },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Simple process</Text>
          <Text style={styles.title}>{t("howItWorks.title")}</Text>
        </View>

        <View style={[styles.steps, !isWide && styles.stepsCompact]}>
          {steps.map((s, i) => (
            <Step
              key={i}
              index={i + 1}
              title={s.title}
              body={s.body}
              showConnector={isWide && i < steps.length - 1}
              compact={!isWide}
            />
          ))}
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  section: {
    backgroundColor: theme.colors.bg,
    paddingVertical: theme.spacing.huge,
    paddingHorizontal: theme.spacing.lg,
  },
  inner: {
    width: "100%",
    maxWidth: theme.layout.maxContentWidth,
    alignSelf: "center",
  },
  header: {
    marginBottom: theme.spacing.xxl,
  },
  eyebrow: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: theme.colors.secondary,
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
    color: theme.colors.text,
  },
  steps: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.lg,
  },
  stepsCompact: {
    flexDirection: "column",
    gap: theme.spacing.xxl,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    flexBasis: "33%",
    gap: theme.spacing.lg,
  },
  stepRowCompact: {
    flexBasis: "auto",
    flexDirection: "row",
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.base,
    flex: 1,
    position: "relative",
  },
  stepCompact: {
    alignItems: "flex-start",
  },
  ghostNumber: {
    position: "absolute",
    top: -30,
    left: -12,
    fontFamily: theme.fontFamily.heading,
    fontSize: 96,
    lineHeight: 96,
    color: "rgba(232, 178, 58, 0.14)",
    letterSpacing: -4,
    zIndex: -1,
  },
  stepContent: {
    flexShrink: 1,
  },
  stepNumber: {
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 14,
    letterSpacing: 1.2,
    color: theme.colors.secondary,
    marginBottom: theme.spacing.sm,
  },
  stepTitle: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  stepBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.muted,
    maxWidth: 320,
  },
  connector: {
    width: 40,
    height: 1,
    backgroundColor: theme.colors.border,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    marginTop: 24,
  },
});


export default HowItWorks;
