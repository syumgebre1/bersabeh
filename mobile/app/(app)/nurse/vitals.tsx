/**
 * Nurse: Log vitals form — trilingual.
 */

import { ArrowLeft, Save } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";


export default function LogVitals() {
  const { t } = useTranslation();
  const router = useRouter();

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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>{t("nurse.roleName")}</Text>
        </Pressable>
        <View style={styles.topBarMeta}>
          <Text style={styles.title}>{t("nurse.logVitals")}</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionLabel}>{t("nurse.logVitals")}</Text>

        <Text style={styles.label}>{t("nurse.temperature")}</Text>
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
          <View style={styles.half}>
            <TextInput
              value={bpSys}
              onChangeText={(v) => setBpSys(v.replace(/[^0-9]/g, ""))}
              placeholder="120"
              keyboardType="numeric"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />
          </View>
          <Text style={styles.separator}>/</Text>
          <View style={styles.half}>
            <TextInput
              value={bpDia}
              onChangeText={(v) => setBpDia(v.replace(/[^0-9]/g, ""))}
              placeholder="80"
              keyboardType="numeric"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
            />
          </View>
        </View>

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

        <Text style={[styles.label, styles.labelSpaced]}>{t("nurse.notes")}</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t("nurse.notes")}
          multiline
          numberOfLines={3}
          placeholderTextColor={theme.colors.mutedLight}
          style={[styles.input, styles.inputMultiline]}
        />

        <View style={styles.actions}>
          <Button
            label={t("common.cancel")}
            variant="ghost"
            size="md"
            onPress={() => router.back()}
          />
          <Button
            label={t("nurse.saveVitals")}
            variant="primary"
            size="md"
            leftIcon={<Save size={14} color={theme.colors.textInverse} strokeWidth={2.2} />}
            onPress={() => router.back()}
          />
        </View>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 800, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  topBarMeta: { flex: 1, minWidth: 200 },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, letterSpacing: -0.5, color: theme.colors.text, marginTop: 2 },
  formCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.xl, gap: theme.spacing.sm },
  sectionLabel: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", color: theme.colors.primary },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted },
  labelSpaced: { marginTop: theme.spacing.md },
  row: { flexDirection: "row", gap: theme.spacing.md, alignItems: "flex-end" },
  half: { flex: 1 },
  separator: { fontFamily: theme.fontFamily.heading, fontSize: 20, color: theme.colors.muted, paddingBottom: 10 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.bg },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing.sm, marginTop: theme.spacing.xl },
});
