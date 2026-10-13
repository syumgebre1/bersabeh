/**
 * The "Urban Ethio" design system.
 *
 * Every color, spacing, radius, and typography token used anywhere in the
 * app comes from here. Never type a hex code or magic number in a component.
 *
 * Design principles (from the spec):
 *   - Contemporary Addis energy
 *   - Bold indigo + terracotta, geometric Ethiopian-inspired accents
 *   - Modern and alive, not "AI-slop"
 *   - No purple/blue gradients, no glassmorphism, no blobs
 *   - Border radius 8px max
 *
 * Exports:
 *   - `theme`  — the actual token object
 *   - `Theme`  — the TypeScript type (for component prop typing)
 */

// ============================================================
// Colors
// ============================================================

const palette = {
  // Brand
  primary: "#2A2A72",       // bold indigo
  primaryDark: "#1B1B4D",   // indigo, darkened
  primaryLight: "#4A4A94",  // indigo, lightened (for hover, subtle backgrounds)
  secondary: "#C75B39",     // terracotta
  secondaryDark: "#A04527",
  secondaryLight: "#E07D5E",
  accent: "#E8B23A",        // warm gold
  accentDark: "#C89420",
  accentLight: "#F5CE6F",

  // Neutrals
  text: "#14141F",
  textInverse: "#FFFFFF",
  muted: "#6B6B7B",
  mutedLight: "#9A9AA8",
  bg: "#FBF8F3",            // warm off-white
  bgElevated: "#FFFFFF",    // cards on bg
  bgSunken: "#F5F0E8",      // subtle inset areas
  surface: "#FFFFFF",
  border: "#E5E0D5",
  borderStrong: "#CFC7B5",

  // Status
  success: "#2F7D5C",
  successBg: "#E6F2EC",
  warning: "#C68A1D",
  warningBg: "#FBF0DA",
  danger: "#B23A3A",
  dangerBg: "#F6E2E2",
  info: "#3A6BB2",
  infoBg: "#E1E9F4",
} as const;


// ============================================================
// Spacing scale — 4px base unit, no arbitrary values
// ============================================================
const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;


// ============================================================
// Border radius — spec says max 8px
// ============================================================
const radius = {
  none: 0,
  sm: 4,
  md: 8,       // the standard for buttons, cards, inputs
  full: 999,   // for pills and avatars
} as const;


// ============================================================
// Typography
// ============================================================
const fontFamily = {
  heading: "SpaceGrotesk_700Bold",
  headingMedium: "SpaceGrotesk_500Medium",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodyBold: "Inter_700Bold",
  // Ethiopic fonts — used when locale is am or ti
  headingAm: "NotoSansEthiopic_700Bold",
  headingAmMedium: "NotoSansEthiopic_500Medium",
  bodyAm: "NotoSansEthiopic_400Regular",
  bodyAmBold: "NotoSansEthiopic_700Bold",
} as const;

const typography = {
  // Display — hero headlines
  display: { fontSize: 40, lineHeight: 46, letterSpacing: -0.5, fontFamily: fontFamily.heading },
  h1: { fontSize: 32, lineHeight: 38, letterSpacing: -0.3, fontFamily: fontFamily.heading },
  h2: { fontSize: 26, lineHeight: 32, letterSpacing: -0.2, fontFamily: fontFamily.heading },
  h3: { fontSize: 20, lineHeight: 26, letterSpacing: 0, fontFamily: fontFamily.heading },
  h4: { fontSize: 17, lineHeight: 22, letterSpacing: 0, fontFamily: fontFamily.headingMedium },

  // Body
  bodyLg: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.body },
  body: { fontSize: 14, lineHeight: 21, fontFamily: fontFamily.body },
  bodySm: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.body },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.body },
  label: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.bodyMedium, letterSpacing: 0.3, textTransform: "uppercase" as const },
  button: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.bodyBold, letterSpacing: 0.2 },
} as const;


// ============================================================
// Shadows — soft, no glass
// ============================================================
const shadow = {
  none: {},
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;


// ============================================================
// Layout
// ============================================================
const layout = {
  maxContentWidth: 1200,     // for web wide screens
  maxNarrowWidth: 480,       // for auth forms
  headerHeight: 64,
  utilityBarHeight: 32,
  tabBarHeight: 56,
  screenPaddingH: 20,
  screenPaddingV: 16,
} as const;


// ============================================================
// Semantic status color mappings
// ============================================================
const billStatusColors = {
  unpaid: { fg: palette.danger, bg: palette.dangerBg },
  partial: { fg: palette.warning, bg: palette.warningBg },
  paid: { fg: palette.success, bg: palette.successBg },
  cancelled: { fg: palette.muted, bg: palette.bgSunken },
} as const;

const appointmentStatusColors = {
  scheduled: { fg: palette.info, bg: palette.infoBg },
  confirmed: { fg: palette.info, bg: palette.infoBg },
  checked_in: { fg: palette.accentDark, bg: palette.warningBg },
  completed: { fg: palette.success, bg: palette.successBg },
  cancelled: { fg: palette.muted, bg: palette.bgSunken },
  no_show: { fg: palette.danger, bg: palette.dangerBg },
} as const;

const encounterStatusColors = {
  open: { fg: palette.accentDark, bg: palette.warningBg },
  closed: { fg: palette.success, bg: palette.successBg },
} as const;

const callStatusColors = {
  requested: { fg: palette.info, bg: palette.infoBg },
  assigned: { fg: palette.info, bg: palette.infoBg },
  accepted: { fg: palette.accentDark, bg: palette.warningBg },
  in_progress: { fg: palette.secondary, bg: "#F9E3DA" },
  ended: { fg: palette.success, bg: palette.successBg },
  cancelled: { fg: palette.muted, bg: palette.bgSunken },
} as const;

const userRoleLabels = {
  super_admin: "Super Admin",
  admin: "Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  reception: "Reception",
  lab: "Lab",
  patient: "Patient",
} as const;


// ============================================================
// Public theme object
// ============================================================
export const theme = {
  colors: palette,
  spacing,
  radius,
  fontFamily,
  typography,
  shadow,
  layout,
  // Status maps
  status: {
    bill: billStatusColors,
    appointment: appointmentStatusColors,
    encounter: encounterStatusColors,
    call: callStatusColors,
  },
  userRoleLabels,
} as const;

export type Theme = typeof theme;
export default theme;
