import type { Theme } from "./theme";
import { backdropBlur } from "./web-effects";

export function floatingSurfaceStyle(
  theme: Theme,
  defaults: { backgroundColor: string; borderColor: string; borderRadius: number },
) {
  return {
    backgroundColor: theme.chrome.floatingFill ?? defaults.backgroundColor,
    borderColor: theme.chrome.floatingBorder ?? defaults.borderColor,
    borderRadius: theme.chrome.floatingRadius ?? defaults.borderRadius,
    ...backdropBlur(theme.chrome.floatingBlur),
  };
}

export function modalSurfaceStyle(
  theme: Theme,
  defaults: { backgroundColor: string; borderColor: string; borderRadius: number },
) {
  return {
    backgroundColor: theme.chrome.modalFill ?? defaults.backgroundColor,
    borderColor: theme.chrome.modalBorder ?? defaults.borderColor,
    borderRadius: theme.chrome.modalRadius ?? defaults.borderRadius,
    ...backdropBlur(theme.chrome.modalBlur),
  };
}
