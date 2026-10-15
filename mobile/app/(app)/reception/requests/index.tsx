/**
 * Reception: Booking requests — review + convert to appointments.
 */

import { ArrowLeft, ArrowRight, CalendarPlus, Inbox, Phone, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { ConvertRequestModal } from "@/components/app/ConvertRequestModal";
import { useBookingRequests, type BookingRequestRead } from "@/lib/public";
import { theme } from "@/constants/theme";


type FilterKey = "all" | "new" | "contacted" | "converted";


export default function BookingRequestsList() {
  const { t } = useTranslation();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("new");
  const [converting, setConverting] = useState<BookingRequestRead | null>(null);

  const { data: requests, isLoading, isError, refetch } = useBookingRequests(
    filter === "all" ? undefined : filter,
  );

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "new",       label: t("requests.filterNew") },
    { key: "contacted", label: t("requests.filterContacted") },
    { key: "converted", label: t("requests.filterConverted") },
    { key: "all",       label: t("superAdmin.all") },
  ];

  const statusChip = (status: string) => {
    switch (status) {
      case "new":       return { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: t("requests.statusNew") };
      case "contacted": return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: t("requests.statusContacted") };
      case "converted": return { bg: theme.colors.successBg, fg: theme.colors.success, label: t("requests.statusConverted") };
      case "cancelled": return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: t("requests.statusCancelled") };
      default:          return { bg: theme.colors.bgSunken,  fg: theme.colors.muted,   label: status };
    }
  };

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
            <Text style={styles.backText}>{t("reception.roleName")}</Text>
          </Pressable>
          <View style={styles.topBarMeta}>
            <Text style={styles.eyebrow}>{t("requests.eyebrow")}</Text>
            <Text style={styles.title}>{t("requests.title")}</Text>
          </View>
          <Text style={styles.count}>{requests?.length ?? 0}</Text>
        </View>

        <View style={styles.pillRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.pill, filter === f.key && styles.pillActive]}
            >
              <Text style={[styles.pillText, filter === f.key && styles.pillTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{t("common.error")}</Text>
            <Button label={t("common.retry")} variant="outline" size="sm" onPress={() => refetch()} />
          </View>
        ) : !requests || requests.length === 0 ? (
          <View style={styles.center}>
            <Inbox size={32} color={theme.colors.muted} strokeWidth={1.6} />
            <Text style={styles.mutedText}>{t("requests.noRequests")}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {requests.map((r, idx) => {
              const c = statusChip(r.status);
              return (
                <View
                  key={r.id}
                  style={[styles.row, idx < requests.length - 1 && styles.rowBorder]}
                >
                  <View style={styles.rowContent}>
                    <View style={styles.titleRow}>
                      <Text style={styles.name}>{r.full_name}</Text>
                      <View style={[styles.chip, { backgroundColor: c.bg }]}>
                        <Text style={[styles.chipText, { color: c.fg }]}>{c.label}</Text>
                      </View>
                    </View>
                    <View style={styles.metaRow}>
                      <Phone size={11} color={theme.colors.muted} strokeWidth={2} />
                      <Text style={styles.meta}>{r.phone}</Text>
                      {r.preferred_at ? (
                        <>
                          <Text style={styles.sep}>·</Text>
                          <Text style={styles.meta}>
                            {new Date(r.preferred_at).toLocaleString([], {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </Text>
                        </>
                      ) : null}
                    </View>
                    {r.reason ? (
                      <Text style={styles.reason} numberOfLines={2}>{r.reason}</Text>
                    ) : null}
                  </View>
                  {r.status !== "converted" && r.status !== "cancelled" ? (
                    <Pressable
                      onPress={() => setConverting(r)}
                      style={({ hovered }: any) => [styles.convertBtn, hovered && styles.convertBtnHover]}
                    >
                      <CalendarPlus size={13} color={theme.colors.textInverse} strokeWidth={2.4} />
                      <Text style={styles.convertBtnText}>{t("requests.convert")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {converting ? (
        <ConvertRequestModal
          request={converting}
          onClose={() => setConverting(null)}
          onConverted={() => {
            setConverting(null);
            refetch();
          }}
        />
      ) : null}
    </>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.lg, maxWidth: 1100, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  count: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
  pill: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.radius.full, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, cursor: "pointer" as any },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.text },
  pillTextActive: { color: theme.colors.textInverse },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowContent: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, flexWrap: "wrap" },
  name: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 15, color: theme.colors.text },
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  meta: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted },
  sep: { color: theme.colors.mutedLight, marginHorizontal: 2 },
  reason: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.text, marginTop: 4, lineHeight: 18 },
  convertBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, cursor: "pointer" as any },
  convertBtnHover: { opacity: 0.9 },
  convertBtnText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.textInverse },
});
