/**
 * Global client-side state — Zustand + AsyncStorage persistence.
 *
 * What lives here:
 *   - language: "en" | "am" | "ti"    — drives i18next, persisted
 *   - accessToken: string | null       — JWT from /auth/login
 *   - refreshToken: string | null      — JWT used to rotate
 *   - user: SessionUser | null         — minimal user shape
 *   - hydrated: boolean                — AsyncStorage has been read
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";


export type Language = "en" | "am" | "ti";

export const LANGUAGES: { code: Language; label: string; short: string }[] = [
  { code: "en", label: "English",  short: "EN" },
  { code: "am", label: "አማርኛ",      short: "አማ" },
  { code: "ti", label: "ትግርኛ",      short: "ትግ" },
];


export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  phone?: string | null;
  photo_url?: string | null;
}


interface AppState {
  // ---- Persisted ----
  language: Language;
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;

  // ---- Runtime ----
  hydrated: boolean;

  // ---- Actions ----
  setLanguage: (lang: Language) => void;
  setSession: (params: { accessToken: string; refreshToken: string; user: SessionUser }) => void;
  setTokens: (params: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: SessionUser | null) => void;
  clearSession: () => void;
  setHydrated: (v: boolean) => void;
}


export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: "en",
      accessToken: null,
      refreshToken: null,
      user: null,
      hydrated: false,

      setLanguage: (language) => set({ language }),

      setSession: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),

      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      clearSession: () =>
        set({ accessToken: null, refreshToken: null, user: null }),

      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "bersabeh.app",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
