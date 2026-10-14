/**
 * Lab: Order detail — result entry form when pending.
 */

import { FlaskConical, Save } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { DetailCard, DetailHeader, DownloadButton } from "@/components/app";
import { apiFetch } from "@/lib/api";
import { theme } from "@/constants/theme";


interface LabOrderDetail {
  id: string;
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


export default function LabOrderDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["lab-order", id],
    queryFn: () => apiFetch<LabOrderDetail>(`/api/v1/labs/${id}`),
    enabled: !!id,
  });

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
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
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
        <Text style={styles.errorText}>{t("common.error")}</Text>
        <Button label={t("common.retry")} variant="outline" size="sm" onPress={() => refetch()} />
      </View>
    );
  }

  let chip: { bg: string; fg: string; label: string } = { bg: theme.colors.warningBg, fg: theme.colors.warning, label: t("status.pending") };
  switch (order.status) {
    case "completed":   chip = { bg: theme.colors.successBg, fg: theme.colors.success, label: t("status.ready") }; break;
    case "in_progress": chip = { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: t("status.inProgress") }; break;
    case "cancelled":   chip = { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: t("status.cancelled") }; break;
  }

  const result = order.result;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <DetailHeader backLabel={t("lab.allOrders")} chip={chip} />

      <DetailCard>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <FlaskConical size={22} color={theme.colors.textInverse} strokeWidth={2.2} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.testName}>{order.test_name}</Text>
            <Text style={styles.testMeta}>
              {t("doctor.ordered")} {new Date(order.ordered_at).toLocaleString([], {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
      </DetailCard>

      {order.clinical_notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("lab.clinicalNotesFromDoctor")}</Text>
          <DetailCard variant="accent">
            <Text style={styles.notesText}>{order.clinical_notes}</Text>
          </DetailCard>
        </View>
      ) : null}

      {!result && order.status !== "cancelled" ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("lab.enterResult")}</Text>
          <DetailCard>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>{t("lab.resultType")}</Text>
            <View style={styles.typeRow}>
              {(["numeric", "text", "image"] as const).map((ty) => (
                <Pressable
                  key={ty}
                  onPress={() => setResultType(ty)}
                  style={[styles.typeChoice, resultType === ty && styles.typeChoiceActive]}
                >
                  <Text style={[styles.typeChoiceText, resultType === ty && styles.typeChoiceTextActive]}>
                    {ty === "numeric" ? t("lab.typeNumeric") : ty === "text" ? t("lab.typeText") : t("lab.typeImage")}
                  </Text>
                </Pressable>
              ))}
            </View>

            {resultType === "numeric" ? (
              <>
                <Text style={[styles.label, styles.labelSpaced]}>{t("lab.value")}</Text>
                <TextInput
                  value={valueNumeric}
                  onChangeText={(v) => setValueNumeric(v.replace(/[^0-9.]/g, ""))}
                  placeholder="7.8"
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.colors.mutedLight}
                  style={styles.input}
                />
                <Text style={[styles.label, styles.labelSpaced]}>{t("patient.labs.units")}</Text>
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
                <Text style={[styles.label, styles.labelSpaced]}>{t("lab.textResult")}</Text>
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

            <Text style={[styles.label, styles.labelSpaced]}>{t("lab.referenceRangeOptional")}</Text>
            <TextInput
              value={referenceRange}
              onChangeText={setReferenceRange}
              placeholder="4.0 - 11.0"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />

            <Text style={[styles.label, styles.labelSpaced]}>{t("lab.interpretationOptional")}</Text>
            <TextInput
              value={interpretation}
              onChangeText={setInterpretation}
              placeholder={t("patient.labs.withinNormal")}
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />

            <Text style={[styles.label, styles.labelSpaced]}>{t("lab.notesOptional")}</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={t("patient.labs.sampleQuality")}
              multiline
              numberOfLines={2}
              placeholderTextColor={theme.colors.mutedLight}
              style={[styles.input, styles.inputMultiline]}
            />

            <View style={styles.formActions}>
              <Button
                label={t("lab.saveResult")}
                variant="primary"
                size="md"
                loading={saving}
                disabled={saving}
                leftIcon={<Save size={14} color={theme.colors.textInverse} strokeWidth={2.2} />}
                onPress={handleSaveResult}
              />
            </View>
          </DetailCard>
        </View>
      ) : null}

      {result ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("patient.labs.result")}</Text>
          <DetailCard>
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
                  <Text style={styles.metaKey}>{t("patient.labs.referenceRange")}</Text>
                  <Text style={styles.metaVal}>{result.reference_range}</Text>
                </>
              ) : null}
              {result.interpretation ? (
                <>
                  <Text style={styles.metaKey}>{t("patient.labs.interpretation")}</Text>
                  <Text style={styles.metaVal}>{result.interpretation}</Text>
                </>
              ) : null}
              <Text style={styles.metaKey}>{t("lab.resultedBy")}</Text>
              <Text style={styles.metaVal}>{result.resulted_by?.full_name ?? "—"}</Text>
            </View>

            <View style={styles.actions}>
              <DownloadButton
                path={`/api/v1/labs/${id}/pdf`}
                filename={`lab-report-${id}.pdf`}
                label={t("common.downloadPdf")}
              />
            </View>
          </DetailCard>
        </View>
      ) : null}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 900, width: "100%", alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: theme.spacing.md, padding: theme.spacing.xxl },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.danger },
  errorBanner: { backgroundColor: theme.colors.dangerBg, padding: theme.spacing.md, borderRadius: theme.radius.md, marginBottom: theme.spacing.md },
  headerRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  headerIcon: { width: 48, height: 48, borderRadius: theme.radius.sm, backgroundColor: theme.colors.secondary, alignItems: "center", justifyContent: "center" },
  headerContent: { flex: 1 },
  testName: { fontFamily: theme.fontFamily.heading, fontSize: 22, color: theme.colors.text, letterSpacing: -0.4 },
  testMeta: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted, marginTop: 4 },
  section: { gap: theme.spacing.md },
  sectionTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  notesText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted },
  labelSpaced: { marginTop: theme.spacing.md },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.bg },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
  typeRow: { flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  typeChoice: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: "center", backgroundColor: theme.colors.bg, cursor: "pointer" as any },
  typeChoiceActive: { borderColor: theme.colors.primary, backgroundColor: "rgba(42,42,114,0.05)" },
  typeChoiceText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.muted },
  typeChoiceTextActive: { color: theme.colors.primary, fontFamily: theme.fontFamily.bodyBold },
  formActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: theme.spacing.lg },
  resultValue: { fontFamily: theme.fontFamily.heading, fontSize: 48, color: theme.colors.primary, letterSpacing: -1.5 },
  resultUnits: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 15, color: theme.colors.muted, marginTop: -theme.spacing.sm },
  resultTextValue: { fontFamily: theme.fontFamily.body, fontSize: 16, color: theme.colors.text, lineHeight: 24 },
  resultMetaGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.md, marginTop: theme.spacing.md },
  metaKey: { width: "35%", fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  metaVal: { width: "60%", fontFamily: theme.fontFamily.bodyMedium, fontSize: 13.5, color: theme.colors.text },
  actions: { flexDirection: "row", gap: theme.spacing.md, marginTop: theme.spacing.md },
});
