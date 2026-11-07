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

function clampedInteger(range: { min: number; max: number }, fallback: number, step = 1) {
  return z
    .number()
    .transform((value) => Math.min(range.max, Math.max(range.min, Math.round(value / step) * step)))
    .catch(fallback);
}

const INTERFACE_SCALE_STEP = 10;

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
  interfaceScale: clampedInteger(
    ranges.interfaceScale,
    DEFAULTS.interfaceScale,
    INTERFACE_SCALE_STEP,
  ),
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

export const INTERFACE_SCALE_OPTIONS: readonly number[] = Array.from(
  {
    length: (ranges.interfaceScale.max - ranges.interfaceScale.min) / INTERFACE_SCALE_STEP + 1,
  },
  (_, index) => ranges.interfaceScale.min + index * INTERFACE_SCALE_STEP,
);

export type InterfaceScaleStep = -1 | 0 | 1;

export function readInterfaceScaleStep(payload: unknown): InterfaceScaleStep | null {
  if (typeof payload !== "object" || payload === null || !("step" in payload)) return null;
  const { step } = payload;
  return step === -1 || step === 0 || step === 1 ? step : null;
}

export function stepInterfaceScale(current: number, step: InterfaceScaleStep): number {
  if (step === 0) return DEFAULT_MONO_APPEARANCE.interfaceScale;
  const next =
    step > 0
      ? Math.floor(current / INTERFACE_SCALE_STEP) * INTERFACE_SCALE_STEP + INTERFACE_SCALE_STEP
      : Math.ceil(current / INTERFACE_SCALE_STEP) * INTERFACE_SCALE_STEP - INTERFACE_SCALE_STEP;
  return Math.min(ranges.interfaceScale.max, Math.max(ranges.interfaceScale.min, next));
}

const SCHEME_CYCLE: readonly MonoSchemePreference[] = ["system", "dark", "light"];

export function nextMonoScheme(current: MonoSchemePreference): MonoSchemePreference {
  return SCHEME_CYCLE[(SCHEME_CYCLE.indexOf(current) + 1) % SCHEME_CYCLE.length] ?? "dark";
}
