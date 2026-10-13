/**
 * Central font loading hook.
 *
 * Loads:
 *   - Space Grotesk (700 Bold, 500 Medium) — Latin headings
 *   - Inter (400, 500, 700)                — Latin body
 *   - Noto Sans Ethiopic (400, 500, 700)   — Amharic / Tigrigna
 *
 * Returns `[fontsLoaded, error]`. The root layout waits for fontsLoaded
 * before rendering children so there's no flash of unstyled text.
 */

import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts as useSpaceGrotesk,
} from "@expo-google-fonts/space-grotesk";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  NotoSansEthiopic_400Regular,
  NotoSansEthiopic_500Medium,
  NotoSansEthiopic_700Bold,
} from "@expo-google-fonts/noto-sans-ethiopic";

export function useFonts(): readonly [boolean, Error | null] {
  const [loaded, error] = useSpaceGrotesk({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    NotoSansEthiopic_400Regular,
    NotoSansEthiopic_500Medium,
    NotoSansEthiopic_700Bold,
  });

  return [loaded, error] as const;
}

export default useFonts;
