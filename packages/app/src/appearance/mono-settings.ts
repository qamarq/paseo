import { z } from "zod";
import type { MonoDiffPalette } from "@/styles/mono-theme";

export type MonoSchemePreference = "system" | "dark" | "light";

export interface MonoAppearance {
  scheme: MonoSchemePreference;
  /** Lowercase `#rrggbb`; null keeps the neutral default. */
  accentColor: string | null;
  diffPalette: MonoDiffPalette;
  hue: number;
  saturation: number;
  darkLightness: number;
  sidebarOpacity: number;
  blurRadius: number;
  mainPaneGlass: boolean;
  interfaceScale: number;
}

export const MONO_APPEARANCE_RANGES = {
  hue: { min: 0, max: 360 },
  saturation: { min: 0, max: 100 },
  darkLightness: { min: 0, max: 30 },
  sidebarOpacity: { min: 15, max: 100 },
  blurRadius: { min: 1, max: 64 },
  interfaceScale: { min: 50, max: 200 },
} as const;

export const DEFAULT_MONO_APPEARANCE: MonoAppearance = {
  scheme: "dark",
  accentColor: null,
  diffPalette: "default",
  hue: 243,
  saturation: 0,
  darkLightness: 6,
  sidebarOpacity: 45,
  blurRadius: 44,
  mainPaneGlass: true,
  interfaceScale: 100,
};

function clampedInteger(range: { min: number; max: number }, fallback: number) {
  return z
    .number()
    .transform((value) => Math.min(range.max, Math.max(range.min, Math.round(value))))
    .catch(fallback);
}

const defaults = DEFAULT_MONO_APPEARANCE;
const ranges = MONO_APPEARANCE_RANGES;

export const MonoAppearanceSchema = z
  .object({
    scheme: z.enum(["system", "dark", "light"]).catch(defaults.scheme),
    accentColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .transform((color) => color.toLowerCase())
      .nullable()
      .catch(defaults.accentColor),
    diffPalette: z.enum(["default", "colorblind", "highContrast"]).catch(defaults.diffPalette),
    hue: clampedInteger(ranges.hue, defaults.hue),
    saturation: clampedInteger(ranges.saturation, defaults.saturation),
    darkLightness: clampedInteger(ranges.darkLightness, defaults.darkLightness),
    sidebarOpacity: clampedInteger(ranges.sidebarOpacity, defaults.sidebarOpacity),
    blurRadius: clampedInteger(ranges.blurRadius, defaults.blurRadius),
    mainPaneGlass: z.boolean().catch(defaults.mainPaneGlass),
    interfaceScale: clampedInteger(ranges.interfaceScale, defaults.interfaceScale),
  })
  .catch(DEFAULT_MONO_APPEARANCE);
