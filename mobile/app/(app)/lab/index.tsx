/**
 * Lab technician dashboard.
 *
 * Left: pending orders queue, priority-flagged.
 * Right: a placeholder result-entry panel (real form wiring in M11.5).
 * Bottom: recently completed tests.
 */

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  Image as ImageIcon,
  Upload,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app";


interface Order {
  id: string;
  patient: string;
  test: string;
  orderedBy: string;
  time: string;
  priority: "routine" | "urgent" | "stat";
}

const PENDING: Order[] = [
  { id: "ORD-1042", patient: "Abebe Kebede",  test: "Complete Blood Count", orderedBy: "Dr. Selam",  time: "09:14", priority: "routine" },
  { id: "ORD-1043", patient: "Sara Haile",    test: "Fasting Glucose",      orderedBy: "Dr. Selam",  time: "09:32", priority: "routine" },
  { id: "ORD-1044", patient: "Hana Bekele",   test: "Lipid Panel",          orderedBy: "Dr. Yonas",  time: "10:05", priority: "urgent" },
  { id: "ORD-1045", patient: "Dawit Assefa",  test: "Troponin",             orderedBy: "Dr. Yonas",  time: "10:22", priority: "stat" },
  { id: "ORD-1046", patient: "Meron Tadesse", test: "Urinalysis",           orderedBy: "Dr. Dawit",  time: "10:47", priority: "routine" },
];

const COMPLETED = [
  { id: "ORD-1041", patient: "Yohannes Getu", test: "ECG",            time: "08:52" },
  { id: "ORD-1040", patient: "Bekele Worku",  test: "Basic Metabolic", time: "08:15" },
];


function priorityChip(p: Order["priority"]) {
  switch (p) {
    case "stat":   return { bg: theme.colors.dangerBg,  fg: theme.colors.danger,  label: "STAT" };
    case "urgent": return { bg: theme.colors.warningBg, fg: theme.colors.warning, label: "Urgent" };
    default:       return { bg: theme.colors.infoBg,    fg: theme.colors.info,    label: "Routine" };
  }
}


