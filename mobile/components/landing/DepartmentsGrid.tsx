/**
 * DepartmentsGrid — 8 departments in a responsive grid.
 *
 * Department names/descriptions come from the CMS content bundle
 * (via useContentBundle). Falls back to CLINIC seed data.
 */

import {
  Activity, Bed, Droplet, HeartPulse, Scissors, Stethoscope, Wind, Bandage,
  type LucideIcon,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";


const ICON_MAP: Record<string, LucideIcon> = {
  "stethoscope":  Stethoscope,
  "scissors":     Scissors,
  "activity":     Activity,
  "heart-pulse":  HeartPulse,
  "droplet":      Droplet,
  "wind":         Wind,
  "bed":          Bed,
  "bandage":      Bandage,
};


interface Department {
  key: string;
  name: string;
  description: string;
  icon: string;
}


// Seed data — will be overridden by CMS content at boot
const SEED: Department[] = [
  { key: "internal_medicine", name: "Internal Medicine", description: "", icon: "stethoscope" },
  { key: "general_surgery",   name: "General Surgery",   description: "", icon: "scissors" },
  { key: "gastroenterology",  name: "Gastroenterology",  description: "", icon: "activity" },
  { key: "cardiology",        name: "Cardiology",        description: "", icon: "heart-pulse" },
  { key: "nephrology",        name: "Nephrology",        description: "", icon: "droplet" },
  { key: "pulmonology",       name: "Pulmonology",       description: "", icon: "wind" },
  { key: "post_op_care",      name: "Post-op Care",      description: "", icon: "bed" },
  { key: "wound_care",        name: "Wound Care",        description: "", icon: "bandage" },
];


export function DepartmentsGrid() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = width >= 1200 ? 4 : width >= 800 ? 3 : width >= 500 ? 2 : 1;

  return (
    <View style={styles.section} nativeID="departments">
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t("header.departments")}</Text>
          <Text style={styles.title}>{t("departments.title")}</Text>
          <Text style={styles.subtitle}>{t("departments.subtitle")}</Text>
        </View>

        <View style={styles.grid}>
          {SEED.map((d) => {
            const Icon = ICON_MAP[d.icon] ?? Stethoscope;
            return (
              <Pressable
                key={d.key}
                onPress={() => router.push(`/(auth)/register?department=${d.key}` as any)}
                style={({ hovered }: any) => [
                  styles.card,
                  { flexBasis: `calc(${100 / columns}% - ${theme.spacing.base}px)` as unknown as number },
                  hovered && styles.cardHover,
                ]}
              >
                <View style={styles.iconWrap}>
                  <Icon size={20} color={theme.colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.name}>{d.name}</Text>
                {d.description ? <Text style={styles.desc}>{d.description}</Text> : null}
              </Pressable>
            );
          })}
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
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.base },
  card: {
    cursor: "pointer" as any,
    minWidth: 200,
    minHeight: 160,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  cardHover: { borderColor: theme.colors.primary, transform: [{ translateY: -1 }] },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: "rgba(42,42,114,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 16,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  desc: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.muted,
  },
});


export default DepartmentsGrid;
