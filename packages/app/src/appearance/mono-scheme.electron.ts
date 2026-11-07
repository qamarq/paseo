import { useColorScheme } from "react-native";
import type { MonoColorScheme } from "@/styles/mono-theme";
import { resolveMonoColorScheme, type MonoSchemePreference } from "./mono-settings";

export function useMonoColorScheme(preference: MonoSchemePreference): MonoColorScheme | null {
  return resolveMonoColorScheme(preference, useColorScheme());
}
