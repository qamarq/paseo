import type { Theme } from "./theme";

/**
 * The surface something is drawn on top of.
 *
 * A knockout — an element that punches a hole in whatever it overlaps, like the status badge on
 * the corner of a project icon — has to be filled with the colour *behind* it, or the hole reads
 * as a bright halo instead of a gap. It cannot work that colour out for itself: it lives inside a
 * row whose background changes on hover, on selection, while dragging. So the row names its
 * surface and anything knocking out of it matches.
 *
 * A token name rather than a colour because theme colours are only legible inside
 * `StyleSheet.create` — see docs/unistyles.md. Each knockout maps the name to a style of its own.
 * Add a token here when a knockout lands on a surface that isn't listed.
 */
export type SurfaceBackdrop =
  | "surface0"
  | "surface1"
  | "surface2"
  | "surfaceSidebar"
  | "surfaceSidebarHover"
  | "surfaceSidebarSelected";

export type SidebarSurfaceBackdrop = Extract<
  SurfaceBackdrop,
  "surfaceSidebar" | "surfaceSidebarHover" | "surfaceSidebarSelected" | "surface2"
>;

/** The fill a chip or row paints for `backdrop`. Desktop glass swaps in translucent fills. */
export function surfaceFill(theme: Theme, backdrop: SurfaceBackdrop): string {
  return theme.chrome.fills?.[backdrop] ?? theme.colors[backdrop];
}

/**
 * The colour a knockout paints so it reads as a hole in `backdrop`. Under glass nothing behind the
 * window can be matched, so the knockout paints nothing.
 */
export function knockoutColor(theme: Theme, backdrop: SurfaceBackdrop): string {
  return theme.chrome.glass ? "transparent" : theme.colors[backdrop];
}
