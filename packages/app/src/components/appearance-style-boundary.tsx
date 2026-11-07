import { Fragment, useEffect, useState, type ReactNode } from "react";
import { withUnistyles } from "react-native-unistyles";
import { getIsElectron } from "@/constants/platform";
import type { Theme } from "@/styles/theme";

/**
 * How a subtree follows colour-only changes. "remount" re-keys it, for parsed content that bakes
 * colours in. "inPlace" relies on web CSS variables and themed props, for screens whose own
 * controls drive the change (a remount mid-drag drops the dragged slider).
 */
export type AppearanceColorChanges = "remount" | "inPlace";

// Desktop Mono sliders rebuild the theme several times a second; remount once they settle.
const DESKTOP_COLOR_SETTLE_MS = 400;

interface AppearanceStyleBoundaryProps {
  appearanceKey?: string;
  colorKey?: string;
  colorChanges: AppearanceColorChanges;
  children: ReactNode;
}

// Remounts its children when an appearance token changes. Memoized and parsed content bakes
// tokens in, and on web numeric tokens (font sizes, line heights) are baked into generated
// classes that only a re-render refreshes. Native tracked styles update in place.
// Keep native gesture hosts outside these keys too: shared gesture refs can outlive detached
// dependent views until passive cleanup. It must sit below every native navigator: remounting
// a navigator while settings hydrate
// detaches its screen container inside a FragmentManager transaction and crashes Android.
// `ThemedStack` places one per screen; the app shell places them around the chrome outside the
// navigators.
function AppearanceStyleBoundaryBase({
  appearanceKey,
  colorKey,
  colorChanges,
  children,
}: AppearanceStyleBoundaryProps) {
  const settledColorKey = useSettledValue(colorKey, getIsElectron() ? DESKTOP_COLOR_SETTLE_MS : 0);
  const key =
    colorChanges === "inPlace" ? appearanceKey : `${appearanceKey}\u0001${settledColorKey}`;
  return <Fragment key={key}>{children}</Fragment>;
}

function useSettledValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    if (delayMs === 0) return;
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return delayMs === 0 ? value : settled;
}

export function appearanceStyleBoundaryKey(theme: Theme): string {
  return [appearanceLayoutKey(theme), appearanceColorKey(theme)].join("\u0001");
}

/** Fonts and sizes: web bakes numeric tokens into generated classes, so these always remount. */
export function appearanceLayoutKey(theme: Theme): string {
  return [
    theme.fontFamily.ui,
    theme.fontFamily.mono,
    theme.fontSize.sm,
    theme.fontSize.base,
    theme.fontSize.lg,
    theme.fontSize.xl,
    theme.fontSize["2xl"],
    theme.fontSize["3xl"],
    theme.fontSize["4xl"],
    theme.fontSize.content,
    theme.fontSize.code,
    theme.lineHeight.diff,
  ].join("\u0000");
}

export function appearanceColorKey(theme: Theme): string {
  return [
    theme.colors.foreground,
    theme.colors.foregroundMuted,
    theme.colors.mutedForeground,
    theme.colors.surface1,
    theme.colors.surface2,
    theme.colors.border,
    theme.colors.accentBright,
    theme.colors.syntax.keyword,
    theme.colors.syntax.comment,
    theme.colors.syntax.string,
    theme.colors.syntax.number,
    theme.colors.syntax.literal,
    theme.colors.syntax.function,
    theme.colors.syntax.definition,
    theme.colors.syntax.class,
    theme.colors.syntax.type,
    theme.colors.syntax.tag,
    theme.colors.syntax.attribute,
    theme.colors.syntax.property,
    theme.colors.syntax.variable,
    theme.colors.syntax.operator,
    theme.colors.syntax.punctuation,
    theme.colors.syntax.regexp,
    theme.colors.syntax.escape,
    theme.colors.syntax.meta,
    theme.colors.syntax.heading,
    theme.colors.syntax.link,
  ].join("\u0000");
}

function appearanceStyleBoundaryMapping(theme: Theme): Partial<AppearanceStyleBoundaryProps> {
  return { appearanceKey: appearanceLayoutKey(theme), colorKey: appearanceColorKey(theme) };
}

const ThemedAppearanceStyleBoundary = withUnistyles(AppearanceStyleBoundaryBase);

export function AppearanceStyleBoundary({
  colorChanges = "remount",
  children,
}: {
  colorChanges?: AppearanceColorChanges;
  children: ReactNode;
}) {
  return (
    <ThemedAppearanceStyleBoundary
      colorChanges={colorChanges}
      uniProps={appearanceStyleBoundaryMapping}
    >
      {children}
    </ThemedAppearanceStyleBoundary>
  );
}
