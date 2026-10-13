/**
 * DoctorsGrid — 4 doctor cards with initials avatars.
 *
 * No stock photos — initials in an indigo circle per the design brief.
 * Data comes from the CMS bundle if present, otherwise falls back to the
 * seed doctors from clinic_config.py.
 */

import { ArrowRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";


// ============================================================
// Fallback doctors (matching clinic_config.DOCTORS_SEED)
// ============================================================
interface DoctorEntry {
  slug: string;
  full_name: string;
  specialty: string;
  years: number;
}

const FALLBACK_DOCTORS: DoctorEntry[] = [
  { slug: "selam-tesfaye", full_name: "Dr. Selam Tesfaye", specialty: "Internal Medicine", years: 12 },
  { slug: "dawit-bekele",  full_name: "Dr. Dawit Bekele",  specialty: "General Surgery",   years: 15 },
  { slug: "hana-girma",    full_name: "Dr. Hana Girma",    specialty: "Gastroenterology",  years: 9  },
  { slug: "yonas-alemu",   full_name: "Dr. Yonas Alemu",   specialty: "Cardiology",        years: 18 },
];


// ============================================================
// Read doctors from CMS bundle, or fall back
// ============================================================
function readDoctors(content?: Record<string, unknown>): DoctorEntry[] {
  if (!content) return FALLBACK_DOCTORS;

  const slugs = new Set<string>();
  for (const k of Object.keys(content)) {
    const m = k.match(/^doctors\.([^.]+)\./);
    if (m) slugs.add(m[1]);
  }
  if (slugs.size === 0) return FALLBACK_DOCTORS;

  const list: DoctorEntry[] = [];
  for (const slug of slugs) {
    const full_name = (content[`doctors.${slug}.name`] as string) ?? slug;
    if (full_name.includes("TODO: translate")) continue;
    list.push({
      slug,
      full_name,
      specialty: (content[`doctors.${slug}.specialty`] as string) ?? "",
      years: Number(content[`doctors.${slug}.years`] ?? 0),
    });
  }
  return list.length > 0 ? list : FALLBACK_DOCTORS;
}


// ============================================================
// Helpers
// ============================================================
function initialsOf(fullName: string): string {
  // "Dr. Selam Tesfaye" → "ST"
  const parts = fullName
    .replace(/^Dr\.?\s+/i, "")
    .trim()
    .split(/\s+/);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


// ============================================================
// Component
// ============================================================
interface Props {
  content?: Record<string, unknown>;
}


export function DoctorsGrid({ content }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const doctors = readDoctors(content);

  const columns = width >= 1100 ? 4 : width >= 800 ? 3 : width >= 500 ? 2 : 1;
  const gap = theme.spacing.base;

  return (
    <View style={styles.section}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.eyebrow}>Our team</Text>
            <Text style={styles.title}>{t("doctors.title")}</Text>
            <Text style={styles.subtitle}>{t("doctors.subtitle")}</Text>
          </View>
          <Pressable style={styles.seeAll}>
            <Text style={styles.seeAllText}>{t("common.seeAll")}</Text>
            <ArrowRight size={16} color={theme.colors.primary} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={[styles.grid, { gap }]}>
          {doctors.map((doc) => (
            <View
              key={doc.slug}
              style={[
                styles.card,
                { flexBasis: `calc(${100 / columns}% - ${gap}px)` as unknown as number },
              ]}
            >
              <View style={styles.avatarRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialsOf(doc.full_name)}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.specialty}>{doc.specialty}</Text>
                <Text style={styles.name}>{doc.full_name}</Text>
                {doc.years > 0 && (
                  <Text style={styles.years}>
                    {doc.years} {t("doctors.yearsShort")}
                  </Text>
                )}
              </View>

              <Pressable
                style={({ hovered }: any) => [
                  styles.bookBtn,
                  hovered && styles.bookBtnHover,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.bookBtnText}>
                  {t("doctors.bookWith")} {doc.full_name.split(" ").slice(-1)[0]}
                </Text>
                <ArrowRight size={14} color={theme.colors.primary} strokeWidth={2.2} />
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  section: {
    backgroundColor: theme.colors.bgSunken,
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
  headerLeft: { flexShrink: 1 },
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
    gap: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 240,
  },
  avatarRow: {
    alignItems: "flex-start",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 22,
    color: theme.colors.textInverse,
    letterSpacing: 0.5,
  },
  cardBody: {
    flexShrink: 1,
    gap: 2,
  },
  specialty: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: theme.colors.secondary,
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.2,
    color: theme.colors.text,
  },
  years: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  bookBtn: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  bookBtnHover: {
    opacity: 0.7,
  },
  bookBtnText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13.5,
    color: theme.colors.primary,
    letterSpacing: 0.2,
  },
});


export default DoctorsGrid;
