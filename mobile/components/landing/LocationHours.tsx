/**
 * LocationHours — map placeholder + address + hours + emergency.
 */

import { Clock, MapPin, Navigation, ParkingCircle, Phone } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  Linking, Pressable, StyleSheet, Text, useWindowDimensions, View,
} from "react-native";

import { CLINIC } from "@/constants/clinic";
import { theme } from "@/constants/theme";


export function LocationHours() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const handleDirections = () => {
    const query = encodeURIComponent(CLINIC.fullAddress);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener");
    } else {
      Linking.openURL(url);
    }
  };

  const handleEmergencyCall = () => {
    Linking.openURL(`tel:${CLINIC.emergencyPhone.replace(/\s+/g, "")}`);
  };

  return (
    <View style={styles.section} nativeID="location">
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t("header.contact")}</Text>
          <Text style={styles.title}>{t("location.title")}</Text>
        </View>

        <View style={[styles.cols, !isWide && styles.colsStack]}>
          {/* Map placeholder */}
          <View style={[styles.mapCard, isWide && styles.mapCardWide]}>
            <View style={styles.pinWrap}>
              <View style={styles.pinBadge}>
                <MapPin size={26} color={theme.colors.textInverse} strokeWidth={2.4} />
              </View>
              <Text style={styles.pinLabel}>{CLINIC.name}</Text>
              <Text style={styles.pinSub}>{CLINIC.neighborhood}</Text>
            </View>

            <View style={styles.mapFooter}>
              <Pressable
                onPress={handleDirections}
                style={({ hovered }: any) => [styles.directionsLink, hovered && styles.directionsLinkHover]}
              >
                <Navigation size={14} color={theme.colors.primary} strokeWidth={2.2} />
                <Text style={styles.directionsText}>{t("location.directions")}</Text>
              </Pressable>
            </View>
          </View>

          {/* Info panel */}
          <View style={[styles.infoCard, isWide && styles.infoCardWide]}>
            <View style={styles.infoBlock}>
              <View style={styles.infoHeader}>
                <MapPin size={16} color={theme.colors.primary} strokeWidth={2.2} />
                <Text style={styles.infoLabel}>{t("location.title")}</Text>
              </View>
              <Text style={styles.infoPrimary}>{CLINIC.fullAddress}</Text>
              <Text style={styles.infoSecondary}>{CLINIC.landmark}</Text>
              <View style={styles.parkingRow}>
                <ParkingCircle size={14} color={theme.colors.muted} strokeWidth={2} />
                <Text style={styles.infoSecondary}>{CLINIC.parkingNote}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoBlock}>
              <View style={styles.infoHeader}>
                <Clock size={16} color={theme.colors.primary} strokeWidth={2.2} />
                <Text style={styles.infoLabel}>{t("location.hoursTitle")}</Text>
              </View>
              <View style={styles.hoursRow}>
                <Text style={styles.hoursDay}>{t("location.weekdays")}</Text>
                <Text style={styles.hoursTime}>{t("location.weekdaysHours")}</Text>
              </View>
              <View style={styles.hoursRow}>
                <Text style={styles.hoursDay}>{t("location.weekend")}</Text>
                <Text style={styles.hoursTime}>{t("location.weekendHours")}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Pressable
              onPress={handleEmergencyCall}
              style={({ hovered }: any) => [
                styles.infoBlock,
                styles.emergencyBlock,
                hovered && styles.emergencyHover,
              ]}
            >
              <View style={styles.infoHeader}>
                <Phone size={16} color={theme.colors.danger} strokeWidth={2.4} />
                <Text style={[styles.infoLabel, styles.emergencyLabel]}>
                  {t("location.emergencyPhone")}
                </Text>
              </View>
              <Text style={styles.emergencyNumber}>{CLINIC.emergencyPhone}</Text>
            </Pressable>
          </View>
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
  cols: { flexDirection: "row", gap: theme.spacing.xl, alignItems: "stretch" },
  colsStack: { flexDirection: "column" },
  mapCard: { backgroundColor: theme.colors.primaryDark, borderRadius: theme.radius.md, overflow: "hidden", minHeight: 380, justifyContent: "space-between" },
  mapCardWide: { flexBasis: "50%" },
  pinWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: theme.spacing.xl },
  pinBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.secondary, alignItems: "center", justifyContent: "center", marginBottom: theme.spacing.md, ...theme.shadow.lg },
  pinLabel: { fontFamily: theme.fontFamily.heading, fontSize: 22, color: theme.colors.textInverse, letterSpacing: -0.3 },
  pinSub: { fontFamily: theme.fontFamily.body, fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: theme.spacing.xs },
  mapFooter: { padding: theme.spacing.lg, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)" },
  directionsLink: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, alignSelf: "flex-start", cursor: "pointer" as any },
  directionsLinkHover: { opacity: 0.85 },
  directionsText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.textInverse, letterSpacing: 0.2 },
  infoCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.xl, gap: theme.spacing.lg, justifyContent: "space-between" },
  infoCardWide: { flexBasis: "50%" },
  infoBlock: { gap: theme.spacing.sm },
  infoHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs },
  infoLabel: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  infoPrimary: { fontFamily: theme.fontFamily.headingMedium, fontSize: 16, lineHeight: 22, color: theme.colors.text },
  infoSecondary: { fontFamily: theme.fontFamily.body, fontSize: 13.5, lineHeight: 19, color: theme.colors.muted, flexShrink: 1 },
  parkingRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, marginTop: theme.spacing.xs },
  divider: { height: 1, backgroundColor: theme.colors.border },
  hoursRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  hoursDay: { fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text },
  hoursTime: { fontFamily: theme.fontFamily.headingMedium, fontSize: 14.5, color: theme.colors.text, letterSpacing: -0.1 },
  emergencyBlock: { backgroundColor: theme.colors.dangerBg, marginHorizontal: -theme.spacing.xl, marginBottom: -theme.spacing.xl, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.lg, borderBottomLeftRadius: theme.radius.md, borderBottomRightRadius: theme.radius.md, cursor: "pointer" as any },
  emergencyHover: { opacity: 0.92 },
  emergencyLabel: { color: theme.colors.danger },
  emergencyNumber: { fontFamily: theme.fontFamily.heading, fontSize: 22, color: theme.colors.danger, letterSpacing: -0.2 },
});


export default LocationHours;
