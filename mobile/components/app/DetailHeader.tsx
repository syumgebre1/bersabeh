/**
 * DetailHeader — back button + title/eyebrow + optional status chip.
 *
 * Used at the top of every `[id].tsx` detail page.
 */

import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";


export interface StatusChip {
  bg: string;
  fg: string;
  label: string;
}


interface DetailHeaderProps {
  backLabel: string;
  eyebrow?: string;
  title?: string;
  chip?: StatusChip;
  onBack?: () => void;
}


export function DetailHeader({
  backLabel,
  eyebrow,
  title,
  chip,
  onBack,
}: DetailHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={handleBack} style={styles.backBtn}>
        <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
        <Text style={styles.backText}>{backLabel}</Text>
      </Pressable>

      {(eyebrow || title) ? (
        <View style={styles.titleWrap}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
      ) : null}

      {chip ? (
        <View style={[styles.chip, { backgroundColor: chip.bg }]}>
          <Text style={[styles.chipText, { color: chip.fg }]}>{chip.label}</Text>
        </View>
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.lg,
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    color: theme.colors.text,
  },
  titleWrap: {
    flex: 1,
    minWidth: 200,
  },
  eyebrow: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: theme.colors.secondary,
  },
  title: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 26,
    letterSpacing: -0.5,
    color: theme.colors.text,
    marginTop: 2,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
  },
  chipText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 11.5,
    letterSpacing: 0.3,
  },
});
