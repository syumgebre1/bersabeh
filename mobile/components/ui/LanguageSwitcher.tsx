/**
 * LanguageSwitcher — EN | አማ | ትግ toggle.
 *
 * Reads the active language from Zustand, renders 3 tappable pills,
 * and on press calls `setAppLanguage(lang)` to change the app-wide locale.
 *
 * The change is:
 *   - reflected instantly in every component that uses useTranslation()
 *   - persisted to AsyncStorage via the Zustand persist middleware
 */

import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import { setAppLanguage } from "@/lib/i18n";
import { LANGUAGES, useAppStore, type Language } from "@/store/app";


interface Props {
  /** Compact mode for the utility bar — smaller padding. */
  compact?: boolean;
  /** Optional contrast mode for use on a dark background. */
  onDark?: boolean;
}


export function LanguageSwitcher({ compact = false, onDark = false }: Props) {
  const activeLang = useAppStore((s) => s.language);

  return (
    <View style={[styles.container, onDark && styles.containerDark]}>
      {LANGUAGES.map((lang, idx) => {
        const isActive = lang.code === activeLang;
        return (
          <View key={lang.code} style={styles.itemWrap}>
            <Pressable
              onPress={() => setAppLanguage(lang.code as Language)}
              style={({ pressed }) => [
                styles.item,
                compact && styles.itemCompact,
                isActive && styles.itemActive,
                pressed && !isActive && styles.itemPressed,
              ]}
              accessibilityLabel={`Switch to ${lang.label}`}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.text,
                  compact && styles.textCompact,
                  onDark && styles.textDark,
                  isActive && styles.textActive,
                  isActive && onDark && styles.textActiveOnDark,
                ]}
              >
                {lang.short}
              </Text>
            </Pressable>
            {idx < LANGUAGES.length - 1 && (
              <Text style={[styles.separator, onDark && styles.separatorDark]}>·</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  containerDark: {
    // no visual change at container level; items handle it
  },
  itemWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  item: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  itemCompact: {
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: 2,
  },
  itemActive: {
    backgroundColor: theme.colors.primary,
  },
  itemPressed: {
    backgroundColor: "rgba(42, 42, 114, 0.08)",
  },
  text: {
    fontSize: 13,
    fontFamily: theme.fontFamily.bodyMedium,
    color: theme.colors.text,
    letterSpacing: 0.4,
  },
  textCompact: {
    fontSize: 11,
  },
  textDark: {
    color: "rgba(255,255,255,0.75)",
  },
  textActive: {
    color: theme.colors.textInverse,
    fontFamily: theme.fontFamily.bodyBold,
  },
  textActiveOnDark: {
    color: theme.colors.primary,
  },
  separator: {
    color: theme.colors.muted,
    fontSize: 11,
    paddingHorizontal: 2,
  },
  separatorDark: {
    color: "rgba(255,255,255,0.4)",
  },
});


export default LanguageSwitcher;
