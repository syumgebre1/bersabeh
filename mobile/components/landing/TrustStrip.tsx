/**
 * TrustStrip — 4 trust badges below the hero.
 */

import { Award, Heart, Phone, Users } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { CLINIC } from "@/constants/clinic";
import { theme } from "@/constants/theme";


export function TrustStrip() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const items = [
    {
      Icon: Award,
      title: t("trust.licensed"),
      sub: `${t("trust.licenseLabel")}: ${CLINIC.licenseNumber}`,
    },
    {
      Icon: Users,
      title: t("trust.experts"),
      sub: t("trust.specialties"),
    },
    {
      Icon: Heart,
      title: t("trust.years"),
      sub: t("footer.tagline"),
    },
    {
      Icon: Phone,
      title: t("trust.emergency"),
      sub: CLINIC.emergencyPhone,
    },
  ];

  return (
    <View style={styles.wrap}>
      <View style={[styles.row, !isWide && styles.rowStack]}>
        {items.map((item, idx) => (
          <View key={idx} style={styles.cell}>
            <View style={styles.iconWrap}>
              <item.Icon size={18} color={theme.colors.accent} strokeWidth={2.2} />
            </View>
            <View style={styles.text}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub}>{item.sub}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.primaryDark,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.xl,
    maxWidth: theme.layout.maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  rowStack: { flexDirection: "column" },
  cell: { flex: 1, flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(232,178,58,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
  title: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13.5,
    color: theme.colors.textInverse,
  },
  sub: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11.5,
    color: "rgba(255,255,255,0.65)",
  },
});


export default TrustStrip;
