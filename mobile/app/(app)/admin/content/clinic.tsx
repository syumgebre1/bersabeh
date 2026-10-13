/**
 * Clinic information editor.
 *
 * Data source: the public content bundle (`GET /content?locale=en`).
 * Saving: POST /content (upsert) for each changed field.
 */

import { ArrowLeft, Check, Save } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import {
  useContentBundle,
  useUpsertContentBlock,
  type ContentCategory,
} from "@/lib/admin";
import { theme } from "@/constants/theme";


interface FieldMeta {
  key: string;
  label: string;
  placeholder: string;
  keyboardType?: "default" | "phone-pad" | "email-address";
  multiline?: boolean;
}

const CLINIC_FIELDS: FieldMeta[] = [
  { key: "clinic_info.name",              label: "Clinic name",        placeholder: "Bersabeh Clinic" },
  { key: "clinic_info.neighborhood",      label: "Neighborhood",       placeholder: "Bole" },
  { key: "clinic_info.address.full",      label: "Full address",       placeholder: "Bole Road, ...", multiline: true },
  { key: "clinic_info.landmark",          label: "Landmark",           placeholder: "Opposite Getu Commercial Center" },
  { key: "clinic_info.phones.emergency",  label: "Emergency phone",    placeholder: "+251 11 555 0199", keyboardType: "phone-pad" },
  { key: "clinic_info.phones.reception",  label: "Reception phone",    placeholder: "+251 11 555 0177", keyboardType: "phone-pad" },
  { key: "clinic_info.email",             label: "Email",              placeholder: "info@bersabehclinic.com", keyboardType: "email-address" },
  { key: "clinic_info.hours.weekday",     label: "Weekday hours",      placeholder: "Mon-Sat 08:00-20:00" },
  { key: "clinic_info.hours.weekend",     label: "Weekend hours",      placeholder: "Sun 09:00-13:00" },
  { key: "clinic_info.license_number",    label: "MoH license number", placeholder: "MoH/AA/CL/2009/0421" },
  { key: "clinic_info.parking_note",      label: "Parking note",       placeholder: "Street parking available." },
];

const CLINIC_CATEGORY: ContentCategory = "clinic_info";


export default function ClinicInfoEditor() {
  const router = useRouter();
  const { data: bundle, isLoading, isError, refetch } = useContentBundle("en");
  const upsert = useUpsertContentBlock();

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingState, setSavingState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (bundle?.content) {
      const next: Record<string, string> = {};
      for (const f of CLINIC_FIELDS) {
        next[f.key] = String(bundle.content[f.key] ?? "");
      }
      setDrafts(next);
    }
  }, [bundle]);

  const dirtyKeys = useMemo(() => {
    if (!bundle?.content) return [];
    return CLINIC_FIELDS
      .map((f) => f.key)
      .filter((k) => drafts[k] !== String(bundle.content[k] ?? ""));
  }, [bundle, drafts]);

  const hasChanges = dirtyKeys.length > 0;

  const handleChange = (key: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
    if (savingState === "success") setSavingState("idle");
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setSavingState("saving");
    setErrorMessage(null);
    try {
      for (const key of dirtyKeys) {
        await upsert.mutateAsync({
          key,
          locale: "en",
          value: drafts[key],
          category: CLINIC_CATEGORY,
          sort_order: 0,
        });
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
          <Text style={styles.title}>Clinic information</Text>
        </View>

        <View style={styles.topBarActions}>
          {hasChanges ? (
            <View style={styles.dirtyPill}>
              <Text style={styles.dirtyPillText}>
                {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? "" : "s"}
              </Text>
            </View>
          ) : savingState === "success" ? (
            <View style={[styles.dirtyPill, styles.savedPill]}>
              <Check size={12} color={theme.colors.success} strokeWidth={2.6} />
              <Text style={[styles.dirtyPillText, styles.savedPillText]}>Saved</Text>
            </View>
          ) : null}

          <Button
            label="Save changes"
            variant="primary"
            size="sm"
            onPress={handleSave}
            disabled={!hasChanges || savingState === "saving"}
            loading={savingState === "saving"}
            leftIcon={<Save size={14} color={theme.colors.textInverse} strokeWidth={2.2} />}
          />
        </View>
      </View>

      {savingState === "error" && errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading clinic info...</Text>
        </View>
      ) : isError || !bundle ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>Could not load clinic information.</Text>
          <Button label="Retry" variant="outline" size="sm" onPress={() => refetch()} />
        </View>
      ) : (
        <View style={styles.formCard}>
          <Text style={styles.formHint}>
            These values override the defaults in the mobile + backend config.
            Changes go live on the landing page immediately.
          </Text>

          {CLINIC_FIELDS.map((f) => {
            const isDirty = dirtyKeys.includes(f.key);
            return (
              <View key={f.key} style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{f.label}</Text>
                  {isDirty && <View style={styles.dirtyDot} />}
                </View>
                <TextInput
                  value={drafts[f.key] ?? ""}
                  onChangeText={(v) => handleChange(f.key, v)}
                  placeholder={f.placeholder}
                  placeholderTextColor={theme.colors.mutedLight}
                  keyboardType={f.keyboardType ?? "default"}
                  multiline={f.multiline}
                  numberOfLines={f.multiline ? 3 : 1}
                  style={[styles.input, f.multiline && styles.inputMultiline]}
                />
                <Text style={styles.keyHint}>{f.key}</Text>
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
  content: {
    padding: theme.spacing.xxl,
    gap: theme.spacing.xl,
    maxWidth: 900, width: "100%", alignSelf: "center",
  },
  topBar: {
    flexDirection: "row", alignItems: "center",
    gap: theme.spacing.lg, flexWrap: "wrap",
  },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  backText: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text,
  },
  topBarMeta: { flex: 1, minWidth: 200 },
  eyebrow: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 11,
    letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary,
  },
  title: {
    fontFamily: theme.fontFamily.heading, fontSize: 28,
    letterSpacing: -0.5, color: theme.colors.text, marginTop: 2,
  },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  dirtyPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: theme.spacing.md, paddingVertical: 6,
    backgroundColor: theme.colors.warningBg, borderRadius: theme.radius.full,
  },
  dirtyPillText: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, color: theme.colors.warning,
  },
  savedPill: { backgroundColor: theme.colors.successBg },
  savedPillText: { color: theme.colors.success },
  errorBanner: {
    backgroundColor: theme.colors.dangerBg,
    padding: theme.spacing.md, borderRadius: theme.radius.md,
  },
  errorText: {
    fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger,
  },
  loadingWrap: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: theme.spacing.huge, gap: theme.spacing.md,
  },
  loadingText: {
    fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: theme.spacing.xl, gap: theme.spacing.lg,
  },
  formHint: {
    fontFamily: theme.fontFamily.body, fontSize: 13,
    lineHeight: 19, color: theme.colors.muted,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  field: { gap: theme.spacing.xs },
  labelRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs },
  label: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 12,
    letterSpacing: 1, textTransform: "uppercase", color: theme.colors.muted,
  },
  dirtyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.warning },
  input: {
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md,
    fontFamily: theme.fontFamily.body, fontSize: 15,
    color: theme.colors.text, backgroundColor: theme.colors.bg,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  keyHint: {
    fontFamily: theme.fontFamily.body, fontSize: 11,
    color: theme.colors.mutedLight, letterSpacing: 0.2, marginTop: 2,
  },
});
