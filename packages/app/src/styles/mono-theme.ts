import { parseHexColor } from "@/utils/color";
import {
  buildDarkSemanticColors,
  buildDarkTheme,
  buildLightSemanticColors,
  buildLightTheme,
  DEFAULT_CHROME,
  type ChromeTokens,
  type Theme,
} from "./theme";

export type MonoColorScheme = Theme["colorScheme"];
export type MonoDiffPalette = "default" | "colorblind" | "highContrast";

export interface MonoGlass {
  mainPaneGlass: boolean;
}

export interface MonoThemeInput {
  scheme: MonoColorScheme;
  hue: number;
  saturation: number;
  darkLightness: number;
  accentColor: string | null;
  diffPalette: MonoDiffPalette;
  glass: MonoGlass | null;
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

const MONO_DIFF_BACKGROUND_ALPHA: Record<MonoDiffPalette, number> = {
  default: 0.15,
  colorblind: 0.15,
  highContrast: 0.28,
};

const MONO_DIFF_GUTTER_ALPHA: Record<MonoDiffPalette, number> = {
  default: 0.25,
  colorblind: 0.25,
  highContrast: 0.45,
};

const LIGHT_BACKGROUND_LIGHTNESS = 97;
const TRANSPARENT_TERMINAL = "rgba(0, 0, 0, 0)";
const USER_ACCENT_BUBBLE_STRENGTH = 0.24;
const USER_ACCENT_BORDER_ALPHA = 0.3;
const WINDOW_BACKGROUND_OPACITY = 0.4;
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
  userBubble: 0.1,
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
    userBubble: 0.1,
    muted: 0.68,
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

function quantize(rgb: Rgb): Rgb {
  return [
    Math.round(rgb[0] * 255) / 255,
    Math.round(rgb[1] * 255) / 255,
    Math.round(rgb[2] * 255) / 255,
  ];
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [relativeLuminance(quantize(a)), relativeLuminance(quantize(b))].sort(
    (x, y) => y - x,
  );
  return (light + 0.05) / (dark + 0.05);
}

const MUTED_TEXT_CONTRAST = 4.5;
const MUTED_TEXT_STEP = 0.02;

function readableInk(content: Rgb, background: Rgb, start: number): Rgb {
  for (let step = 0; start + step * MUTED_TEXT_STEP < 1; step++) {
    const color = mix(content, background, start + step * MUTED_TEXT_STEP);
    if (contrastRatio(color, background) >= MUTED_TEXT_CONTRAST) return color;
  }
  return content;
}

const MONO_ACCENT = toHex(hslToRgb(211, 92, 62));
const DESTRUCTIVE: Record<MonoColorScheme, string> = { dark: "#c44a4a", light: "#b04138" };

function resolvePrimary(
  scheme: MonoColorScheme,
  accent: Rgb | null,
  content: Rgb,
  background: Rgb,
): { primary: string; primaryForeground: string } {
  if (accent) return { primary: toHex(accent), primaryForeground: contrastForeground(accent) };
  if (scheme === "dark") return { primary: "#ffffff", primaryForeground: "#000000" };
  return { primary: toHex(content), primaryForeground: toHex(background) };
}

// The gutter overlay lands on the line fill, so its alpha composes up to MonoCode's gutter strength.
function gutterOverlayAlpha(line: number, gutter: number): number {
  return Math.round((1 - (1 - gutter) / (1 - line)) * 1000) / 1000;
}

function diffLineColors(diff: MonoDiffColors, palette: MonoDiffPalette) {
  const alpha = MONO_DIFF_BACKGROUND_ALPHA[palette];
  const gutter = gutterOverlayAlpha(alpha, MONO_DIFF_GUTTER_ALPHA[palette]);
  const tint = (hex: string, value: number) => toRgba(parseHexColor(hex) ?? [0, 0, 0], value);
  return {
    diffAdditionForeground: diff.additionForeground,
    diffDeletionForeground: diff.deletionForeground,
    diffAdditionBackground: tint(diff.addition, alpha),
    diffDeletionBackground: tint(diff.deletion, alpha),
    diffAdditionGutter: tint(diff.addition, gutter),
    diffDeletionGutter: tint(diff.deletion, gutter),
  };
}

function backgroundRgb(
  input: Pick<MonoThemeInput, "scheme" | "hue" | "saturation" | "darkLightness">,
): Rgb {
  return hslToRgb(
    input.hue,
    input.saturation,
    input.scheme === "dark" ? input.darkLightness : LIGHT_BACKGROUND_LIGHTNESS,
  );
}

export function monoWindowTint(input: {
  hue: number;
  saturation: number;
  darkLightness: number;
  sidebarOpacity: number;
}): string {
  const alpha =
    WINDOW_BACKGROUND_OPACITY + (1 - WINDOW_BACKGROUND_OPACITY) * (input.sidebarOpacity / 100);
  return toRgba(backgroundRgb({ ...input, scheme: "dark" }), Math.round(alpha * 1000) / 1000);
}

function glassLayers(
  glass: MonoGlass | null,
  opaque: { surface0: string; surfaceSidebar: string },
) {
  if (glass === null) {
    return {
      surfaceWindow: opaque.surface0,
      surfaceSidebarGlass: opaque.surfaceSidebar,
      surfacePaneGlass: opaque.surface0,
      surfaceWorkspaceGlass: opaque.surface0,
    };
  }
  const pane = glass.mainPaneGlass ? "transparent" : opaque.surface0;
  return {
    surfaceWindow: "transparent",
    surfaceSidebarGlass: "transparent",
    surfacePaneGlass: pane,
    surfaceWorkspaceGlass: pane,
  };
}

// MonoCode's chrome: Tailwind radii and `content`-at-N% fills (UI-SPEC §3-4).
const MONO_FILL = {
  rowHover: 0.05,
  rowSelected: 0.12,
  chipHover: 0.05,
  chipSelected: 0.1,
  floating: 0.02,
  floatingBorder: 0.1,
  modalBorder: 0.07,
  composer: 0.03,
  composerBorder: 0.1,
  inlineCode: 0.08,
  codeBlock: 0.06,
  sectionLabel: 0.4,
  searchFieldBorder: 0.08,
  pill: 0.1,
  rail: 0.14,
  meta: 0.45,
  pillHover: 0.15,
};
const MODAL_BASE_ALPHA = 0.55;
const MONO_PROSE_INK = 0.78;
const MONO_LINK: Record<MonoColorScheme, string> = {
  dark: "#7dd3fc",
  light: toHex(hslToRgb(211, 92, 40)),
};
const MONO_HEADING: Record<MonoColorScheme, string> = { dark: "#f9a8c9", light: "#be185d" };
const VEIL_ALPHA = 0.8;
const MODAL_SCRIM = "rgba(0, 0, 0, 0.4)";
const FLOATING_BLUR = 24;
const COMPOSER_BLUR = 8;

function monoChrome(
  scheme: MonoColorScheme,
  glass: MonoGlass | null,
  content: Rgb,
  background: Rgb,
): ChromeTokens {
  const ink = (alpha: number) => toRgba(content, alpha);
  const dark = scheme === "dark";
  const base = toHex(background);
  return {
    ...DEFAULT_CHROME,
    glass: glass !== null,
    fills: glass
      ? {
          ...(glass.mainPaneGlass ? { surface0: "transparent" } : {}),
          surface1: ink(MONO_FILL.chipHover),
          surface2: ink(MONO_FILL.chipSelected),
          surfaceSidebar: "transparent",
          surfaceSidebarHover: ink(MONO_FILL.rowHover),
          surfaceSidebarSelected: ink(MONO_FILL.rowSelected),
        }
      : null,
    rowRadius: 8,
    navRowHeight: 32,
    rowLabelWeight: "500",
    searchFieldBorder: ink(MONO_FILL.searchFieldBorder),
    sectionLabelSize: 11,
    sectionLabelColor: ink(MONO_FILL.sectionLabel),
    sidebarNavDivider: "transparent",
    tabHeight: 30,
    tabRadius: 6,
    tabLabelSize: 13,
    iconButtonSize: 24,
    floatingRadius: 12,
    floatingFill: dark ? ink(MONO_FILL.floating) : base,
    floatingBorder: ink(MONO_FILL.floatingBorder),
    floatingBlur: dark ? FLOATING_BLUR : 0,
    menuItemRadius: 8,
    selectionFill: ink(MONO_FILL.chipSelected),
    modalRadius: 16,
    modalFill: dark ? toRgba(background, MODAL_BASE_ALPHA) : base,
    modalBorder: ink(MONO_FILL.modalBorder),
    modalBlur: dark ? FLOATING_BLUR : 0,
    scrim: MODAL_SCRIM,
    veil: toRgba(background, VEIL_ALPHA),
    composerRadius: 8,
    composerFill: dark ? ink(MONO_FILL.composer) : base,
    composerBorder: ink(MONO_FILL.composerBorder),
    composerBlur: dark ? COMPOSER_BLUR : 0,
    sendButtonRadius: 6,
    secondaryButtonFill: ink(MONO_FILL.pill),
    pillFill: ink(MONO_FILL.pill),
    pillHoverFill: ink(MONO_FILL.pillHover),
    pillRadius: 6,
    pillTextSize: 12,
    userBubbleRadius: 18,
    userBubblePaddingX: 12,
    userBubblePaddingY: 8,
    railColor: ink(MONO_FILL.rail),
    toolTargetMono: true,
    metaColor: ink(MONO_FILL.meta),
    proseColor: toHex(mix(content, background, MONO_PROSE_INK)),
    linkColor: MONO_LINK[scheme],
    headingColor: MONO_HEADING[scheme],
    inlineCodeRadius: 6,
    inlineCodeFill: ink(MONO_FILL.inlineCode),
    codeBlockRadius: 10,
    codeBlockFill: ink(MONO_FILL.codeBlock),
  };
}

export function buildMonoTheme(input: MonoThemeInput): Theme {
  const { scheme } = input;
  const background = backgroundRgb(input);
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
    foregroundMuted: toHex(readableInk(content, background, INK[scheme].muted)),
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
  const accent = input.accentColor === null ? null : parseHexColor(input.accentColor);
  const primary = resolvePrimary(scheme, accent, content, background);
  const glass = scheme === "dark" ? input.glass : null;
  const overrides = {
    surfaceSidebarHover: glass ? toRgba(content, MONO_FILL.rowHover) : ink("rowHover"),
    surfaceSidebarSelected: glass ? toRgba(content, MONO_FILL.rowSelected) : ink("rowSelected"),
    // An opaque hairline reads as a dark seam over glass; a translucent one stays a hairline.
    ...(glass
      ? {
          border: toRgba(content, INK.dark.stroke),
          borderAccent: toRgba(content, INK.dark.strongStroke),
        }
      : {}),
    surfaceWorkspace: tint.surface0,
    interactionHighlight: toRgba(content, INK[scheme].interaction),
    ...primary,
    actionPrimary: primary.primary,
    actionPrimaryForeground: primary.primaryForeground,
    userBubble: accent
      ? toHex(mix(accent, background, USER_ACCENT_BUBBLE_STRENGTH))
      : ink("userBubble"),
    userBubbleBorder: accent ? toRgba(accent, USER_ACCENT_BORDER_ALPHA) : ink("userBubble"),
    diffAddition: diff.additionForeground,
    diffDeletion: diff.deletionForeground,
    ...diffLineColors(diff, input.diffPalette),
    ...glassLayers(glass, tint),
  };
  const chrome = monoChrome(scheme, glass, content, background);

  if (scheme === "dark") {
    const colors = {
      ...buildDarkSemanticColors({ ...tint, terminalBlack: tint.surfaceSidebar }),
      ...overrides,
    };
    const terminal =
      glass?.mainPaneGlass === true
        ? { ...colors.terminal, background: TRANSPARENT_TERMINAL }
        : colors.terminal;
    return { ...buildDarkTheme({ ...colors, terminal }), chrome };
  }
  return {
    ...buildLightTheme({
      ...buildLightSemanticColors({
        ...tint,
        primary: overrides.primary,
        primaryForeground: overrides.primaryForeground,
        terminalBlack: tint.foreground,
      }),
      ...overrides,
    }),
    chrome,
  };
}
