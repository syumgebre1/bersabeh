/**
 * UtilityBar — the thin dark strip above the header.
 *
 * Layout:  [ 🚨 Emergency: +251 ... ]  ···  [ today's hours ]  ···  [ EN · አማ · ትግ ]
 *
 * On screens narrower than 720px, the hours segment is hidden so the bar
 * doesn't get crowded. Emergency phone and language switcher stay always.
 */

import { Phone } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { CLINIC } from "@/constants/clinic";
import { theme } from "@/constants/theme";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";


export function UtilityBar() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const showHours = width >= 720;

  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <View style={styles.left}>
          <Phone size={12} color={theme.colors.accent} strokeWidth={2.4} />
          <Text style={styles.text}>
            <Text style={styles.label}>{t("utility.emergency")}:</Text>{" "}
            {CLINIC.emergencyPhone}
          </Text>
        </View>

        {showHours && (
          <View style={styles.center}>
            <Text style={styles.text}>{t("utility.hours")}</Text>
          </View>
        )}

        <View style={styles.right}>
          <LanguageSwitcher compact onDark />
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.colors.primaryDark,
    height: theme.layout.utilityBarHeight,
    justifyContent: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontSize: 11.5,
    fontFamily: theme.fontFamily.body,
    color: "rgba(255, 255, 255, 0.85)",
    letterSpacing: 0.2,
  },
  label: {
    fontFamily: theme.fontFamily.bodyBold,
    color: theme.colors.accent,
    letterSpacing: 0.4,
  },
});


export default UtilityBar;
