/**
 * Nurse: Log vitals — quick-check and full-vitals presets.
 */

import { ArrowLeft, Save } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { useCreateVital } from "@/lib/admin";
import { usePatients } from "@/lib/admin";
import { useRooms } from "@/lib/nurse";
import { theme } from "@/constants/theme";


type Preset = "quick" | "full";


export default function LogVitals() {
  const { t } = useTranslation();
  const router = useRouter();
  const createVital = useCreateVital();
  const { data: allPatients, isLoading: patientsLoading } = usePatients();
  const { data: rooms } = useRooms();

  const [preset, setPreset] = useState<Preset>("quick");
  const [patientId, setPatientId] = useState("");

  // Vitals fields
  const [temperature, setTemperature] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [bpSys, setBpSys] = useState("");
  const [bpDia, setBpDia] = useState("");
  const [rr, setRr] = useState("");
  const [spo2, setSpo2] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [pain, setPain] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Patients in occupied rooms first, then all other active patients.
  const patients = useMemo(() => {
    const inRooms = new Map<string, string | null>();
    for (const r of rooms ?? []) {
      if (r.is_occupied && r.current_occupant) {
        inRooms.set(r.current_occupant.patient.id, r.number);
      }
    }
    const fromRooms = (rooms ?? [])
      .filter((r) => r.is_occupied && r.current_occupant)
      .map((r) => ({
        id: r.current_occupant!.patient.id,
        full_name: r.current_occupant!.patient.full_name,
        room: r.number as string | null,
      }));
    const others = (allPatients ?? [])
      .filter((p) => !inRooms.has(p.id))
      .map((p) => ({ id: p.id, full_name: p.full_name, room: null as string | null }));
    return [...fromRooms, ...others];
  }, [rooms, allPatients]);

  const parseNum = (v: string): number | null => {
    if (!v) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const handleSave = async () => {
    if (!patientId) {
      setError(t("nurse.selectPatientRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await createVital.mutateAsync({
        patientId,
        payload: {
          temperature_c: parseNum(temperature),
          heart_rate_bpm: parseNum(heartRate) !== null ? Math.round(parseNum(heartRate)!) : null,
          bp_systolic: parseNum(bpSys) !== null ? Math.round(parseNum(bpSys)!) : null,
          bp_diastolic: parseNum(bpDia) !== null ? Math.round(parseNum(bpDia)!) : null,
          respiratory_rate: preset === "full" && parseNum(rr) !== null ? Math.round(parseNum(rr)!) : null,
          spo2_percent: preset === "full" && parseNum(spo2) !== null ? Math.round(parseNum(spo2)!) : null,
          weight_kg: preset === "full" ? parseNum(weight) : null,
          height_cm: preset === "full" ? parseNum(height) : null,
          pain_scale: preset === "full" && parseNum(pain) !== null ? Math.round(parseNum(pain)!) : null,
          notes: notes.trim() || null,
        },
      });
      setSuccess(true);
      // Clear fields after a moment
      setTimeout(() => {
        setTemperature("");
        setHeartRate("");
        setBpSys("");
        setBpDia("");
        setRr("");
        setSpo2("");
        setWeight("");
        setHeight("");
        setPain("");
        setNotes("");
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>{t("nurse.roleName")}</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.eyebrow}>{t("nurse.vitalsToLog")}</Text>
          <Text style={styles.title}>{t("nurse.logVitals")}</Text>
        </View>
      </View>

      {/* Preset toggle */}
      <View style={styles.presetRow}>
        <Pressable
          onPress={() => setPreset("quick")}
          style={[styles.presetBtn, preset === "quick" && styles.presetBtnActive]}
        >
          <Text style={[styles.presetText, preset === "quick" && styles.presetTextActive]}>
            {t("nurse.presetQuick")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setPreset("full")}
          style={[styles.presetBtn, preset === "full" && styles.presetBtnActive]}
        >
          <Text style={[styles.presetText, preset === "full" && styles.presetTextActive]}>
            {t("nurse.presetFull")}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {success ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{t("nurse.vitalsSaved")}</Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        {/* Patient picker */}
        <Text style={styles.label}>{t("reception.book.patient")}</Text>
        {patientsLoading ? (
          <View style={styles.emptyRow}><ActivityIndicator size="small" color={theme.colors.primary} /></View>
        ) : patients.length === 0 ? (
          <Text style={styles.emptyText}>{t("reception.book.noPatients")}</Text>
        ) : (
          <View style={styles.pillWrap}>
            {patients.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setPatientId(p.id)}
                style={[styles.pill, patientId === p.id && styles.pillActive]}
              >
                <Text style={[styles.pillText, patientId === p.id && styles.pillTextActive]}>
                  {p.full_name}{p.room ? ` · ${p.room}` : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Common vitals */}
        <Text style={[styles.label, styles.labelSpaced]}>{t("nurse.temperature")}</Text>
        <TextInput
          value={temperature}
          onChangeText={(v) => setTemperature(v.replace(/[^0-9.]/g, ""))}
          placeholder="37.0"
          keyboardType="decimal-pad"
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.input}
        />

        <Text style={[styles.label, styles.labelSpaced]}>{t("nurse.heartRate")}</Text>
        <TextInput
          value={heartRate}
          onChangeText={(v) => setHeartRate(v.replace(/[^0-9]/g, ""))}
          placeholder="78"
          keyboardType="numeric"
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.input}
        />

        <Text style={[styles.label, styles.labelSpaced]}>{t("nurse.bloodPressure")}</Text>
        <View style={styles.row}>
          <TextInput
            value={bpSys}
            onChangeText={(v) => setBpSys(v.replace(/[^0-9]/g, ""))}
            placeholder="120"
            keyboardType="numeric"
            placeholderTextColor={theme.colors.mutedLight}
            style={[styles.input, styles.half]}
          />
          <Text style={styles.sep}>/</Text>
          <TextInput
            value={bpDia}
            onChangeText={(v) => setBpDia(v.replace(/[^0-9]/g, ""))}
            placeholder="80"
            keyboardType="numeric"
            placeholderTextColor={theme.colors.mutedLight}
            style={[styles.input, styles.half]}
          />
        </View>

        {/* Full-vitals only */}
        {preset === "full" ? (
          <>
            <Text style={[styles.label, styles.labelSpaced]}>{t("nurse.respiratoryRate")}</Text>
            <TextInput
              value={rr}
              onChangeText={(v) => setRr(v.replace(/[^0-9]/g, ""))}
              placeholder="16"
              keyboardType="numeric"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />

            <Text style={[styles.label, styles.labelSpaced]}>{t("nurse.spo2")}</Text>
            <TextInput
              value={spo2}
              onChangeText={(v) => setSpo2(v.replace(/[^0-9]/g, ""))}
              placeholder="98"
              keyboardType="numeric"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={[styles.label, styles.labelSpaced]}>{t("nurse.weight")}</Text>
                <TextInput
                  value={weight}
                  onChangeText={(v) => setWeight(v.replace(/[^0-9.]/g, ""))}
                  placeholder="70"
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.colors.mutedLight}
                  style={styles.input}
                />
              </View>
              <View style={styles.half}>
                <Text style={[styles.label, styles.labelSpaced]}>{t("nurse.height")}</Text>
                <TextInput
                  value={height}
                  onChangeText={(v) => setHeight(v.replace(/[^0-9.]/g, ""))}
                  placeholder="170"
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.colors.mutedLight}
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={[styles.label, styles.labelSpaced]}>{t("nurse.painScale")}</Text>
            <TextInput
              value={pain}
              onChangeText={(v) => setPain(v.replace(/[^0-9]/g, ""))}
              placeholder="3"
              keyboardType="numeric"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />
          </>
        ) : null}

        {/* Notes */}
        <Text style={[styles.label, styles.labelSpaced]}>{t("nurse.notes")}</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholderTextColor={theme.colors.mutedLight}
          style={[styles.input, styles.inputMultiline]}
        />

        <View style={styles.actions}>
          <Button label={t("common.cancel")} variant="ghost" size="md" onPress={() => router.back()} />
          <Button
            label={t("nurse.saveVitals")}
            variant="primary"
            size="md"
            loading={saving}
            disabled={saving || !patientId}
            leftIcon={<Save size={14} color={theme.colors.textInverse} strokeWidth={2.2} />}
            onPress={handleSave}
          />
        </View>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.lg, maxWidth: 800, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  presetRow: { flexDirection: "row", gap: theme.spacing.sm, padding: 4, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border },
  presetBtn: { flex: 1, paddingVertical: theme.spacing.sm + 2, borderRadius: theme.radius.sm, alignItems: "center", cursor: "pointer" as any },
  presetBtnActive: { backgroundColor: theme.colors.primary },
  presetText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13.5, color: theme.colors.text },
  presetTextActive: { color: theme.colors.textInverse, fontFamily: theme.fontFamily.bodyBold },
  errorBanner: { backgroundColor: theme.colors.dangerBg, padding: theme.spacing.md, borderRadius: theme.radius.md },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  successBanner: { backgroundColor: theme.colors.successBg, padding: theme.spacing.md, borderRadius: theme.radius.md },
  successText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.success, fontFamily2: theme.fontFamily.bodyBold } as any,
  formCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.xl, gap: theme.spacing.sm },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted },
  labelSpaced: { marginTop: theme.spacing.md },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.bg },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: theme.spacing.sm, alignItems: "center" },
  half: { flex: 1 },
  sep: { fontFamily: theme.fontFamily.heading, fontSize: 20, color: theme.colors.muted },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  pill: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.full, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, cursor: "pointer" as any },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  pillTextActive: { color: theme.colors.textInverse, fontFamily: theme.fontFamily.bodyBold },
  emptyRow: { alignItems: "center", paddingVertical: theme.spacing.md },
  emptyText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.muted },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing.sm, marginTop: theme.spacing.xl },
});
