/**
 * DoctorsGrid — 4 doctors with "Book with" buttons.
 */

import { ArrowRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";


interface Doctor {
  slug: string;
  name: string;
  specialty: string;
  years: number;
  initials: string;
}


const SEED: Doctor[] = [
  { slug: "selam-tesfaye", name: "Dr. Selam Tesfaye", specialty: "Internal Medicine", years: 12, initials: "ST" },
  { slug: "dawit-bekele",  name: "Dr. Dawit Bekele",  specialty: "General Surgery",   years: 15, initials: "DB" },
  { slug: "hana-girma",    name: "Dr. Hana Girma",    specialty: "Gastroenterology",  years: 9,  initials: "HG" },
  { slug: "yonas-alemu",   name: "Dr. Yonas Alemu",   specialty: "Cardiology",        years: 18, initials: "YA" },
];


export function DoctorsGrid() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = width >= 1200 ? 4 : width >= 800 ? 2 : 1;

  return (
    <View style={styles.section} nativeID="doctors">
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t("header.doctors")}</Text>
          <Text style={styles.title}>{t("doctors.title")}</Text>
          <Text style={styles.subtitle}>{t("doctors.subtitle")}</Text>
        </View>

        <View style={styles.grid}>
          {SEED.map((d) => (
            <View
              key={d.slug}
              style={[
                styles.card,
                { flexBasis: `calc(${100 / columns}% - ${theme.spacing.base}px)` as unknown as number },
              ]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{d.initials}</Text>
              </View>
              <Text style={styles.name}>{d.name}</Text>
              <Text style={styles.specialty}>{d.specialty}</Text>
              <Text style={styles.years}>
                {d.years} {t("doctors.yearsShort")}
              </Text>

              <Pressable
                onPress={() => router.push(`/(auth)/register?doctor=${d.slug}` as any)}
                style={({ hovered }: any) => [styles.bookBtn, hovered && styles.bookBtnHover]}
              >
                <Text style={styles.bookBtnText}>{t("header.bookAppointment")}</Text>
                <ArrowRight size={14} color={theme.colors.textInverse} strokeWidth={2.4} />
              </Pressable>
            </View>
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
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 40, lineHeight: 46, letterSpacing: -0.8, color: theme.colors.text },
  subtitle: { fontFamily: theme.fontFamily.body, fontSize: 15, color: theme.colors.muted, marginTop: theme.spacing.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.base },
  card: { minWidth: 220, backgroundColor: theme.colors.bg, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg, gap: theme.spacing.xs, alignItems: "center" },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primaryDark, alignItems: "center", justifyContent: "center", marginBottom: theme.spacing.sm },
  avatarText: { fontFamily: theme.fontFamily.heading, fontSize: 18, color: theme.colors.textInverse, letterSpacing: -0.3 },
  name: { fontFamily: theme.fontFamily.headingMedium, fontSize: 15, color: theme.colors.text, textAlign: "center" },
  specialty: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.secondary, textAlign: "center" },
  years: { fontFamily: theme.fontFamily.body, fontSize: 12, color: theme.colors.muted, marginTop: theme.spacing.xs },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.md,
    cursor: "pointer" as any,
  },
  bookBtnHover: { opacity: 0.9 },
  bookBtnText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 12.5, color: theme.colors.textInverse },
});


export default DoctorsGrid;
