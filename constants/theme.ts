// Design tokens, named by role. Two palettes, light and dark, with the same
// shape so a component only ever reads `colors.<role>` from the active theme.
// Accent is a deep amber that lightens on dark ground so it keeps its warmth
// without glowing.

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfacePressed: string;
  // An elevated panel. On light it matches the background; on dark it sits a
  // step above it.
  card: string;
  text: string;
  textMuted: string;
  // Placeholder and monospaced-label text: quieter than textMuted.
  ghost: string;
  border: string;
  // The unfilled part of a progress track: a step firmer than the border so it
  // still reads as a track once it sits on a raised surface.
  track: string;

  accent: string;
  accentPressed: string;
  accentTint: string;
  // Muted text that stays in the accent family on the amber tint.
  accentTintText: string;
  onAccent: string;
  onAccentSoft: string;

  danger: string;
  shadow: string;

  // Macro data colors: a small three-value palette for rings and charts,
  // deliberately outside the accent's amber family.
  protein: string;
  carbs: string;
  fat: string;
};

export const lightColors: ThemeColors = {
  background: "#FFFFFF",
  surface: "#F6F2EC",
  surfaceRaised: "#FBF8F3",
  surfacePressed: "#EFE9DF",
  card: "#FFFFFF",
  text: "#1C1B1A",
  textMuted: "#736C62",
  ghost: "#A79E92",
  border: "#E8E2D8",
  track: "#DBD2C2",

  accent: "#A15C00",
  accentPressed: "#7C4700",
  accentTint: "#FBEEDC",
  accentTintText: "#8A6234",
  onAccent: "#FFFFFF",
  onAccentSoft: "rgba(255, 255, 255, 0.75)",

  danger: "#C0392B",
  shadow: "rgba(28, 27, 26, 0.18)",

  protein: "#C1495A",
  carbs: "#4F8F6B",
  fat: "#4472A8",
};

export const darkColors: ThemeColors = {
  background: "#131211",
  surface: "#211F1D",
  surfaceRaised: "#1B1A18",
  surfacePressed: "#2A2724",
  card: "#1B1A18",
  text: "#F4F0EA",
  textMuted: "#A39B91",
  ghost: "#6E655C",
  border: "#332F2B",
  track: "#35302A",

  accent: "#E9A94E",
  accentPressed: "#F3BD70",
  accentTint: "#2A2013",
  accentTintText: "#E9A94E",
  onAccent: "#1A1206",
  onAccentSoft: "rgba(26, 18, 6, 0.7)",

  danger: "#E8776A",
  shadow: "rgba(0, 0, 0, 0.5)",

  protein: "#E1788A",
  carbs: "#7FBF9B",
  fat: "#7FA8DC",
};

export type ThemeMode = "light" | "dark";

export const palettes: Record<ThemeMode, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

// A lighter amber for the logo mark when it sits on the ink ground, in either
// theme (the reversed lockup, a dark splash). Not part of the palette because
// it never changes with the theme.
export const accentOnInk = "#F0B357";

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// System font, deliberately: zero-config, renders natively crisp per OS, and
// this app doesn't yet warrant custom font-loading infrastructure. Confidence
// comes from size/weight/line-height, not a display typeface.
export const type = {
  display: {
    fontSize: 32,
    fontWeight: "600" as const,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  title: {
    fontSize: 22,
    fontWeight: "600" as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  // The one figure that carries a whole screen: eaten calories on home, the
  // computed goal on the onboarding review. Nothing else uses this size.
  hero: {
    fontSize: 60,
    fontWeight: "600" as const,
    lineHeight: 58,
    letterSpacing: -2,
  },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 22 },
  bodyStrong: { fontSize: 16, fontWeight: "600" as const, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: "500" as const, lineHeight: 17 },
};

// Every figure the user reads uses this, so digits keep a fixed width and
// columns of numbers line up instead of shifting as the values change.
export const tabular = { fontVariant: ["tabular-nums" as const] };

// A hairline outline on the background, not a filled panel. Spread the result
// into a StyleSheet entry and add padding per use.
export const card = (c: ThemeColors) =>
  ({
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.lg,
  }) as const;

export const cardTight = (c: ThemeColors) =>
  ({ ...card(c), borderRadius: radii.md }) as const;

// One elevation level, tinted with the theme's shadow color. Only for things
// that genuinely float.
export const elevation = (c: ThemeColors) => ({
  floating: {
    shadowColor: c.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});

// Opacity applied to a control that is present but not currently usable.
export const disabledOpacity = 0.45;

// 150ms for press/selection feedback, 250ms for structural transitions.
export const motion = {
  press: 150,
  structural: 250,
};
