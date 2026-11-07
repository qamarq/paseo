import { useColorScheme } from "react-native";
import type { MonoColorScheme } from "@/styles/mono-theme";
import type { MonoSchemePreference } from "./mono-settings";

export function useMonoColorScheme(preference: MonoSchemePreference): MonoColorScheme | null {
  const systemScheme = useColorScheme();
  if (preference !== "system") return preference;
  return systemScheme === "light" ? "light" : "dark";
}
