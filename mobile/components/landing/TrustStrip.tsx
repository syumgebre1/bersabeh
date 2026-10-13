/**
 * TrustStrip — the dark indigo band of trust signals below the hero.
 *
 * Layout (wide):    [🛡 MoH]  [👥 4 specialists]  [📅 Since 2009]  [🚨 24/7]
 * Layout (narrow):  two rows of two
 */

import { CalendarClock, PhoneCall, ShieldCheck, Users } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { CLINIC } from "@/constants/clinic";
import { theme } from "@/constants/theme";


interface ItemProps {
  Icon: typeof ShieldCheck;
  title: string;
  subtitle: string;
  narrow: boolean;
}

function TrustItem({ Icon, title, subtitle, narrow }: ItemProps) {
  return (
    <View style={[styles.item, narrow && styles.itemNarrow]}>
      <View style={styles.iconCircle}>
        <Icon size={18} color={theme.colors.accent} strokeWidth={2.2} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}


export function TrustStrip() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  return (
    <View style={styles.band}>
      <View style={[styles.inner, isNarrow && styles.innerNarrow]}>
        <TrustItem
          Icon={ShieldCheck}
          title={t("trust.licensed")}
          subtitle={`${t("trust.license")}: ${CLINIC.licenseNumber}`}
          narrow={isNarrow}
        />
        <TrustItem
          Icon={Users}
          title={t("trust.doctors")}
          subtitle="Internal · Surgery · Cardio · Gastro"
          narrow={isNarrow}
        />
        <TrustItem
          Icon={CalendarClock}
          title={t("trust.years")}
          subtitle="16 years serving Addis"
          narrow={isNarrow}
        />
        <TrustItem
          Icon={PhoneCall}
          title={t("trust.emergency")}
          subtitle={CLINIC.emergencyPhone}
          narrow={isNarrow}
        />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  band: {
    backgroundColor: theme.colors.primaryDark,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  inner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.lg,
    maxWidth: theme.layout.maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  innerNarrow: {
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    flexBasis: "auto",
    flexGrow: 1,
  },
  itemNarrow: {
    flexBasis: "45%",
    flexGrow: 0,
    marginBottom: theme.spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(232, 178, 58, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(232, 178, 58, 0.3)",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 15,
    color: theme.colors.textInverse,
    letterSpacing: -0.1,
  },
  itemSubtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
});


export default TrustStrip;
