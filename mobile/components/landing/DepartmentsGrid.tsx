/**
 * DepartmentsGrid — the 8-department grid below the trust strip.
 *
 * Data source:
 *   The `content` prop is a flat {key: value} map from the CMS bundle
 *   (GET /api/v1/content). Keys look like:
 *     departments.cardiology.name        → "Cardiology"
 *     departments.cardiology.description → "Heart health, ECG, ..."
 *     departments.cardiology.icon        → "heart-pulse"
 *
 *   When no CMS data is present we fall back to a hardcoded list so the
 *   landing page still renders — the fallback matches clinic_config.py.
 *
 * Icon mapping:
 *   The CMS stores lucide icon *names* as strings. We map them here.
 *   Unknown names fall back to a neutral Circle icon.
 */

import {
  Activity,
  Bandage,
  Bed,
  Circle,
  Droplet,
  HeartPulse,
  Scissors,
  Stethoscope,
  Wind,
  ArrowRight,
  type LucideIcon,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";


// ============================================================
// Icon map: lucide name → component
// ============================================================
const ICON_MAP: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  scissors: Scissors,
  activity: Activity,
  "heart-pulse": HeartPulse,
  droplet: Droplet,
  wind: Wind,
  bed: Bed,
  bandage: Bandage,
};

const DEFAULT_ICON: LucideIcon = Circle;


// ============================================================
// Fallback departments (used when CMS bundle is not available)
// ============================================================
interface DeptEntry {
  key: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
}

const FALLBACK_DEPARTMENTS: DeptEntry[] = [
  { key: "internal_medicine",  name: "Internal Medicine",  description: "General adult care, chronic conditions, and diagnostics.", icon: "stethoscope",   sort_order: 1 },
  { key: "general_surgery",    name: "General Surgery",    description: "Minor and major surgical procedures with post-op care.",   icon: "scissors",      sort_order: 2 },
  { key: "gastroenterology",   name: "Gastroenterology",   description: "Digestive system, liver, and endoscopic procedures.",      icon: "activity",      sort_order: 3 },
  { key: "cardiology",         name: "Cardiology",         description: "Heart health, ECG, echocardiography, and follow-up.",      icon: "heart-pulse",   sort_order: 4 },
  { key: "nephrology",         name: "Nephrology",         description: "Kidney function assessment and chronic kidney care.",      icon: "droplet",       sort_order: 5 },
  { key: "pulmonology",        name: "Pulmonology",        description: "Respiratory conditions, asthma, and pulmonary function.",  icon: "wind",          sort_order: 6 },
  { key: "post_op_care",       name: "Post-op Care",       description: "Recovery monitoring and wound management after surgery.",  icon: "bed",           sort_order: 7 },
  { key: "wound_care",         name: "Wound Care",         description: "Dressing, debridement, and chronic wound management.",     icon: "bandage",       sort_order: 8 },
];


// ============================================================
// Read departments from a CMS bundle, or fall back
// ============================================================
function readDepartments(content?: Record<string, unknown>): DeptEntry[] {
  if (!content) return FALLBACK_DEPARTMENTS;

  // Collect distinct department keys from the flat map.
  const keys = new Set<string>();
  for (const k of Object.keys(content)) {
    const m = k.match(/^departments\.([^.]+)\./);
    if (m) keys.add(m[1]);
  }
  if (keys.size === 0) return FALLBACK_DEPARTMENTS;

  const depts: DeptEntry[] = [];
  for (const key of keys) {
    const name = (content[`departments.${key}.name`] as string) ?? key;
    const description = (content[`departments.${key}.description`] as string) ?? "";
    const icon = (content[`departments.${key}.icon`] as string) ?? "circle";
    if (name.includes("TODO: translate")) continue;   // skip placeholder translations
    depts.push({ key, name, description, icon, sort_order: 99 });
  }
  return depts.length > 0 ? depts : FALLBACK_DEPARTMENTS;
}


// ============================================================
// Component
// ============================================================
interface Props {
  /** Flat {key: value} map from the CMS bundle. Optional. */
  content?: Record<string, unknown>;
}


export function DepartmentsGrid({ content }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const departments = readDepartments(content);

  // Responsive column count
  const columns = width >= 1100 ? 4 : width >= 800 ? 3 : width >= 500 ? 2 : 1;
  const gap = theme.spacing.base;
  const basis = `${100 / columns}%` as unknown as number;

  return (
    <View style={styles.section}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.eyebrow}>Our departments</Text>
            <Text style={styles.title}>{t("departments.title")}</Text>
            <Text style={styles.subtitle}>{t("departments.subtitle")}</Text>
          </View>
          <Pressable style={styles.seeAll}>
            <Text style={styles.seeAllText}>{t("common.seeAll")}</Text>
            <ArrowRight size={16} color={theme.colors.primary} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={[styles.grid, { gap }]}>
          {departments.map((dept) => {
            const Icon = ICON_MAP[dept.icon] ?? DEFAULT_ICON;
            return (
              <Pressable
                key={dept.key}
                style={({ hovered }: any) => [
                  styles.card,
                  { flexBasis: `calc(${basis} - ${gap}px)` as unknown as number },
                  hovered && styles.cardHover,
                ]}
                accessibilityRole="link"
                accessibilityLabel={`${dept.name} — ${t("departments.viewDoctors")}`}
              >
                <View style={styles.iconWrap}>
                  <Icon size={22} color={theme.colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.cardTitle}>{dept.name}</Text>
                <Text style={styles.cardBody} numberOfLines={3}>
                  {dept.description}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardLink}>{t("departments.viewDoctors")}</Text>
                  <ArrowRight size={14} color={theme.colors.primary} strokeWidth={2} />
                </View>
              </Pressable>
            );
          })}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: theme.spacing.xxl,
    flexWrap: "wrap",
    gap: theme.spacing.base,
  },
  headerLeft: {
    flexShrink: 1,
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
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.muted,
    marginTop: theme.spacing.sm,
    maxWidth: 560,
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  seeAllText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14,
    color: theme.colors.primary,
    letterSpacing: 0.2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 200,
  },
  cardHover: {
    borderColor: theme.colors.primary,
    ...theme.shadow.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: "rgba(42, 42, 114, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: theme.colors.text,
  },
  cardBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.muted,
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: "auto",
    paddingTop: theme.spacing.md,
  },
  cardLink: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13.5,
    color: theme.colors.primary,
  },
});


export default DepartmentsGrid;
