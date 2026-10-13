/**
 * useMedicalMap — hook that translates free-text prescription values
 * (frequency, instructions) using CMS-backed mappings.
 *
 * Source: `content_blocks` rows where key starts with `medical_map.`
 * Structure:
 *   medical_map.frequency.3x_daily  →  { en: "...", am: "...", ti: "..." }
 *   medical_map.instruction.take_with_food → { en: "...", am: "...", ti: "..." }
 *
 * Usage:
 *   const { translateFrequency, translateInstruction } = useMedicalMap();
 *   translateFrequency("3x daily", "am")  // → "በቀን ሦስት ጊዜ ይውሰዱ"
 *   translateFrequency("custom text", "am") // → "custom text" (fallback)
 */

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { apiFetch } from "@/lib/api";


interface ContentBlockBrief {
  id: string;
  key: string;
  locale: string;
  value: unknown;
  category: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
}


/**
 * Normalize a free-text value into a stable key segment.
 *   "Take with food"     → "take_with_food"
 *   "3x daily"           → "3x_daily"
 *   "For headache, max 3g/day" → "for_headache_max_3g_day"
 */
function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}


interface MedicalMap {
  [fullKey: string]: {
    en?: string;
    am?: string;
    ti?: string;
  };
}


/**
 * Fetch medical_map blocks and shape them into a lookup.
 *
 * Returns a Map like:
 *   {
 *     "frequency.3x_daily": { en, am, ti },
 *     "instruction.take_with_food": { en, am, ti },
 *   }
 */
async function fetchMedicalMap(): Promise<MedicalMap> {
  const blocks = await apiFetch<ContentBlockBrief[]>(
    "/api/v1/content/blocks?category=clinic_info&limit=500",
    { auth: false },
  );

  const map: MedicalMap = {};

  for (const block of blocks) {
    if (!block.key.startsWith("medical_map.")) continue;
    if (!block.is_active) continue;

    // "medical_map.frequency.3x_daily" → "frequency.3x_daily"
    const lookupKey = block.key.replace(/^medical_map\./, "");

    if (!map[lookupKey]) map[lookupKey] = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map[lookupKey] as any)[block.locale] = String(block.value ?? "");
  }

  return map;
}


export function useMedicalMap() {
  const { data: map, isLoading } = useQuery({
    queryKey: ["medical-map"],
    queryFn: fetchMedicalMap,
    staleTime: 10 * 60 * 1000, // 10 minutes — medical map rarely changes
  });

  /**
   * Translate a raw frequency string (e.g. "3x daily").
   */
  const translateFrequency = useCallback(
    (value: string | null | undefined, locale: string): string => {
      if (!value) return "";
      if (locale === "en" || !map) return value;

      const normalized = normalizeKey(value);
      const key = `frequency.${normalized}`;
      const translations = map[key];

      if (translations && translations[locale as "am" | "ti"]) {
        return translations[locale as "am" | "ti"]!;
      }
      return value; // graceful fallback
    },
    [map],
  );

  /**
   * Translate a raw instruction string (e.g. "Take with food").
   */
  const translateInstruction = useCallback(
    (value: string | null | undefined, locale: string): string => {
      if (!value) return "";
      if (locale === "en" || !map) return value;

      const normalized = normalizeKey(value);
      const key = `instruction.${normalized}`;
      const translations = map[key];

      if (translations && translations[locale as "am" | "ti"]) {
        return translations[locale as "am" | "ti"]!;
      }
      return value;
    },
    [map],
  );

  return {
    translateFrequency,
    translateInstruction,
    isLoading,
    map,
  };
}
