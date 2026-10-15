/**
 * TimeSlotGrid — 30-minute slot picker from 08:00 to 17:30.
 *
 * Emits "HH:MM" strings. Reusable across all booking forms.
 */

import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";


export interface TimeSlotGridProps {
  value: string;                    // "HH:MM"
  onChange: (time: string) => void;
  startHour?: number;               // default 8
  endHour?: number;                 // default 17
  stepMinutes?: number;             // default 30
}


export function TimeSlotGrid({
  value,
  onChange,
  startHour = 8,
  endHour = 17,
  stepMinutes = 30,
}: TimeSlotGridProps) {
  const slots: string[] = useMemo(() => {
    const out: string[] = [];
    for (let h = startHour; h <= endHour; h++) {
      const steps = 60 / stepMinutes;
      for (let s = 0; s < steps; s++) {
        const m = s * stepMinutes;
        out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return out;
  }, [startHour, endHour, stepMinutes]);

  return (
    <View style={styles.grid}>
      {slots.map((s) => {
        const active = value === s;
        return (
          <Pressable
            key={s}
            onPress={() => onChange(s)}
            style={[styles.slot, active && styles.slotActive]}
          >
            <Text style={[styles.slotText, active && styles.slotTextActive]}>{s}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}


const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  slot: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    cursor: "pointer" as any,
  },
  slotActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  slotText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  slotTextActive: { color: theme.colors.textInverse },
});
