/**
 * CMS hub — cards linking to each content editor.
 */

import {
  ArrowRight,
  Building2,
  ClipboardList,
  FlaskConical,
  Sparkles,
  Stethoscope,
  Wallet,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";


interface CardData {
  key: string;
  title: string;
  description: string;
  count: string;
  href: string;
  Icon: typeof Building2;
  accent: "primary" | "secondary" | "accent" | "success" | "info";
}

const CARDS: CardData[] = [
  {
    key: "clinic",
    title: "Clinic information",
    description: "Address, phones, hours, license, parking note",
    count: "11 blocks",
    href: "/(app)/admin/content/clinic",
    Icon: Building2,
    accent: "primary",
  },
  {
    key: "hero",
    title: "Landing page hero",
    description: "Headline, subheadline, CTA labels",
    count: "4 blocks",
    href: "/(app)/admin/content/hero",
    Icon: Sparkles,
    accent: "secondary",
  },
  {
    key: "departments",
    title: "Departments",
    description: "Names, descriptions, lucide icons, ordering",
    count: "8 departments",
    href: "/(app)/admin/content/departments",
    Icon: Stethoscope,
    accent: "accent",
  },
  {
    key: "services",
    title: "Services & pricing",
    description: "Service names + ETB price ranges",
    count: "5 services",
    href: "/(app)/admin/content/services",
    Icon: Wallet,
    accent: "success",
  },
  {
    key: "doctors",
    title: "Doctor profiles",
    description: "Specialty, years, bio, license number",
    count: "4 doctors",
    href: "/(app)/admin/content/doctors",
    Icon: ClipboardList,
    accent: "info",
  },
  {
    key: "about",
    title: "About the clinic",
    description: "Mission, history, facilities",
    count: "0 blocks",
    href: "/(app)/admin/content/about",
    Icon: FlaskConical,
    accent: "primary",
  },
];


function accentBg(a: CardData["accent"]) {
  switch (a) {
    case "secondary": return theme.colors.secondary;
    case "accent":    return theme.colors.accent;
    case "success":   return theme.colors.success;
    case "info":      return theme.colors.info;
    default:          return theme.colors.primary;
  }
}

function accentFg(a: CardData["accent"]) {
  return a === "accent" ? theme.colors.text : theme.colors.textInverse;
}


export default function ContentHub() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = width >= 1200 ? 3 : width >= 800 ? 2 : 1;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Admin CMS</Text>
        <Text style={styles.title}>Content editor</Text>
        <Text style={styles.subtitle}>
          Edit everything the public sees — without touching code. Changes
          are reflected on the landing page immediately.
        </Text>
      </View>

      <View style={styles.grid}>
        {CARDS.map((c) => {
          const bg = accentBg(c.accent);
          const fg = accentFg(c.accent);
          return (
            <Pressable
              key={c.key}
              onPress={() => router.push(c.href as any)}
              style={({ hovered }: any) => [
                styles.card,
                { flexBasis: `calc(${100 / columns}% - ${theme.spacing.base}px)` as unknown as number },
                hovered && styles.cardHover,
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                <c.Icon size={20} color={fg} strokeWidth={2.2} />
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {c.description}
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.cardCount}>{c.count}</Text>
                <ArrowRight size={14} color={theme.colors.primary} strokeWidth={2.2} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: {
    padding: theme.spacing.xxl,
    gap: theme.spacing.xxl,
    maxWidth: 1300,
    width: "100%",
    alignSelf: "center",
  },
  header: { gap: theme.spacing.xs },
  eyebrow: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 12,
    letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary,
  },
  title: {
    fontFamily: theme.fontFamily.heading, fontSize: 32,
    letterSpacing: -0.6, color: theme.colors.text, marginTop: theme.spacing.xs,
  },
  subtitle: {
    fontFamily: theme.fontFamily.body, fontSize: 15,
    lineHeight: 22, color: theme.colors.muted, maxWidth: 620,
    marginTop: theme.spacing.sm,
  },
  grid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: theme.spacing.base,
  },
  card: {
    minHeight: 200,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.base,
    justifyContent: "space-between",
  },
  cardHover: { borderColor: theme.colors.primary },
  iconWrap: {
    width: 44, height: 44, borderRadius: theme.radius.sm,
    alignItems: "center", justifyContent: "center",
  },
  cardBody: { flex: 1, gap: theme.spacing.xs },
  cardTitle: {
    fontFamily: theme.fontFamily.headingMedium, fontSize: 17,
    color: theme.colors.text,
  },
  cardDesc: {
    fontFamily: theme.fontFamily.body, fontSize: 13.5,
    lineHeight: 19, color: theme.colors.muted,
  },
  cardFooter: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  cardCount: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5,
    color: theme.colors.muted, letterSpacing: 0.2,
  },
});
