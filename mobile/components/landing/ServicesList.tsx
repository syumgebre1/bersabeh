/**
 * ServicesList — service table with ETB pricing.
 */

import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";


interface Service {
  name: string;
  description: string;
  priceMin: number;
  priceMax: number;
}


const SEED: Service[] = [
  { name: "General Consultation",     description: "", priceMin: 300, priceMax: 800 },
  { name: "Specialist Consultation",  description: "", priceMin: 600, priceMax: 1500 },
  { name: "Basic Lab Panel",          description: "", priceMin: 400, priceMax: 1200 },
  { name: "ECG",                      description: "", priceMin: 500, priceMax: 900 },
  { name: "Wound Dressing",           description: "", priceMin: 200, priceMax: 600 },
];


export function ServicesList() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  return (
    <View style={styles.section} nativeID="services">
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t("header.services")}</Text>
          <Text style={styles.title}>{t("services.title")}</Text>
        </View>

        <View style={styles.list}>
          {SEED.map((s, idx) => (
            <Pressable
              key={idx}
              onPress={() => router.push(`/(auth)/register?service=${encodeURIComponent(s.name)}` as any)}
              style={({ hovered }: any) => [
                styles.row,
                idx < SEED.length - 1 && styles.rowBorder,
                hovered && styles.rowHover,
              ]}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.name}>{s.name}</Text>
                {s.description ? (
                  <Text style={styles.desc}>{s.description}</Text>
                ) : null}
              </View>
              {isWide ? (
                <Text style={styles.price}>
                  {s.priceMin.toLocaleString()} – {s.priceMax.toLocaleString()} ETB
                </Text>
              ) : (
                <Text style={styles.price}>
                  {s.priceMin.toLocaleString()}+ ETB
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  section: { backgroundColor: theme.colors.surface, paddingVertical: theme.spacing.huge, paddingHorizontal: theme.spacing.lg },
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
  list: {
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    cursor: "pointer" as any,
  },
  rowHover: { backgroundColor: "rgba(42,42,114,0.03)" },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowLeft: { flex: 1, gap: 2 },
  name: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 15,
    color: theme.colors.text,
  },
  desc: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    color: theme.colors.muted,
  },
  price: {
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 15,
    color: theme.colors.secondary,
    letterSpacing: -0.2,
  },
});


export default ServicesList;
