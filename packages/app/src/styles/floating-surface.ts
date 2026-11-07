import type { Theme } from "./theme";
import { backdropBlur } from "./web-effects";

/**
 * Fill, edge, radius and blur of a menu, popover or tooltip. Each caller passes the values it
 * paints today; the desktop Mono theme swaps in a frosted 12px glass frame.
 */
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

/** The same for a modal panel: a 16px glass frame on Mono. */
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
