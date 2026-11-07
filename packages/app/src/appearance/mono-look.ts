import type { MonoColorScheme } from "@/styles/mono-theme";
import type { MonoAppearance } from "./mono-settings";

export interface MonoLook {
  scheme: MonoColorScheme;
  glass: boolean;
}

export function useMonoLook(_appearance: MonoAppearance | null, _active: boolean): MonoLook | null {
  return null;
}
