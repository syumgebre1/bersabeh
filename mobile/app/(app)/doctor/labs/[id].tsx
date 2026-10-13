/**
 * Doctor: Lab order detail — refactored to use shared components.
 */

import { FlaskConical } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { DetailCard, DetailHeader, DownloadButton } from "@/components/app";
import { apiFetch } from "@/lib/api";
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

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["lab-order", id],
    queryFn: () => apiFetch<LabOrderDetail>(`/api/v1/labs/${id}`),
    enabled: !!id,
  });

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
      <DetailHeader backLabel="Lab orders" chip={chip} />

      <DetailCard>
        <View style={styles.headerRow}>
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
          </View>
        </View>
      </DetailCard>

      {order.clinical_notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinical notes</Text>
          <DetailCard variant="accent">
            <Text style={styles.notesText}>{order.clinical_notes}</Text>
          </DetailCard>
        </View>
      ) : null}

      {result ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Result</Text>
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
              <Text style={styles.metaKey}>Resulted at</Text>
              <Text style={styles.metaVal}>
                {new Date(result.resulted_at).toLocaleString([], {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </Text>
            </View>

            {result.notes ? (
              <View style={styles.labNotesWrap}>
                <Text style={styles.labNotesLabel}>Lab notes</Text>
                <Text style={styles.labNotesText}>{result.notes}</Text>
              </View>
            ) : null}
          </DetailCard>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Result</Text>
          <DetailCard variant="warning">
            <Text style={styles.pendingText}>
              Result not yet entered. Lab has been notified.
            </Text>
          </DetailCard>
        </View>
      )}

      {result ? (
        <View style={styles.actions}>
          <DownloadButton
            path={`/api/v1/labs/${id}/pdf`}
            filename={`lab-report-${id}.pdf`}
          />
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
  headerRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  headerIcon: { width: 48, height: 48, borderRadius: theme.radius.sm, backgroundColor: theme.colors.secondary, alignItems: "center", justifyContent: "center" },
  headerContent: { flex: 1 },
  testName: { fontFamily: theme.fontFamily.heading, fontSize: 22, color: theme.colors.text, letterSpacing: -0.4 },
  testMeta: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted, marginTop: 4 },
  section: { gap: theme.spacing.md },
  sectionTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  notesText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  pendingText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.warning, lineHeight: 20 },
  resultValue: { fontFamily: theme.fontFamily.heading, fontSize: 48, color: theme.colors.primary, letterSpacing: -1.5 },
  resultUnits: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 15, color: theme.colors.muted, marginTop: -theme.spacing.sm },
  resultTextValue: { fontFamily: theme.fontFamily.body, fontSize: 16, color: theme.colors.text, lineHeight: 24 },
  resultMetaGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.md, marginTop: theme.spacing.md },
  metaKey: { width: "35%", fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  metaVal: { width: "60%", fontFamily: theme.fontFamily.bodyMedium, fontSize: 13.5, color: theme.colors.text },
  labNotesWrap: { backgroundColor: theme.colors.bg, borderRadius: theme.radius.sm, padding: theme.spacing.md, marginTop: theme.spacing.md },
  labNotesLabel: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: theme.colors.muted, marginBottom: 4 },
  labNotesText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.text, lineHeight: 19 },
  actions: { flexDirection: "row", gap: theme.spacing.md, marginTop: theme.spacing.md },
});
