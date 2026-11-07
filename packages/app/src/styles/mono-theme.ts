import { parseHexColor } from "@/utils/color";
import {
  buildDarkSemanticColors,
  buildDarkTheme,
  buildLightSemanticColors,
  buildLightTheme,
  type Theme,
} from "./theme";

export type MonoColorScheme = Theme["colorScheme"];
export type MonoDiffPalette = "default" | "colorblind" | "highContrast";

export interface MonoThemeInput {
  scheme: MonoColorScheme;
  hue: number;
  saturation: number;
  darkLightness: number;
  accentColor: string | null;
  diffPalette: MonoDiffPalette;
}

export interface MonoDiffColors {
  addition: string;
  additionForeground: string;
  deletion: string;
  deletionForeground: string;
}

export const MONO_DIFF_PALETTES: Record<
  MonoDiffPalette,
  Record<MonoColorScheme, MonoDiffColors>
> = {
  default: {
    dark: {
      addition: "#10b981",
      additionForeground: "#6ee7b7",
      deletion: "#f43f5e",
      deletionForeground: "#fda4af",
    },
    light: {
      addition: "#10b981",
      additionForeground: "#047857",
      deletion: "#f43f5e",
      deletionForeground: "#be123c",
    },
  },
  colorblind: {
    dark: {
      addition: "#388bfd",
      additionForeground: "#79c0ff",
      deletion: "#db6d28",
      deletionForeground: "#ffa657",
    },
    light: {
      addition: "#0969da",
      additionForeground: "#0550ae",
      deletion: "#bc4c00",
      deletionForeground: "#953800",
    },
  },
  highContrast: {
    dark: {
      addition: "#58a6ff",
      additionForeground: "#cae8ff",
      deletion: "#f0883e",
      deletionForeground: "#ffdfb6",
    },
    light: {
      addition: "#0550ae",
      additionForeground: "#032563",
      deletion: "#953800",
      deletionForeground: "#471700",
    },
  },
};

const LIGHT_BACKGROUND_LIGHTNESS = 97;
const CONTENT_LIGHTNESS: Record<MonoColorScheme, number> = { dark: 92, light: 18 };

// Fractions of `content` over `background`, from MonoCode's opacity-derived fills.
const DARK_INK = {
  surface1: 0.03,
  surface2: 0.1,
  surface3: 0.2,
  surface4: 0.3,
  rowHover: 0.05,
  rowSelected: 0.12,
  stroke: 0.07,
  strongStroke: 0.1,
  interaction: 0.1,
  muted: 0.5,
  extraMuted: 0.35,
  terminalBrightBlack: 0.2,
};

const INK: Record<MonoColorScheme, typeof DARK_INK> = {
  dark: DARK_INK,
  light: {
    surface1: 0.03,
    surface2: 0.06,
    surface3: 0.14,
    surface4: 0.2,
    rowHover: 0.05,
    rowSelected: 0.07,
    stroke: 0.07,
    strongStroke: 0.1,
    interaction: 0.1,
    muted: 0.5,
    extraMuted: 0.35,
    terminalBrightBlack: 0.75,
  },
};

type Rgb = [number, number, number];

function hslToRgb(hue: number, saturation: number, lightness: number): Rgb {
  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [channel(0), channel(8), channel(4)];
}

function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((channel) =>
      Math.min(255, Math.max(0, Math.round(channel * 255)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function toRgba(rgb: Rgb, alpha: number): string {
  const [r, g, b] = rgb.map((channel) => Math.round(channel * 255));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mix(top: Rgb, bottom: Rgb, amount: number): Rgb {
  return [
    bottom[0] + (top[0] - bottom[0]) * amount,
    bottom[1] + (top[1] - bottom[1]) * amount,
    bottom[2] + (top[2] - bottom[2]) * amount,
  ];
}

function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastForeground(rgb: Rgb): string {
  return relativeLuminance(rgb) > 0.179 ? "#000000" : "#ffffff";
}

const MONO_ACCENT = toHex(hslToRgb(211, 92, 62));
const DESTRUCTIVE: Record<MonoColorScheme, string> = { dark: "#c44a4a", light: "#b04138" };

function resolvePrimary(
  scheme: MonoColorScheme,
  accentColor: string | null,
  content: Rgb,
  background: Rgb,
): { primary: string; primaryForeground: string } {
  const accent = accentColor === null ? null : parseHexColor(accentColor);
  if (accent) return { primary: toHex(accent), primaryForeground: contrastForeground(accent) };
  if (scheme === "dark") return { primary: "#ffffff", primaryForeground: "#000000" };
  return { primary: toHex(content), primaryForeground: toHex(background) };
}

export function buildMonoTheme(input: MonoThemeInput): Theme {
  const { scheme } = input;
  const background = hslToRgb(
    input.hue,
    input.saturation,
    scheme === "dark" ? input.darkLightness : LIGHT_BACKGROUND_LIGHTNESS,
  );
  const content = hslToRgb(input.hue, input.saturation, CONTENT_LIGHTNESS[scheme]);
  const ink = (key: keyof typeof DARK_INK) => toHex(mix(content, background, INK[scheme][key]));
  const diff = MONO_DIFF_PALETTES[input.diffPalette][scheme];

  const tint = {
    surface0: toHex(background),
    surface1: ink("surface1"),
    surface2: ink("surface2"),
    surface3: ink("surface3"),
    surface4: ink("surface4"),
    surfaceDiffEmpty: ink("surface1"),
    surfaceSidebar: toHex(scheme === "dark" ? mix(background, [0, 0, 0], 0.9) : background),
    foreground: toHex(content),
    foregroundMuted: ink("muted"),
    foregroundExtraMuted: ink("extraMuted"),
    border: ink("stroke"),
    borderAccent: ink("strongStroke"),
    accent: MONO_ACCENT,
    accentBright: MONO_ACCENT,
    accentForeground: "#ffffff",
    destructive: DESTRUCTIVE[scheme],
    terminalBrightBlack: ink("terminalBrightBlack"),
    ring: MONO_ACCENT,
  };
  const overrides = {
    surfaceSidebarHover: ink("rowHover"),
    surfaceSidebarSelected: ink("rowSelected"),
    surfaceWorkspace: tint.surface0,
    interactionHighlight: toRgba(content, INK[scheme].interaction),
    ...resolvePrimary(scheme, input.accentColor, content, background),
    diffAddition: diff.additionForeground,
    diffDeletion: diff.deletionForeground,
  };

  if (scheme === "dark") {
    return buildDarkTheme({
      ...buildDarkSemanticColors({ ...tint, terminalBlack: tint.surfaceSidebar }),
      ...overrides,
    });
  }
  return buildLightTheme({
    ...buildLightSemanticColors({
      ...tint,
      primary: overrides.primary,
      primaryForeground: overrides.primaryForeground,
      terminalBlack: tint.foreground,
    }),
    ...overrides,
  });
}
