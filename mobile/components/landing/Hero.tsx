/**
 * Hero — asymmetric hero + booking widget.
 *
 * Layout:
 *   [  eyebrow label                        ]
 *   [  BIG HEADLINE (Space Grotesk)         ]  [  ┌──────────────┐ ]
 *   [  subhead (Inter)                       ]  [  │ Booking      │ ]
 *   [  [CTA1]  [CTA2]                        ]  [  │ widget       │ ]
 *                                               [  │ card         │ ]
 *                                               [  └──────────────┘ ]
 *
 * Responsive: stacks vertically below ~860px.
 */

import { Calendar, ChevronDown, Sparkles } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";


export function Hero() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;

  return (
    <View style={styles.wrap}>
      <View style={[styles.inner, isWide ? styles.innerWide : styles.innerNarrow]}>
        {/* Left — copy */}
        <View style={[styles.copy, isWide ? styles.copyWide : styles.copyNarrow]}>
          <View style={styles.eyebrowRow}>
            <Sparkles size={14} color={theme.colors.secondary} strokeWidth={2.2} />
            <Text style={styles.eyebrow}>Bersabeh Clinic · Addis Ababa</Text>
          </View>

          <Text style={[styles.headline, !isWide && styles.headlineNarrow]}>
            {t("hero.headline")}
          </Text>

          <Text style={styles.subhead}>{t("hero.subhead")}</Text>

          <View style={styles.ctas}>
            <Button
              label={t("hero.ctaPrimary")}
              variant="primary"
              size="lg"
              onPress={() => {}}
            />
            <Button
              label={t("hero.ctaSecondary")}
              variant="outline"
              size="lg"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Right — booking widget */}
        <View style={[styles.widgetWrap, isWide ? styles.widgetWrapWide : styles.widgetWrapNarrow]}>
          {/* Decorative gold band behind the card — Urban Ethio accent */}
          <View style={styles.accentBand} />

          <View style={styles.widget}>
            <View style={styles.widgetTop}>
              <Text style={styles.widgetEyebrow}>{t("hero.booking.title")}</Text>
            </View>

            <View style={styles.fieldRow}>
              <Calendar size={16} color={theme.colors.primary} strokeWidth={2} />
              <View style={styles.fieldText}>
                <Text style={styles.fieldLabel}>{t("hero.booking.date")}</Text>
                <Text style={styles.fieldValue}>
                  {t("hero.booking.datePlaceholder")}
                </Text>
              </View>
              <ChevronDown size={16} color={theme.colors.muted} strokeWidth={2} />
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldIconSpacer} />
              <View style={styles.fieldText}>
                <Text style={styles.fieldLabel}>{t("hero.booking.department")}</Text>
                <Text style={styles.fieldValue}>
                  {t("hero.booking.departmentPlaceholder")}
                </Text>
              </View>
              <ChevronDown size={16} color={theme.colors.muted} strokeWidth={2} />
            </View>

            <View style={styles.widgetCta}>
              <Button
                label={t("hero.booking.check")}
                variant="secondary"
                size="md"
                fullWidth
                onPress={() => {}}
              />
            </View>

            <Text style={styles.widgetFootnote}>{t("hero.booking.success")}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.bg,
    paddingVertical: theme.spacing.huge,
    paddingHorizontal: theme.spacing.lg,
  },
  inner: {
    width: "100%",
    maxWidth: theme.layout.maxContentWidth,
    alignSelf: "center",
    gap: theme.spacing.xxl,
  },
  innerWide: {
    flexDirection: "row",
    alignItems: "center",
  },
  innerNarrow: {
    flexDirection: "column",
  },
  copy: {
    gap: theme.spacing.lg,
  },
  copyWide: {
    flexBasis: "55%",
    paddingRight: theme.spacing.xxl,
  },
  copyNarrow: {
    flexBasis: "auto",
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs + 2,
  },
  eyebrow: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: theme.colors.secondary,
  },
  headline: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 56,
    lineHeight: 62,
    letterSpacing: -1.2,
    color: theme.colors.text,
    maxWidth: 620,
  },
  headlineNarrow: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
  },
  subhead: {
    fontFamily: theme.fontFamily.body,
    fontSize: 17,
    lineHeight: 26,
    color: theme.colors.muted,
    maxWidth: 560,
  },
  ctas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  widgetWrap: {
    position: "relative",
  },
  widgetWrapWide: {
    flexBasis: "45%",
    alignItems: "flex-end",
  },
  widgetWrapNarrow: {
    flexBasis: "auto",
    alignItems: "stretch",
  },
  accentBand: {
    position: "absolute",
    top: 16,
    bottom: -16,
    right: 16,
    left: 32,
    backgroundColor: "rgba(232, 178, 58, 0.18)",
    borderRadius: theme.radius.md,
  },
  widget: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.xl,
    gap: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.lg,
  },
  widgetTop: {
    marginBottom: theme.spacing.xs,
  },
  widgetEyebrow: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: theme.colors.primary,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bg,
  },
  fieldIconSpacer: {
    width: 16,
  },
  fieldText: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: theme.colors.muted,
  },
  fieldValue: {
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    color: theme.colors.text,
    marginTop: 2,
  },
  widgetCta: {
    marginTop: theme.spacing.xs,
  },
  widgetFootnote: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.muted,
    lineHeight: 17,
    marginTop: theme.spacing.xs,
  },
});


export default Hero;
