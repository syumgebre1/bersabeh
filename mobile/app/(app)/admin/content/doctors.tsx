/**
 * Doctor profile editor.
 *
 * Each doctor has:
 *   doctors.{slug}.name       — full name
 *   doctors.{slug}.specialty  — e.g. "Cardiology"
 *   doctors.{slug}.years      — years of experience (number)
 */

import { ArrowLeft, Check, Save } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { useContentBundle, useUpsertContentBlock, type ContentCategory } from "@/lib/admin";
import { theme } from "@/constants/theme";


const DOCTORS: { slug: string; defaultName: string }[] = [
  { slug: "selam-tesfaye", defaultName: "Dr. Selam Tesfaye" },
  { slug: "dawit-bekele",  defaultName: "Dr. Dawit Bekele" },
  { slug: "hana-girma",    defaultName: "Dr. Hana Girma" },
  { slug: "yonas-alemu",   defaultName: "Dr. Yonas Alemu" },
];

const CATEGORY: ContentCategory = "doctors";


interface Drafts { [fieldKey: string]: string }


export default function DoctorsEditor() {
  const router = useRouter();
  const { data: bundle, isLoading, isError, refetch } = useContentBundle("en");
  const upsert = useUpsertContentBlock();

  const [drafts, setDrafts] = useState<Drafts>({});
  const [savingState, setSavingState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!bundle?.content) return;
    const next: Drafts = {};
    for (const d of DOCTORS) {
      next[`${d.slug}.name`]      = String(bundle.content[`doctors.${d.slug}.name`]      ?? d.defaultName);
      next[`${d.slug}.specialty`] = String(bundle.content[`doctors.${d.slug}.specialty`] ?? "");
      next[`${d.slug}.years`]     = String(bundle.content[`doctors.${d.slug}.years`]     ?? "");
    }
    setDrafts(next);
  }, [bundle]);

  const dirtyFields = useMemo(() => {
    if (!bundle?.content) return [];
    const out: string[] = [];
    for (const d of DOCTORS) {
      const origName = String(bundle.content[`doctors.${d.slug}.name`] ?? d.defaultName);
      const origSpec = String(bundle.content[`doctors.${d.slug}.specialty`] ?? "");
      const origYears = String(bundle.content[`doctors.${d.slug}.years`] ?? "");

      if (drafts[`${d.slug}.name`]      !== origName)  out.push(`${d.slug}.name`);
      if (drafts[`${d.slug}.specialty`] !== origSpec)  out.push(`${d.slug}.specialty`);
      if (drafts[`${d.slug}.years`]     !== origYears) out.push(`${d.slug}.years`);
    }
    return out;
  }, [bundle, drafts]);

  const hasChanges = dirtyFields.length > 0;

  const handleChange = (fieldKey: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [fieldKey]: value }));
    if (savingState === "success") setSavingState("idle");
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setSavingState("saving");
    setErrorMessage(null);
    try {
      for (const d of DOCTORS) {
        if (dirtyFields.includes(`${d.slug}.name`)) {
          await upsert.mutateAsync({ key: `doctors.${d.slug}.name`, locale: "en", value: drafts[`${d.slug}.name`], category: CATEGORY, sort_order: 0 });
        }
        if (dirtyFields.includes(`${d.slug}.specialty`)) {
          await upsert.mutateAsync({ key: `doctors.${d.slug}.specialty`, locale: "en", value: drafts[`${d.slug}.specialty`], category: CATEGORY, sort_order: 0 });
        }
        if (dirtyFields.includes(`${d.slug}.years`)) {
          await upsert.mutateAsync({ key: `doctors.${d.slug}.years`, locale: "en", value: Number(drafts[`${d.slug}.years`] || 0), category: CATEGORY, sort_order: 0 });
        }
      }
      setSavingState("success");
    } catch (err) {
      setSavingState("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>CMS</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>Content editor</Text>
          <Text style={styles.title}>Doctor profiles</Text>
        </View>
        <View style={styles.topBarActions}>
          {hasChanges ? (
            <View style={styles.dirtyPill}><Text style={styles.dirtyPillText}>{dirtyFields.length} unsaved</Text></View>
          ) : savingState === "success" ? (
            <View style={[styles.dirtyPill, styles.savedPill]}>
              <Check size={12} color={theme.colors.success} strokeWidth={2.6} />
              <Text style={[styles.dirtyPillText, styles.savedPillText]}>Saved</Text>
            </View>
          ) : null}
          <Button label="Save changes" variant="primary" size="sm" onPress={handleSave}
            disabled={!hasChanges || savingState === "saving"}
            loading={savingState === "saving"}
            leftIcon={<Save size={14} color={theme.colors.textInverse} strokeWidth={2.2} />} />
        </View>
      </View>

      {savingState === "error" && errorMessage ? (
        <View style={styles.errorBanner}><Text style={styles.errorText}>{errorMessage}</Text></View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading doctors...</Text>
        </View>
      ) : isError || !bundle ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>Could not load doctors.</Text>
          <Button label="Retry" variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : (
        <View style={styles.list}>
          {DOCTORS.map((d) => {
            const isDirty = dirtyFields.some((f) => f.startsWith(`${d.slug}.`));
            return (
              <View key={d.slug} style={[styles.card, isDirty && styles.cardDirty]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardKey}>{d.slug}</Text>
                  {isDirty && <View style={styles.dirtyDot} />}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Full name</Text>
                  <TextInput value={drafts[`${d.slug}.name`] ?? ""} onChangeText={(v) => handleChange(`${d.slug}.name`, v)}
                    placeholder={d.defaultName} placeholderTextColor={theme.colors.mutedLight}
                    style={styles.input} />
                </View>

                <View style={styles.row}>
                  <View style={[styles.field, styles.half]}>
                    <Text style={styles.label}>Specialty</Text>
                    <TextInput value={drafts[`${d.slug}.specialty`] ?? ""} onChangeText={(v) => handleChange(`${d.slug}.specialty`, v)}
                      placeholder="Cardiology" placeholderTextColor={theme.colors.mutedLight}
                      style={styles.input} />
                  </View>
                  <View style={[styles.field, styles.half]}>
                    <Text style={styles.label}>Years of experience</Text>
                    <TextInput value={drafts[`${d.slug}.years`] ?? ""} onChangeText={(v) => handleChange(`${d.slug}.years`, v.replace(/[^0-9]/g, ""))}
                      placeholder="12" placeholderTextColor={theme.colors.mutedLight}
                      keyboardType="numeric" style={styles.input} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 900, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  dirtyPill: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, backgroundColor: theme.colors.warningBg, borderRadius: theme.radius.full },
  dirtyPillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, color: theme.colors.warning },
  savedPill: { backgroundColor: theme.colors.successBg, flexDirection: "row", alignItems: "center", gap: 4 },
  savedPillText: { color: theme.colors.success },
  errorBanner: { backgroundColor: theme.colors.dangerBg, padding: theme.spacing.md, borderRadius: theme.radius.md },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  loadingWrap: { alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.huge, gap: theme.spacing.md },
  loadingText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  list: { gap: theme.spacing.base },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg, gap: theme.spacing.md },
  cardDirty: { borderColor: theme.colors.warning },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingBottom: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  cardKey: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: theme.colors.muted, flex: 1 },
  dirtyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.warning },
  row: { flexDirection: "row", gap: theme.spacing.md },
  half: { flex: 1 },
  field: { gap: theme.spacing.xs },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 2, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.bg },
});
