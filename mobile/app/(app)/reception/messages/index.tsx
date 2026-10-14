/**
 * Reception: Message threads list — trilingual.
 */

import { ArrowLeft, ArrowRight, MessageSquare } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { useThreads } from "@/lib/admin";
import { theme } from "@/constants/theme";


export default function ReceptionMessages() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: threads, isLoading, isError, refetch } = useThreads();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>{t("reception.eyebrow")}</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>{t("reception.messages.title")}</Text>
          <Text style={styles.title}>{t("reception.messages.title")}</Text>
        </View>
        <Text style={styles.count}>{threads?.length ?? 0}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="small" color={theme.colors.primary} /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{t("common.error")}</Text>
          <Button label={t("common.retry")} variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : !threads || threads.length === 0 ? (
        <View style={styles.center}>
          <MessageSquare size={32} color={theme.colors.muted} strokeWidth={1.6} />
          <Text style={styles.mutedText}>{t("reception.messages.noThreads")}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {threads.map((th, idx) => {
            const others = (th.participants ?? []).filter((p) => p.role !== "reception");
            const otherName = others[0]?.full_name ?? t("patient.prescriptions.yourDoctor");
            const otherRole = others[0]?.role ?? "";
            return (
              <Pressable
                key={th.id}
                onPress={() => router.push(`/(app)/reception/messages/${th.id}` as any)}
                style={({ hovered }: any) => [
                  styles.row, idx < threads.length - 1 && styles.rowBorder, hovered && styles.rowHover,
                ]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {otherName.replace(/^Dr\.?\s+/i, "").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
                  </Text>
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{otherName}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {otherRole ? `[${otherRole}] ` : ""}
                    {th.subject ?? t("patient.messages.caseDiscussion")}
                  </Text>
                </View>
                <ArrowRight size={14} color={theme.colors.muted} strokeWidth={2} />
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.lg, maxWidth: 1000, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  count: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, cursor: "pointer" as any },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowHover: { backgroundColor: "rgba(42,42,114,0.02)" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: theme.colors.textInverse, letterSpacing: 0.3 },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14.5, color: theme.colors.text },
  rowSub: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, marginTop: 3 },
});
