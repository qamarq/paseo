import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { getIsElectronMac } from "@/constants/platform";
import { updateDesktopWindowChrome } from "@/desktop/electron/window";
import { monoWindowTint } from "@/styles/mono-theme";
import type { MonoLook } from "./mono-look";
import { resolveMonoColorScheme, resolveMonoGlass, type MonoAppearance } from "./mono-settings";

const WINDOW_TINT_PROPERTY = "--paseo-window-tint";

function paintWindowTint(tint: string | null): void {
  const html = document.documentElement;
  html.style.setProperty(WINDOW_TINT_PROPERTY, tint ?? "transparent");
  html.style.setProperty("background-color", `var(${WINDOW_TINT_PROPERTY})`, "important");
  document.body.style.setProperty("background-color", "transparent", "important");
}

export function useMonoLook(appearance: MonoAppearance | null, active: boolean): MonoLook | null {
  const systemScheme = useColorScheme();
  const scheme = appearance ? resolveMonoColorScheme(appearance.scheme, systemScheme) : null;
  const glass = resolveMonoGlass({ active, scheme, isMac: getIsElectronMac() });
  const tint = appearance && glass ? monoWindowTint(appearance) : null;
  const blurRadius = appearance && glass ? appearance.blurRadius : null;
  const ready = appearance !== null;

  useEffect(() => {
    if (!ready || !getIsElectronMac()) return;
    paintWindowTint(tint);
    void updateDesktopWindowChrome({
      glass: tint !== null,
      ...(tint ? { glassTint: tint } : {}),
      ...(blurRadius !== null ? { blurRadius } : {}),
    }).catch((error) => {
      console.warn("[DesktopWindow] Failed to update window glass", error);
    });
  }, [ready, tint, blurRadius]);

  return active && scheme ? { scheme, glass } : null;
}
