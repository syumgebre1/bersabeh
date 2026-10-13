/**
 * DatePickerModal — a custom calendar for choosing a date.
 *
 * Layout:
 *   [< October 2026 >]
 *   Mo Tu We Th Fr Sa Su
 *    1  2  3  4  5  6  7
 *    ...
 *
 * On day tap → calls onSelect(isoDate) and closes.
 */

import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { useState } from "react";
import {
  Modal, Pressable, StyleSheet, Text, View,
} from "react-native";

import { theme } from "@/constants/theme";


interface DatePickerModalProps {
  visible: boolean;
  initialDate?: Date;
  onSelect: (isoDate: string) => void;
  onClose: () => void;
}


const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];


function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Monday = 0, Sunday = 6 */
function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}


export function DatePickerModal({ visible, initialDate, onSelect, onClose }: DatePickerModalProps) {
  const [viewMonth, setViewMonth] = useState<Date>(
    () => startOfMonth(initialDate ?? new Date()),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = startOfMonth(viewMonth);
  const offset = weekdayIndex(firstDay);
  const totalDays = daysInMonth(viewMonth);

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = viewMonth.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  const handleDayPress = (day: number) => {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    if (d < today) return; // no past dates
    onSelect(isoDate(d));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => { /* swallow */ }}>
          <View style={styles.header}>
            <Pressable
              onPress={() => setViewMonth(addMonths(viewMonth, -1))}
              style={styles.navBtn}
            >
              <ChevronLeft size={18} color={theme.colors.text} strokeWidth={2.4} />
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable
              onPress={() => setViewMonth(addMonths(viewMonth, 1))}
              style={styles.navBtn}
            >
              <ChevronRight size={18} color={theme.colors.text} strokeWidth={2.4} />
            </Pressable>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={16} color={theme.colors.muted} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={styles.weekday}>{w}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={styles.cell} />;
              }
              const cellDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
              const isPast = cellDate < today;
              const isToday = cellDate.getTime() === today.getTime();
              return (
                <Pressable
                  key={`day-${day}`}
                  onPress={() => handleDayPress(day)}
                  disabled={isPast}
                  style={({ hovered }: any) => [
                    styles.cell,
                    styles.dayCell,
                    isToday && styles.todayCell,
                    isPast && styles.pastCell,
                    hovered && !isPast && styles.hoverCell,
                  ]}
                >
                  <Text style={[
                    styles.dayText,
                    isPast && styles.pastText,
                    isToday && styles.todayText,
                  ]}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer" as any,
  },
  monthLabel: {
    flex: 1,
    fontFamily: theme.fontFamily.headingMedium,
    fontSize: 15,
    color: theme.colors.text,
    textAlign: "center",
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer" as any,
  },
  weekRow: {
    flexDirection: "row",
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  weekday: {
    flex: 1,
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: theme.colors.muted,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%` as unknown as number,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCell: {
    cursor: "pointer" as any,
    borderRadius: theme.radius.sm,
  },
  hoverCell: {
    backgroundColor: "rgba(42,42,114,0.06)",
  },
  todayCell: {
    backgroundColor: theme.colors.secondary,
  },
  pastCell: {
    cursor: "default" as any,
  },
  dayText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    color: theme.colors.text,
  },
  todayText: {
    color: theme.colors.textInverse,
    fontFamily: theme.fontFamily.bodyBold,
  },
  pastText: {
    color: theme.colors.mutedLight,
  },
});


export default DatePickerModal;
