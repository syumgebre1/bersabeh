/**
 * Services + pricing editor.
 *
 * Each service has:
 *   services.{key}.name             — string
 *   services.{key}.description      — string
 *   services.{key}.price_range_etb  — object { min, max } in ETB
 *
 * Because price_range_etb is a nested object, we render two numeric inputs
 * and reassemble the object on save.
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


const SERVICES: { key: string; defaultName: string }[] = [
  { key: "consultation",            defaultName: "General Consultation" },
  { key: "specialist_consultation", defaultName: "Specialist Consultation" },
  { key: "lab_basic",               defaultName: "Basic Lab Panel" },
  { key: "ecg",                     defaultName: "ECG" },
  { key: "wound_dressing",          defaultName: "Wound Dressing" },
];

const CATEGORY: ContentCategory = "services";


interface Drafts {
  // keyed by "{serviceKey}.field"
  [fieldKey: string]: string;
}


export default function ServicesEditor() {
  const router = useRouter();
  const { data: bundle, isLoading, isError, refetch } = useContentBundle("en");
  const upsert = useUpsertContentBlock();

  const [drafts, setDrafts] = useState<Drafts>({});
  const [savingState, setSavingState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Init drafts
  useEffect(() => {
    if (!bundle?.content) return;
    const next: Drafts = {};
    for (const s of SERVICES) {
      next[`${s.key}.name`] = String(bundle.content[`services.${s.key}.name`] ?? "");
      next[`${s.key}.description`] = String(bundle.content[`services.${s.key}.description`] ?? "");
      const range = bundle.content[`services.${s.key}.price_range_etb`] as { min?: number; max?: number } | undefined;
      next[`${s.key}.min`] = range?.min !== undefined ? String(range.min) : "";
      next[`${s.key}.max`] = range?.max !== undefined ? String(range.max) : "";
    }
    setDrafts(next);
  }, [bundle]);

  // Dirty detection
  const dirtyFields = useMemo(() => {
    if (!bundle?.content) return [];
    const out: string[] = [];
    for (const s of SERVICES) {
      const origName = String(bundle.content[`services.${s.key}.name`] ?? "");
      const origDesc = String(bundle.content[`services.${s.key}.description`] ?? "");
      const range = bundle.content[`services.${s.key}.price_range_etb`] as { min?: number; max?: number } | undefined;
      const origMin = range?.min !== undefined ? String(range.min) : "";
      const origMax = range?.max !== undefined ? String(range.max) : "";

      if (drafts[`${s.key}.name`] !== origName) out.push(`${s.key}.name`);
      if (drafts[`${s.key}.description`] !== origDesc) out.push(`${s.key}.description`);
      if (drafts[`${s.key}.min`] !== origMin) out.push(`${s.key}.min`);
      if (drafts[`${s.key}.max`] !== origMax) out.push(`${s.key}.max`);
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
      for (const s of SERVICES) {
        const serviceChanged = dirtyFields.some((f) => f.startsWith(`${s.key}.`));
        if (!serviceChanged) continue;

        if (dirtyFields.includes(`${s.key}.name`)) {
          await upsert.mutateAsync({ key: `services.${s.key}.name`, locale: "en", value: drafts[`${s.key}.name`], category: CATEGORY, sort_order: 0 });
        }
        if (dirtyFields.includes(`${s.key}.description`)) {
          await upsert.mutateAsync({ key: `services.${s.key}.description`, locale: "en", value: drafts[`${s.key}.description`], category: CATEGORY, sort_order: 0 });
        }
        if (dirtyFields.includes(`${s.key}.min`) || dirtyFields.includes(`${s.key}.max`)) {
          await upsert.mutateAsync({
            key: `services.${s.key}.price_range_etb`,
            locale: "en",
            value: { min: Number(drafts[`${s.key}.min`] || 0), max: Number(drafts[`${s.key}.max`] || 0) },
            category: CATEGORY,
            sort_order: 0,
          });
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
          <Text style={styles.title}>Services & pricing</Text>
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
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      ) : isError || !bundle ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>Could not load services.</Text>
          <Button label="Retry" variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : (
        <View style={styles.list}>
          {SERVICES.map((s) => {
            const isDirty = dirtyFields.some((f) => f.startsWith(`${s.key}.`));
            return (
              <View key={s.key} style={[styles.card, isDirty && styles.cardDirty]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardKey}>{s.key}</Text>
                  {isDirty && <View style={styles.dirtyDot} />}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput value={drafts[`${s.key}.name`] ?? ""} onChangeText={(v) => handleChange(`${s.key}.name`, v)}
                    placeholder={s.defaultName} placeholderTextColor={theme.colors.mutedLight}
                    style={styles.input} />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput value={drafts[`${s.key}.description`] ?? ""} onChangeText={(v) => handleChange(`${s.key}.description`, v)}
                    placeholder="One-line description" placeholderTextColor={theme.colors.mutedLight}
                    multiline numberOfLines={2} style={[styles.input, styles.inputMultiline]} />
                </View>

                <View style={styles.row}>
                  <View style={[styles.field, styles.half]}>
                    <Text style={styles.label}>Price min (ETB)</Text>
                    <TextInput value={drafts[`${s.key}.min`] ?? ""} onChangeText={(v) => handleChange(`${s.key}.min`, v.replace(/[^0-9]/g, ""))}
                      placeholder="300" placeholderTextColor={theme.colors.mutedLight}
                      keyboardType="numeric" style={styles.input} />
                  </View>
                  <View style={[styles.field, styles.half]}>
                    <Text style={styles.label}>Price max (ETB)</Text>
                    <TextInput value={drafts[`${s.key}.max`] ?? ""} onChangeText={(v) => handleChange(`${s.key}.max`, v.replace(/[^0-9]/g, ""))}
                      placeholder="800" placeholderTextColor={theme.colors.mutedLight}
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
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
});
