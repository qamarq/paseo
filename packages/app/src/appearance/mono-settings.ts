import { z } from "zod";
import type { MonoColorScheme, MonoDiffPalette } from "@/styles/mono-theme";
import { PLUGIN_THEME_PREFERENCE, type ThemePreference } from "@/styles/theme";

export const MONO_APPEARANCE_RANGES = {
  hue: { min: 0, max: 360 },
  saturation: { min: 0, max: 100 },
  darkLightness: { min: 0, max: 30 },
  sidebarOpacity: { min: 15, max: 100 },
  blurRadius: { min: 1, max: 64 },
  interfaceScale: { min: 50, max: 200 },
} as const;

const DEFAULTS = {
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
} as const;

const DIFF_PALETTES = [
  "default",
  "colorblind",
  "highContrast",
] as const satisfies readonly MonoDiffPalette[];

function clampedInteger(range: { min: number; max: number }, fallback: number) {
  return z
    .number()
    .transform((value) => Math.min(range.max, Math.max(range.min, Math.round(value))))
    .catch(fallback);
}

const ranges = MONO_APPEARANCE_RANGES;

const MonoAppearanceFieldsSchema = z.object({
  scheme: z.enum(["system", "dark", "light"]).catch(DEFAULTS.scheme),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .transform((color) => color.toLowerCase())
    .nullable()
    .catch(DEFAULTS.accentColor),
  diffPalette: z.enum(DIFF_PALETTES).catch(DEFAULTS.diffPalette),
  hue: clampedInteger(ranges.hue, DEFAULTS.hue),
  saturation: clampedInteger(ranges.saturation, DEFAULTS.saturation),
  darkLightness: clampedInteger(ranges.darkLightness, DEFAULTS.darkLightness),
  sidebarOpacity: clampedInteger(ranges.sidebarOpacity, DEFAULTS.sidebarOpacity),
  blurRadius: clampedInteger(ranges.blurRadius, DEFAULTS.blurRadius),
  mainPaneGlass: z.boolean().catch(DEFAULTS.mainPaneGlass),
  interfaceScale: clampedInteger(ranges.interfaceScale, DEFAULTS.interfaceScale),
});

export type MonoAppearance = z.output<typeof MonoAppearanceFieldsSchema>;
export type MonoSchemePreference = MonoAppearance["scheme"];

export const DEFAULT_MONO_APPEARANCE: MonoAppearance = { ...DEFAULTS };

export const MonoAppearanceSchema = MonoAppearanceFieldsSchema.catch(DEFAULT_MONO_APPEARANCE);

export function resolveMonoColorScheme(
  preference: MonoSchemePreference,
  systemScheme: string | null | undefined,
): MonoColorScheme {
  if (preference !== "system") return preference;
  return systemScheme === "light" ? "light" : "dark";
}

export function isMonoActive(input: {
  themePreference: ThemePreference;
  pluginThemeSelected: boolean;
  pluginCatalogsSettled: boolean;
}): boolean {
  if (input.pluginThemeSelected) return false;
  return input.themePreference !== PLUGIN_THEME_PREFERENCE || input.pluginCatalogsSettled;
}

export function resolveMonoGlass(input: {
  active: boolean;
  scheme: MonoColorScheme | null;
  isMac: boolean;
}): boolean {
  return input.active && input.scheme === "dark" && input.isMac;
}
