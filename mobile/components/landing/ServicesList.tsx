/**
 * ServicesList — services + pricing table.
 *
 * Reads from the CMS bundle if available, falls back to seed values from
 * clinic_config.SERVICES_SEED. Prices are in ETB (Ethiopian Birr).
 */

import { ArrowRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/constants/theme";


interface ServiceEntry {
  key: string;
  name: string;
  description: string;
  min: number;
  max: number;
}

const FALLBACK_SERVICES: ServiceEntry[] = [
  { key: "consultation",            name: "General Consultation",    description: "Initial or follow-up visit with a physician.",           min: 300, max: 800  },
  { key: "specialist_consultation", name: "Specialist Consultation", description: "Visit with a specialist physician.",                     min: 600, max: 1500 },
  { key: "lab_basic",               name: "Basic Lab Panel",         description: "CBC, blood chemistry, urinalysis.",                      min: 400, max: 1200 },
  { key: "ecg",                     name: "ECG",                     description: "12-lead electrocardiogram with interpretation.",         min: 500, max: 900  },
  { key: "wound_dressing",          name: "Wound Dressing",          description: "Cleaning, dressing, and follow-up assessment.",          min: 200, max: 600  },
];


function readServices(content?: Record<string, unknown>): ServiceEntry[] {
  if (!content) return FALLBACK_SERVICES;

  const keys = new Set<string>();
  for (const k of Object.keys(content)) {
    const m = k.match(/^services\.([^.]+)\./);
    if (m) keys.add(m[1]);
  }
  if (keys.size === 0) return FALLBACK_SERVICES;

  const list: ServiceEntry[] = [];
  for (const key of keys) {
    const name = (content[`services.${key}.name`] as string) ?? key;
    if (name.includes("TODO: translate")) continue;
    const rangeObj = content[`services.${key}.price_range_etb`] as { min?: number; max?: number } | undefined;
    list.push({
      key,
      name,
      description: (content[`services.${key}.description`] as string) ?? "",
      min: Number(rangeObj?.min ?? 0),
      max: Number(rangeObj?.max ?? 0),
    });
  }
  return list.length > 0 ? list : FALLBACK_SERVICES;
}


interface Props {
  content?: Record<string, unknown>;
}


export function ServicesList({ content }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  const services = readServices(content);

  return (
    <View style={styles.section}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Pricing</Text>
          <Text style={styles.title}>{t("services.title")}</Text>
          <Text style={styles.subtitle}>{t("services.subtitle")}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableHeader, !isWide && styles.tableHeaderCompact]}>
            <Text style={[styles.tableHeaderText, styles.colService]}>Service</Text>
            {isWide && <Text style={[styles.tableHeaderText, styles.colPrice]}>Price (ETB)</Text>}
          </View>

          {services.map((svc, idx) => (
            <Pressable
              key={svc.key}
              style={({ hovered }: any) => [
                styles.row,
                idx === services.length - 1 && styles.rowLast,
                hovered && styles.rowHover,
              ]}
            >
              <View style={[styles.serviceCol, isWide && styles.colService]}>
                <Text style={styles.serviceName}>{svc.name}</Text>
                {svc.description ? (
                  <Text style={styles.serviceDesc} numberOfLines={2}>
                    {svc.description}
                  </Text>
                ) : null}
              </View>

              <View style={[styles.priceCol, isWide && styles.colPrice]}>
                <Text style={styles.pricePrefix}>{t("services.rangePrefix")}</Text>
                <Text style={styles.priceValue}>
                  {svc.min} – {svc.max}
                  {!isWide ? " ETB" : ""}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.footer}>
          <Text style={styles.footerText}>See all services & insurance options</Text>
          <ArrowRight size={16} color={theme.colors.primary} strokeWidth={2} />
        </Pressable>
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
    marginBottom: theme.spacing.xxl,
    maxWidth: 620,
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
  },
  table: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tableHeaderCompact: {
    // no-op for now
  },
  tableHeaderText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: theme.colors.muted,
  },
  colService: {
    flex: 1,
  },
  colPrice: {
    width: 180,
    textAlign: "right",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.base,
  },
  rowHover: {
    backgroundColor: "rgba(42, 42, 114, 0.03)",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  serviceCol: {
    flex: 1,
    flexShrink: 1,
  },
  serviceName: {
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 2,
  },
  serviceDesc: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: theme.colors.muted,
  },
  priceCol: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.spacing.xs,
    justifyContent: "flex-end",
  },
  pricePrefix: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.muted,
  },
  priceValue: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 17,
    color: theme.colors.secondary,
    letterSpacing: -0.2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    alignSelf: "flex-start",
    marginTop: theme.spacing.lg,
  },
  footerText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14,
    color: theme.colors.primary,
    letterSpacing: 0.2,
  },
});


export default ServicesList;
