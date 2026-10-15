/**
 * DateStrip — horizontal 14-day picker.
 *
 * Emits ISO date strings ("2026-10-20"). Skips today (must be future).
 * Reusable across patient booking, reception booking, landing widget.
 */

import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { theme } from "@/constants/theme";


export interface DateStripProps {
  value: string;                    // ISO date string "YYYY-MM-DD"
  onChange: (iso: string) => void;
  days?: number;                    // default 14
  locale?: string;                  // default "en"
}


interface DayOption {
  iso: string;
  dayNum: number;
  month: string;
  weekday: string;
}


export function DateStrip({ value, onChange, days = 14, locale = "en" }: DateStripProps) {
  const options: DayOption[] = useMemo(() => {
    const out: DayOption[] = [];
    const today = new Date();
    for (let i = 1; i <= days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      out.push({
        iso: d.toISOString().slice(0, 10),
        dayNum: d.getDate(),
        month: d.toLocaleDateString(locale, { month: "short" }),
        weekday: d.toLocaleDateString(locale, { weekday: "short" }),
      });
    }
    return out;
  }, [days, locale]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.row}
    >
      {options.map((d) => {
        const active = value === d.iso;
        return (
          <Pressable
            key={d.iso}
            onPress={() => onChange(d.iso)}
            style={[styles.card, active && styles.cardActive]}
          >
            <Text style={[styles.weekday, active && styles.textActive]}>{d.weekday}</Text>
            <Text style={[styles.day, active && styles.textActive]}>{d.dayNum}</Text>
            <Text style={[styles.month, active && styles.textActive]}>{d.month}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  strip: { flexGrow: 0, maxHeight: 110, alignSelf: "stretch" },
  row: { gap: theme.spacing.sm, paddingVertical: 2, alignItems: "flex-start" },
  card: {
    width: 64,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    gap: 2,
    cursor: "pointer" as any,
  },
  cardActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  weekday: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 10.5,
    letterSpacing: 0.4,
    color: theme.colors.muted,
    textTransform: "uppercase",
  },
  day: { fontFamily: theme.fontFamily.heading, fontSize: 22, color: theme.colors.text, letterSpacing: -0.5 },
  month: { fontFamily: theme.fontFamily.body, fontSize: 10.5, color: theme.colors.muted },
  textActive: { color: theme.colors.textInverse },
});
