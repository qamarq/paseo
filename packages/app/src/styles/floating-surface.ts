import type { Theme } from "./theme";
import { backdropBlur } from "./web-effects";

type SurfaceShadow = Theme["shadow"][keyof Theme["shadow"]];

interface SurfaceDefaults {
  backgroundColor: string;
  borderColor: string;
  borderRadius: number;
  shadow?: SurfaceShadow;
}

function surfaceShadow(theme: Theme, shadow: SurfaceShadow | undefined) {
  if (theme.chrome.floatingShadow !== null) return { boxShadow: theme.chrome.floatingShadow };
  return shadow ?? {};
}

export function floatingSurfaceStyle(theme: Theme, defaults: SurfaceDefaults) {
  return {
    backgroundColor: theme.chrome.floatingFill ?? defaults.backgroundColor,
    borderColor: theme.chrome.floatingBorder ?? defaults.borderColor,
    borderRadius: theme.chrome.floatingRadius ?? defaults.borderRadius,
    ...surfaceShadow(theme, defaults.shadow),
    ...backdropBlur(theme.chrome.floatingBlur, theme.chrome.frostBase),
  };
}

export function modalSurfaceStyle(theme: Theme, defaults: SurfaceDefaults) {
  return {
    backgroundColor: theme.chrome.modalFill ?? defaults.backgroundColor,
    borderColor: theme.chrome.modalBorder ?? defaults.borderColor,
    borderRadius: theme.chrome.modalRadius ?? defaults.borderRadius,
    ...surfaceShadow(theme, defaults.shadow),
    ...backdropBlur(theme.chrome.modalBlur, theme.chrome.frostBase),
  };
}
