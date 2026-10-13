/**
 * Root layout — the outermost component of the app.
 *
 * Responsibilities:
 *   1. Load custom fonts (Space Grotesk, Inter, Noto Sans Ethiopic)
 *   2. Hydrate Zustand from AsyncStorage
 *   3. Initialize TanStack Query client
 *   4. Sync i18next with the persisted language
 *   5. Mount the Expo Router tree
 *   6. Provide a splash overlay while fonts/hydration complete
 *
 * Expo Router convention: this file is `app/_layout.tsx`.
 */

import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { theme } from "@/constants/theme";
import { useFonts } from "@/hooks/useFonts";
import i18n, { setAppLanguage } from "@/lib/i18n";
import { useAppStore } from "@/store/app";


// One QueryClient for the app's lifetime.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});


export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts();

  const language = useAppStore((s) => s.language);
  const hydrated = useAppStore((s) => s.hydrated);

  const [ready, setReady] = useState(false);

  // Sync i18n with the persisted language once Zustand hydrates.
  useEffect(() => {
    if (hydrated) {
      setAppLanguage(language);
      setReady(true);
    }
  }, [hydrated, language]);

  // Don't render until fonts + hydration are done.
  if (!ready || !fontsLoaded) {
    // Solid bg so we never show a flash of white.
    return <View style={styles.boot} />;
  }

  // If fonts failed to load, we still render, but log it.
  if (fontError) {
    console.warn("Font loading failed:", fontError);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bg },
            animation: "fade",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(public)" />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}


const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
});
