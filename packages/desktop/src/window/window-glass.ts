export interface WindowGlassAppearance {
  glass: boolean;
  backgroundColor: string | null;
  glassTint: string | null;
  blurRadius: number;
  zoomFactor: number;
}

export interface WindowGlassUpdate {
  backgroundColor?: string;
  glass?: boolean;
  glassTint?: string;
  blurRadius?: number;
  zoomFactor?: number;
}

export interface NativeGlass {
  apply(handle: Buffer, blurRadius: number | null): void;
}

interface GlassWindow {
  setVibrancy(type: "under-window" | null): void;
  setBackgroundColor(color: string): void;
  getNativeWindowHandle(): Buffer;
  webContents: { getZoomFactor(): number; setZoomFactor(factor: number): void };
}

export const DEFAULT_WINDOW_GLASS_APPEARANCE: WindowGlassAppearance = {
  glass: false,
  backgroundColor: null,
  glassTint: null,
  blurRadius: 44,
  zoomFactor: 1,
};

export const WINDOW_BLUR_RADIUS_RANGE = { min: 1, max: 64 } as const;

export const WINDOW_ZOOM_FACTOR_RANGE = { min: 0.5, max: 2 } as const;

export const WINDOW_GLASS_TINT_PATTERN = /^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0|1|0?\.\d+)\)$/;

const TRANSPARENT_BACKGROUND = "#00000000";
const VIBRANCY = "under-window";
const GLASS_TINT_ARGUMENT_PREFIX = "--paseo-window-glass-tint=";
const PERSIST_DELAY_MS = 300;

function supportsGlass(platform: NodeJS.Platform): boolean {
  return platform === "darwin";
}

export function getGlassWindowOptions(input: {
  platform: NodeJS.Platform;
  appearance: WindowGlassAppearance;
  fallbackBackgroundColor: string;
  nativeGlass: NativeGlass | null;
}): Pick<
  Electron.BrowserWindowConstructorOptions,
  "backgroundColor" | "vibrancy" | "visualEffectState"
> {
  const backgroundColor = input.appearance.backgroundColor ?? input.fallbackBackgroundColor;
  if (!supportsGlass(input.platform)) return { backgroundColor };
  if (!input.appearance.glass) return { backgroundColor, visualEffectState: "active" };
  if (input.nativeGlass) {
    return { backgroundColor: TRANSPARENT_BACKGROUND, visualEffectState: "active" };
  }
  return {
    backgroundColor: TRANSPARENT_BACKGROUND,
    vibrancy: VIBRANCY,
    visualEffectState: "active",
  };
}

export function windowGlassArguments(input: {
  platform: NodeJS.Platform;
  appearance: WindowGlassAppearance;
}): string[] {
  const { glass, glassTint } = input.appearance;
  if (!supportsGlass(input.platform) || !glass || glassTint === null) return [];
  return [`${GLASS_TINT_ARGUMENT_PREFIX}${glassTint}`];
}

function sameAppearance(a: WindowGlassAppearance, b: WindowGlassAppearance): boolean {
  return (
    a.glass === b.glass &&
    a.backgroundColor === b.backgroundColor &&
    a.glassTint === b.glassTint &&
    a.blurRadius === b.blurRadius &&
    a.zoomFactor === b.zoomFactor
  );
}

export interface WindowGlassController {
  register(
    win: GlassWindow,
    appearance: WindowGlassAppearance,
    fallbackBackgroundColor: string,
  ): void;
  apply(win: GlassWindow, update: WindowGlassUpdate): void;
  flush(): void;
}

export function createWindowGlassController(input: {
  platform: NodeJS.Platform;
  persist: (appearance: WindowGlassAppearance) => void;
  nativeGlass: NativeGlass | null;
}): WindowGlassController {
  const states = new WeakMap<GlassWindow, WindowGlassAppearance>();
  const { nativeGlass } = input;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let pending: WindowGlassAppearance | null = null;

  function persistNow(): void {
    if (persistTimer !== null) clearTimeout(persistTimer);
    persistTimer = null;
    if (pending === null) return;
    const appearance = pending;
    pending = null;
    input.persist(appearance);
  }

  function schedulePersist(appearance: WindowGlassAppearance): void {
    if (persistTimer !== null) clearTimeout(persistTimer);
    pending = appearance;
    persistTimer = setTimeout(persistNow, PERSIST_DELAY_MS);
  }

  function updateBackdrop(
    win: GlassWindow,
    current: WindowGlassAppearance,
    next: WindowGlassAppearance,
  ): void {
    const glassChanged = next.glass !== current.glass;
    if (!nativeGlass) {
      if (glassChanged) win.setVibrancy(next.glass ? VIBRANCY : null);
      return;
    }
    const radiusChanged = next.glass && next.blurRadius !== current.blurRadius;
    if (glassChanged || radiusChanged) {
      nativeGlass.apply(win.getNativeWindowHandle(), next.glass ? next.blurRadius : null);
    }
  }

  return {
    register(win, appearance, fallbackBackgroundColor) {
      const state: WindowGlassAppearance = {
        ...appearance,
        glass: supportsGlass(input.platform) && appearance.glass,
        backgroundColor: appearance.backgroundColor ?? fallbackBackgroundColor,
      };
      states.set(win, state);
      if (state.glass) nativeGlass?.apply(win.getNativeWindowHandle(), state.blurRadius);
    },

    apply(win, update) {
      const current = states.get(win) ?? DEFAULT_WINDOW_GLASS_APPEARANCE;
      const requestedBackground = update.backgroundColor ? update.backgroundColor : null;
      const next: WindowGlassAppearance = {
        glass: supportsGlass(input.platform) && (update.glass ?? current.glass),
        backgroundColor: requestedBackground ?? current.backgroundColor,
        glassTint: update.glassTint ?? current.glassTint,
        blurRadius: update.blurRadius ?? current.blurRadius,
        zoomFactor: update.zoomFactor ?? current.zoomFactor,
      };
      states.set(win, next);

      // Chromium shares zoom per origin, so another window may have moved this one's zoom.
      if (update.zoomFactor !== undefined && win.webContents.getZoomFactor() !== next.zoomFactor) {
        win.webContents.setZoomFactor(next.zoomFactor);
      }
      updateBackdrop(win, current, next);
      const glassChanged = next.glass !== current.glass;
      const backgroundColor = next.glass ? TRANSPARENT_BACKGROUND : next.backgroundColor;
      if (backgroundColor !== null && (glassChanged || requestedBackground !== null)) {
        win.setBackgroundColor(backgroundColor);
      }
      if (!sameAppearance(current, next)) schedulePersist(next);
    },

    flush: persistNow,
  };
}
