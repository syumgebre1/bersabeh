/**
 * Runtime configuration for the mobile app.
 *
 * Values come from (in priority order):
 *   1. process.env.EXPO_PUBLIC_* — set via shell or .env.local (dev only)
 *   2. Constants.expoConfig.extra — from app.json (defaults)
 *
 * If you're testing on a physical device, override the API URL to your
 * Mac's LAN IP:  EXPO_PUBLIC_API_URL=http://192.168.1.42:8000 npx expo start
 */

import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  wsUrl?: string;
};

export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? "http://localhost:8000",
  wsUrl: process.env.EXPO_PUBLIC_WS_URL ?? extra.wsUrl ?? "ws://localhost:8000",
  appName: "Bersabeh Clinic",
  appVersion: "0.1.0",
} as const;

export type AppConfig = typeof config;
export default config;
