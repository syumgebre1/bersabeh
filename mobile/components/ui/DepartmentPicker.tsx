/**
 * DepartmentPicker — modal with a list of departments.
 */

import { X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { theme } from "@/constants/theme";


interface Department {
  key: string;
  name: string;
}


// Mirrors the seed in clinic_config.py + the CMS content
const DEPARTMENTS: Department[] = [
  { key: "internal_medicine", name: "Internal Medicine" },
  { key: "general_surgery",   name: "General Surgery" },
  { key: "gastroenterology",  name: "Gastroenterology" },
  { key: "cardiology",        name: "Cardiology" },
  { key: "nephrology",        name: "Nephrology" },
  { key: "pulmonology",       name: "Pulmonology" },
  { key: "post_op_care",      name: "Post-op Care" },
  { key: "wound_care",        name: "Wound Care" },
];


interface DepartmentPickerProps {
  visible: boolean;
  onSelect: (key: string) => void;
  onClose: () => void;
}


export function DepartmentPicker({ visible, onSelect, onClose }: DepartmentPickerProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => { /* swallow */ }}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("hero.booking.departmentPlaceholder")}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={16} color={theme.colors.muted} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView style={styles.list}>
            {DEPARTMENTS.map((d) => (
              <Pressable
                key={d.key}
                onPress={() => { onSelect(d.key); onClose(); }}
                style={({ hovered }: any) => [styles.row, hovered && styles.rowHover]}
              >
                <Text style={styles.rowText}>{d.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,20,31,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 15,
    color: theme.colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer" as any,
  },
  list: {},
  row: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    cursor: "pointer" as any,
  },
  rowHover: {
    backgroundColor: "rgba(42,42,114,0.04)",
  },
  rowText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14.5,
    color: theme.colors.text,
  },
});


export default DepartmentPicker;
