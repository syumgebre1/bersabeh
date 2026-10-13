/**
 * Lab: Order detail — shows info and, if pending, an "Enter result" form.
 */

import { ArrowLeft, Download, FlaskConical, Save } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { downloadAuthenticatedPdf } from "@/lib/download";
import { theme } from "@/constants/theme";


interface LabOrderDetail {
  id: string;
  encounter_id: string;
  patient_id: string;
  test_name: string;
  clinical_notes: string | null;
  status: string;
  priority: string;
  ordered_at: string;
  ordered_by: { full_name: string };
  result: {
    result_type: string;
    value_numeric: number | null;
    value_text: string | null;
    value_image_url: string | null;
    units: string | null;
    reference_range: string | null;
    interpretation: string | null;
    notes: string | null;
    resulted_at: string;
    resulted_by: { full_name: string };
  } | null;
}


function statusChip(s: string) {
  switch (s) {
    case "completed":   return { bg: theme.colors.successBg, fg: theme.colors.success, label: "Ready" };
    case "in_progress": return { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: "In progress" };
    case "cancelled":   return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: "Cancelled" };
    default:            return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: "Pending" };
  }
}


export default function LabOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["lab-order", id],
    queryFn: () => apiFetch<LabOrderDetail>(`/api/v1/labs/${id}`),
    enabled: !!id,
  });

  // Form state
  const [resultType, setResultType] = useState<"numeric" | "text" | "image">("numeric");
  const [valueNumeric, setValueNumeric] = useState("");
  const [valueText, setValueText] = useState("");
  const [units, setUnits] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveResult = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        result_type: resultType,
        units: units || null,
        reference_range: referenceRange || null,
        interpretation: interpretation || null,
        notes: notes || null,
      };
      if (resultType === "numeric") payload.value_numeric = Number(valueNumeric);
      if (resultType === "text") payload.value_text = valueText;

      await apiFetch(`/api/v1/labs/${id}/result`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await refetch();
      qc.invalidateQueries({ queryKey: ["lab-orders"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    try {
      await downloadAuthenticatedPdf(`/api/v1/labs/${id}/pdf`, `lab-report-${id}.pdf`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load lab order.</Text>
        <Button label="Retry" variant="outline" size="sm" onPress={() => refetch()} />
      </View>
    );
  }

  const chip = statusChip(order.status);
  const result = order.result;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>Lab orders</Text>
        </Pressable>
        <View style={[styles.chip, { backgroundColor: chip.bg }]}>
          <Text style={[styles.chipText, { color: chip.fg }]}>{chip.label}</Text>
        </View>
      </View>

      <View style={styles.headerCard}>
        <View style={styles.headerIcon}>
          <FlaskConical size={22} color={theme.colors.textInverse} strokeWidth={2.2} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.testName}>{order.test_name}</Text>
          <Text style={styles.testMeta}>
            Ordered by {order.ordered_by?.full_name} ·{" "}
            {new Date(order.ordered_at).toLocaleString([], {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </Text>
          <Text style={styles.priorityBadge}>{order.priority.toUpperCase()}</Text>
        </View>
      </View>

      {order.clinical_notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinical notes from doctor</Text>
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>{order.clinical_notes}</Text>
          </View>
        </View>
      ) : null}

      {/* Enter result form (only when pending) */}
      {!result && order.status !== "cancelled" ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enter result</Text>
          <View style={styles.formCard}>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Result type</Text>
            <View style={styles.typeRow}>
              {(["numeric", "text", "image"] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setResultType(t)}
                  style={[styles.typeChoice, resultType === t && styles.typeChoiceActive]}
                >
                  <Text style={[styles.typeChoiceText, resultType === t && styles.typeChoiceTextActive]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            {resultType === "numeric" ? (
              <>
                <Text style={styles.label}>Value</Text>
                <TextInput
                  value={valueNumeric}
                  onChangeText={(v) => setValueNumeric(v.replace(/[^0-9.]/g, ""))}
                  placeholder="7.8"
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.colors.mutedLight}
                  style={styles.input}
                />
                <Text style={styles.label}>Units</Text>
                <TextInput
                  value={units}
                  onChangeText={setUnits}
                  placeholder="10³/µL"
                  placeholderTextColor={theme.colors.mutedLight}
                  style={styles.input}
                />
              </>
            ) : null}

            {resultType === "text" ? (
              <>
                <Text style={styles.label}>Text result</Text>
                <TextInput
                  value={valueText}
                  onChangeText={setValueText}
                  placeholder="No bacterial growth after 48h"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={theme.colors.mutedLight}
                  style={[styles.input, styles.inputMultiline]}
                />
              </>
            ) : null}

            <Text style={styles.label}>Reference range (optional)</Text>
            <TextInput
              value={referenceRange}
              onChangeText={setReferenceRange}
              placeholder="4.0 - 11.0"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />

            <Text style={styles.label}>Interpretation (optional)</Text>
            <TextInput
              value={interpretation}
              onChangeText={setInterpretation}
              placeholder="Within normal limits"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />

            <Text style={styles.label}>Lab notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Sample quality acceptable"
              multiline
              numberOfLines={2}
              placeholderTextColor={theme.colors.mutedLight}
              style={[styles.input, styles.inputMultiline]}
            />

            <View style={styles.formActions}>
              <Button
                label="Save result"
                variant="primary"
                size="md"
                loading={saving}
                disabled={saving}
                leftIcon={<Save size={14} color={theme.colors.textInverse} strokeWidth={2.2} />}
                onPress={handleSaveResult}
              />
            </View>
          </View>
        </View>
      ) : null}

      {/* Existing result display */}
      {result ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Result</Text>
          <View style={styles.resultCard}>
            {result.result_type === "numeric" && (
              <>
                <Text style={styles.resultValue}>{result.value_numeric}</Text>
                {result.units ? <Text style={styles.resultUnits}>{result.units}</Text> : null}
              </>
            )}
            {result.result_type === "text" && (
              <Text style={styles.resultTextValue}>{result.value_text}</Text>
            )}

            <View style={styles.resultMetaGrid}>
              {result.reference_range ? (
                <>
                  <Text style={styles.metaKey}>Reference range</Text>
                  <Text style={styles.metaVal}>{result.reference_range}</Text>
                </>
              ) : null}
              {result.interpretation ? (
                <>
                  <Text style={styles.metaKey}>Interpretation</Text>
                  <Text style={styles.metaVal}>{result.interpretation}</Text>
                </>
              ) : null}
              <Text style={styles.metaKey}>Resulted by</Text>
              <Text style={styles.metaVal}>{result.resulted_by?.full_name ?? "—"}</Text>
            </View>

            <View style={styles.actions}>
              <Button
                label="Download PDF"
                variant="outline"
                size="md"
                leftIcon={<Download size={14} color={theme.colors.primary} strokeWidth={2.2} />}
                onPress={handleDownloadPdf}
              />
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 900, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.lg },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  chip: { paddingHorizontal: theme.spacing.md, paddingVertical: 5, borderRadius: theme.radius.full },
  chipText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.3 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: theme.spacing.md, padding: theme.spacing.xxl },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.danger },
  headerCard: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg },
  headerIcon: { width: 48, height: 48, borderRadius: theme.radius.sm, backgroundColor: theme.colors.secondary, alignItems: "center", justifyContent: "center" },
  headerContent: { flex: 1 },
  testName: { fontFamily: theme.fontFamily.heading, fontSize: 22, color: theme.colors.text, letterSpacing: -0.4 },
  testMeta: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted, marginTop: 4 },
  priorityBadge: { fontFamily: theme.fontFamily.bodyBold, fontSize: 11, letterSpacing: 0.6, color: theme.colors.primary, marginTop: 4 },
  section: { gap: theme.spacing.md },
  sectionTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  notesCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg, borderLeftWidth: 3, borderLeftColor: theme.colors.secondary },
  notesText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  formCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.xl, gap: theme.spacing.sm },
  errorBanner: { backgroundColor: theme.colors.dangerBg, padding: theme.spacing.md, borderRadius: theme.radius.md },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted, marginTop: theme.spacing.sm },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.bg },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
  typeRow: { flexDirection: "row", gap: theme.spacing.sm },
  typeChoice: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: "center", backgroundColor: theme.colors.bg },
  typeChoiceActive: { borderColor: theme.colors.primary, backgroundColor: "rgba(42,42,114,0.05)" },
  typeChoiceText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.muted, textTransform: "capitalize" },
  typeChoiceTextActive: { color: theme.colors.primary, fontFamily: theme.fontFamily.bodyBold },
  formActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: theme.spacing.lg },
  resultCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.xl, gap: theme.spacing.md },
  resultValue: { fontFamily: theme.fontFamily.heading, fontSize: 48, color: theme.colors.primary, letterSpacing: -1.5 },
  resultUnits: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 15, color: theme.colors.muted, marginTop: -theme.spacing.sm },
  resultTextValue: { fontFamily: theme.fontFamily.body, fontSize: 16, color: theme.colors.text, lineHeight: 24 },
  resultMetaGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.md, marginTop: theme.spacing.sm },
  metaKey: { width: "35%", fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  metaVal: { width: "60%", fontFamily: theme.fontFamily.bodyMedium, fontSize: 13.5, color: theme.colors.text },
  actions: { flexDirection: "row", gap: theme.spacing.md, marginTop: theme.spacing.md },
});