export default function LabDashboard() {
  const user = useAppStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;

  const firstName = (user?.full_name ?? "Lab").split(" ")[0];
  const [selectedId, setSelectedId] = useState<string>(PENDING[0].id);
  const selected = PENDING.find((o) => o.id === selectedId) ?? PENDING[0];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.hello}>{firstName} · Lab</Text>
        <Text style={styles.sub}>
          {PENDING.length} pending tests · {PENDING.filter((o) => o.priority !== "routine").length} flagged
        </Text>
      </View>

      {/* Two-column */}
      <View style={[styles.cols, !isWide && styles.colsStack]}>
        {/* Pending orders */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <FlaskConical size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>Pending orders</Text>
            <Text style={styles.panelMeta}>{PENDING.length} in queue</Text>
          </View>
          <View style={styles.panelBody}>
            {PENDING.map((o, i) => {
              const chip = priorityChip(o.priority);
              const active = o.id === selectedId;
              return (
                <View key={o.id}>
                  <Pressable
                    onPress={() => setSelectedId(o.id)}
                    style={({ hovered }: any) => [
                      styles.orderRow,
                      active && styles.orderRowActive,
                      hovered && !active && styles.orderRowHover,
                    ]}
                  >
                    <View style={styles.orderContent}>
                      <View style={styles.orderTop}>
                        <Text style={[styles.orderId, active && styles.orderIdActive]}>
                          {o.id}
                        </Text>
                        <View style={[styles.chip, { backgroundColor: chip.bg }]}>
                          <Text style={[styles.chipText, { color: chip.fg }]}>{chip.label}</Text>
                        </View>
                      </View>
                      <Text style={[styles.orderPatient, active && styles.orderTextActive]}>
                        {o.patient}
                      </Text>
                      <Text style={[styles.orderTest, active && styles.orderTextSubActive]}>
                        {o.test} · ordered by {o.orderedBy} at {o.time}
                      </Text>
                    </View>
                    <ArrowRight
                      size={14}
                      color={active ? theme.colors.textInverse : theme.colors.muted}
                      strokeWidth={2}
                    />
                  </Pressable>
                  {i < PENDING.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* Result entry */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <CheckCircle2 size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.panelTitle}>Enter result</Text>
          </View>
          <View style={styles.entryBody}>
            <View style={styles.entryContext}>
              <Text style={styles.entryLabel}>ORDER</Text>
              <Text style={styles.entryValue}>{selected.id} · {selected.test}</Text>
              <Text style={styles.entryPatient}>{selected.patient}</Text>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.inputLabel}>Value</Text>
                <TextInput
                  placeholder="e.g. 7.8"
                  placeholderTextColor={theme.colors.mutedLight}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.inputLabel}>Units</Text>
                <TextInput
                  placeholder="10^3/µL"
                  placeholderTextColor={theme.colors.mutedLight}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.inputLabel}>Reference range</Text>
              <TextInput
                placeholder="4.0 – 11.0"
                placeholderTextColor={theme.colors.mutedLight}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.inputLabel}>Interpretation</Text>
              <TextInput
                placeholder="Within normal limits"
                placeholderTextColor={theme.colors.mutedLight}
                style={styles.input}
              />
            </View>

            <View style={styles.uploadRow}>
              <Upload size={14} color={theme.colors.muted} strokeWidth={2} />
              <Text style={styles.uploadText}>Attach image (X-ray, scan)</Text>
            </View>

            <View style={styles.entryActions}>
              <Button label="Save result" variant="primary" size="md" fullWidth />
            </View>
          </View>
        </View>
      </View>

      {/* Recently completed */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <CheckCircle2 size={14} color={theme.colors.primary} strokeWidth={2.2} />
          <Text style={styles.panelTitle}>Recently completed</Text>
          <Pressable><Text style={styles.panelLink}>See all</Text></Pressable>
        </View>
        <View style={styles.panelBody}>
          {COMPLETED.map((r, i) => (
            <View key={i}>
              <View style={styles.completedRow}>
                <View style={styles.listIcon}>
                  <ImageIcon size={14} color={theme.colors.success} strokeWidth={2.4} />
                </View>
                <View style={styles.orderContent}>
                  <Text style={styles.orderPatient}>{r.patient}</Text>
                  <Text style={styles.orderTest}>{r.test}</Text>
                </View>
                <Text style={styles.completedTime}>{r.time}</Text>
                <View style={[styles.chip, { backgroundColor: theme.colors.successBg }]}>
                  <Text style={[styles.chipText, { color: theme.colors.success }]}>Sent</Text>
                </View>
              </View>
              {i < COMPLETED.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: {
    padding: theme.spacing.xxl,
    gap: theme.spacing.xl,
    maxWidth: 1300,
    width: "100%",
    alignSelf: "center",
  },
  greeting: { gap: 4 },
  hello: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 32, lineHeight: 38, letterSpacing: -0.6,
    color: theme.colors.text,
  },
  sub: { fontFamily: theme.fontFamily.body, fontSize: 15, color: theme.colors.muted },
  cols: { flexDirection: "row", gap: theme.spacing.lg, alignItems: "flex-start" },
  colsStack: { flexDirection: "column" },
  panel: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  panelTitle: {
    fontFamily: theme.fontFamily.headingMedium, fontSize: 14,
    color: theme.colors.text, flex: 1,
  },
  panelMeta: {
    fontFamily: theme.fontFamily.body, fontSize: 12, color: theme.colors.muted,
  },
  panelLink: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.primary,
  },
  panelBody: { paddingVertical: 4 },
  orderRow: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  orderRowActive: {
    backgroundColor: theme.colors.primary,
  },
  orderRowHover: {
    backgroundColor: "rgba(42,42,114,0.03)",
  },
  orderContent: { flex: 1, minWidth: 0 },
  orderTop: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  orderId: {
    fontFamily: theme.fontFamily.headingMedium, fontSize: 12.5,
    color: theme.colors.muted, letterSpacing: 0.3,
  },
  orderIdActive: { color: theme.colors.accent },
  orderPatient: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.text,
  },
  orderTextActive: { color: theme.colors.textInverse },
  orderTest: {
    fontFamily: theme.fontFamily.body, fontSize: 12.5,
    color: theme.colors.muted, marginTop: 2,
  },
  orderTextSubActive: { color: "rgba(255,255,255,0.7)" },
  chip: {
    paddingHorizontal: theme.spacing.sm, paddingVertical: 3,
    borderRadius: theme.radius.full, alignSelf: "flex-start",
  },
  chipText: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.3,
  },
  divider: {
    height: 1, backgroundColor: theme.colors.border, marginHorizontal: theme.spacing.lg,
  },
  entryBody: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  entryContext: {
    backgroundColor: theme.colors.bg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
    gap: 2,
  },
  entryLabel: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 10.5,
    letterSpacing: 1.2, color: theme.colors.muted, textTransform: "uppercase",
  },
  entryValue: {
    fontFamily: theme.fontFamily.headingMedium, fontSize: 14, color: theme.colors.text,
  },
  entryPatient: {
    fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted,
  },
  field: { gap: theme.spacing.xs },
  fieldRow: { flexDirection: "row", gap: theme.spacing.md },
  fieldHalf: { flex: 1, gap: theme.spacing.xs },
  inputLabel: {
    fontFamily: theme.fontFamily.bodyMedium, fontSize: 11,
    letterSpacing: 1, textTransform: "uppercase", color: theme.colors.muted,
  },
  input: {
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 2,
    fontFamily: theme.fontFamily.body, fontSize: 14,
    color: theme.colors.text, backgroundColor: theme.colors.bg,
  },
  uploadRow: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.border,
    borderStyle: "dashed", borderRadius: theme.radius.md,
  },
  uploadText: {
    fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted,
  },
  entryActions: { marginTop: theme.spacing.sm },
  completedRow: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  completedTime: {
    fontFamily: theme.fontFamily.headingMedium, fontSize: 13,
    color: theme.colors.muted, letterSpacing: -0.1,
  },
  listIcon: {
    width: 32, height: 32, borderRadius: theme.radius.sm,
    backgroundColor: "rgba(47,125,92,0.08)",
    alignItems: "center", justifyContent: "center",
  },
});
