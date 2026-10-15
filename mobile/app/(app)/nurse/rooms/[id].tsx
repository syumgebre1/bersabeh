/**
 * Nurse: Room detail — patient + admit/discharge actions.
 */

import { ArrowLeft, Bed, Phone, UserCircle, X } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { DetailCard, DetailHeader } from "@/components/app";
import {
  useAssignRoom,
  useDischargeRoom,
  useRoom,
} from "@/lib/nurse";
import { useStaffList } from "@/lib/admin";
import type { SessionUser } from "@/store/app";
import { theme } from "@/constants/theme";


export default function RoomDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: room, isLoading, isError, refetch } = useRoom(id);
  const { data: users } = useStaffList();
  const assignRoom = useAssignRoom();
  const dischargeRoom = useDischargeRoom();

  const patients = useMemo(
    () => (users ?? []).filter((u: SessionUser) => u.role === "patient"),
    [users],
  );

  const [showAssign, setShowAssign] = useState(false);
  const [showDischarge, setShowDischarge] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [dischargeReason, setDischargeReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!id || !selectedPatientId) return;
    setError(null);
    try {
      await assignRoom.mutateAsync({
        roomId: id,
        patientId: selectedPatientId,
        reason: assignNotes || undefined,
      });
      setShowAssign(false);
      setSelectedPatientId("");
      setAssignNotes("");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleDischarge = async () => {
    if (!id) return;
    setError(null);
    try {
      await dischargeRoom.mutateAsync({
        roomId: id,
        notes: dischargeReason || undefined,
      });
      setShowDischarge(false);
      setDischargeReason("");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !room) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t("common.error")}</Text>
        <Button label={t("common.retry")} variant="outline" size="sm" onPress={() => refetch()} />
      </View>
    );
  }

  let chip: { bg: string; fg: string; label: string } = {
    bg: room.is_occupied ? theme.colors.warningBg : theme.colors.successBg,
    fg: room.is_occupied ? theme.colors.warning : theme.colors.success,
    label: room.is_occupied ? t("nurse.occupied") : t("nurse.available"),
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <DetailHeader
        backLabel={t("nurse.wardAndRooms")}
        chip={chip}
      />

      {/* Room header card */}
      <DetailCard>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Bed size={22} color={theme.colors.textInverse} strokeWidth={2.2} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.roomTitle}>
              {t("patient.appointments.room")} {room.number}
            </Text>
            <Text style={styles.roomMeta}>
              {room.ward}
              {room.floor ? ` · ${t("nurse.floor")} ${room.floor}` : ""}
              {" · "}
              {room.room_type}
            </Text>
          </View>
        </View>
      </DetailCard>

      {/* Occupant */}
      {room.current_occupant ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("nurse.currentPatient")}</Text>
            <DetailCard>
              <View style={styles.occupantRow}>
                <View style={styles.occupantAvatar}>
                  <UserCircle size={22} color={theme.colors.textInverse} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.occupantName}>
                    {room.current_occupant.patient.full_name}
                  </Text>
                  {room.current_occupant.patient.phone ? (
                    <View style={styles.contactRow}>
                      <Phone size={12} color={theme.colors.muted} strokeWidth={2} />
                      <Text style={styles.contactText}>
                        {room.current_occupant.patient.phone}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </DetailCard>
          </View>

          <View style={styles.actions}>
            <Button
              label={t("nurse.viewPatientMeds")}
              variant="outline"
              size="md"
              onPress={() => router.push("/(app)/nurse/medications" as any)}
            />
            <Button
              label={t("nurse.discharge")}
              variant="primary"
              size="md"
              onPress={() => setShowDischarge(true)}
            />
          </View>
        </>
      ) : (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>{t("nurse.roomEmpty")}</Text>
          <Button
            label={t("nurse.assignPatient")}
            variant="primary"
            size="md"
            onPress={() => setShowAssign(true)}
          />
        </View>
      )}

      {/* Assign modal */}
      <Modal visible={showAssign} transparent animationType="fade" onRequestClose={() => setShowAssign(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("nurse.assignPatient")}</Text>
              <Pressable onPress={() => setShowAssign(false)}>
                <X size={16} color={theme.colors.muted} strokeWidth={2.2} />
              </Pressable>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>{t("reception.book.patient")}</Text>
            <View style={styles.pillWrap}>
              {patients.length === 0 ? (
                <Text style={styles.emptyText}>{t("reception.book.noPatients")}</Text>
              ) : (
                patients.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelectedPatientId(p.id)}
                    style={[styles.pill, selectedPatientId === p.id && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, selectedPatientId === p.id && styles.pillTextActive]}>
                      {p.full_name}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>

            <Text style={[styles.label, styles.labelSpaced]}>{t("nurse.notesOptional")}</Text>
            <TextInput
              value={assignNotes}
              onChangeText={setAssignNotes}
              multiline
              numberOfLines={2}
              placeholderTextColor={theme.colors.mutedLight}
              style={[styles.input, styles.inputMultiline]}
            />

            <View style={styles.modalActions}>
              <Button label={t("common.cancel")} variant="ghost" size="md" onPress={() => setShowAssign(false)} />
              <Button
                label={t("nurse.assignPatient")}
                variant="primary"
                size="md"
                disabled={!selectedPatientId || assignRoom.isPending}
                loading={assignRoom.isPending}
                onPress={handleAssign}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Discharge modal */}
      <Modal visible={showDischarge} transparent animationType="fade" onRequestClose={() => setShowDischarge(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("nurse.discharge")}</Text>
              <Pressable onPress={() => setShowDischarge(false)}>
                <X size={16} color={theme.colors.muted} strokeWidth={2.2} />
              </Pressable>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>{t("nurse.dischargeReason")}</Text>
            <TextInput
              value={dischargeReason}
              onChangeText={setDischargeReason}
              multiline
              numberOfLines={2}
              placeholderTextColor={theme.colors.mutedLight}
              style={[styles.input, styles.inputMultiline]}
            />

            <View style={styles.modalActions}>
              <Button label={t("common.cancel")} variant="ghost" size="md" onPress={() => setShowDischarge(false)} />
              <Button
                label={t("nurse.discharge")}
                variant="primary"
                size="md"
                loading={dischargeRoom.isPending}
                onPress={handleDischarge}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.xxl, gap: theme.spacing.xl, maxWidth: 900, width: "100%", alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: theme.spacing.md, padding: theme.spacing.xxl },
  errorText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.danger },
  errorBanner: { backgroundColor: theme.colors.dangerBg, padding: theme.spacing.md, borderRadius: theme.radius.md },
  headerRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  headerIcon: { width: 48, height: 48, borderRadius: theme.radius.sm, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  headerContent: { flex: 1 },
  roomTitle: { fontFamily: theme.fontFamily.heading, fontSize: 22, color: theme.colors.text, letterSpacing: -0.4 },
  roomMeta: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.muted, marginTop: 4, textTransform: "capitalize" },
  section: { gap: theme.spacing.md },
  sectionTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.muted },
  occupantRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  occupantAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: "center", justifyContent: "center" },
  occupantName: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 16, color: theme.colors.text },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  contactText: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted },
  admittedAt: { fontFamily: theme.fontFamily.body, fontSize: 12, color: theme.colors.mutedLight, marginTop: 6 },
  actions: { flexDirection: "row", gap: theme.spacing.md, justifyContent: "flex-end" },
  emptyBlock: { alignItems: "center", gap: theme.spacing.md, padding: theme.spacing.xxl, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border },
  emptyText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted, textAlign: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(20,20,31,0.5)", alignItems: "center", justifyContent: "center", padding: theme.spacing.lg },
  modalCard: { width: "100%", maxWidth: 480, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.xl, gap: theme.spacing.sm },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.sm },
  modalTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 18, color: theme.colors.text },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.muted },
  labelSpaced: { marginTop: theme.spacing.md },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.bg },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  pill: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.full, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, cursor: "pointer" as any },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  pillTextActive: { color: theme.colors.textInverse, fontFamily: theme.fontFamily.bodyBold },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing.sm, marginTop: theme.spacing.lg },
});
