import { DEFAULT_THEME_PREFERENCE, type AppSettings } from "@/hooks/use-settings";
import { PLUGIN_THEME_PREFERENCE } from "@/styles/theme";
import { nextMonoScheme, type MonoAppearance, type MonoSchemePreference } from "./mono-settings";

export function selectMonoScheme(
  current: AppSettings,
  scheme: MonoSchemePreference,
): Partial<AppSettings> {
  return {
    ...(current.theme === PLUGIN_THEME_PREFERENCE ? { theme: DEFAULT_THEME_PREFERENCE } : {}),
    monoAppearance: { ...current.monoAppearance, scheme },
  };
}

export function cycleMonoScheme(current: AppSettings): Partial<AppSettings> {
  return selectMonoScheme(current, nextMonoScheme(current.monoAppearance.scheme));
}

export function patchMonoAppearance(
  current: AppSettings,
  patch: Partial<MonoAppearance>,
): Partial<AppSettings> {
  return { monoAppearance: { ...current.monoAppearance, ...patch } };
}
