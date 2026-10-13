/**
 * UtilityBar — top strip: emergency phone + hours.
 */

import { Clock, Phone } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { CLINIC } from "@/constants/clinic";
import { theme } from "@/constants/theme";


export function UtilityBar() {
  const { t } = useTranslation();
  return (
    <View style={styles.bar}>
      <View style={styles.item}>
        <Phone size={12} color={theme.colors.textInverse} strokeWidth={2.2} />
        <Text style={styles.text}>
          <Text style={styles.strong}>{t("utility.emergency")}:</Text> {CLINIC.emergencyPhone}
        </Text>
      </View>
      <View style={styles.item}>
        <Clock size={12} color={theme.colors.textInverse} strokeWidth={2.2} />
        <Text style={styles.text}>{t("utility.hours")}</Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.colors.primaryDark,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  item: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs },
  text: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textInverse,
    opacity: 0.85,
  },
  strong: { fontFamily: theme.fontFamily.bodyBold },
});


export default UtilityBar;
