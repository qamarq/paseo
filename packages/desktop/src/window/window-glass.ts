export interface WindowGlassAppearance {
  glass: boolean;
  backgroundColor: string | null;
  glassTint: string | null;
  zoomFactor: number;
}

export interface WindowGlassUpdate {
  backgroundColor?: string;
  glass?: boolean;
  glassTint?: string;
  zoomFactor?: number;
}

interface GlassWindow {
  setVibrancy(type: "under-window" | null): void;
  setBackgroundColor(color: string): void;
  webContents: { setZoomFactor(factor: number): void };
}

export const DEFAULT_WINDOW_GLASS_APPEARANCE: WindowGlassAppearance = {
  glass: false,
  backgroundColor: null,
  glassTint: null,
  zoomFactor: 1,
};

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
}): Pick<
  Electron.BrowserWindowConstructorOptions,
  "backgroundColor" | "vibrancy" | "visualEffectState"
> {
  const backgroundColor = input.appearance.backgroundColor ?? input.fallbackBackgroundColor;
  if (!supportsGlass(input.platform)) return { backgroundColor };
  if (!input.appearance.glass) return { backgroundColor, visualEffectState: "active" };
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
}): WindowGlassController {
  const states = new WeakMap<GlassWindow, WindowGlassAppearance>();
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

  return {
    register(win, appearance, fallbackBackgroundColor) {
      states.set(win, {
        ...appearance,
        glass: supportsGlass(input.platform) && appearance.glass,
        backgroundColor: appearance.backgroundColor ?? fallbackBackgroundColor,
      });
    },

    apply(win, update) {
      const current = states.get(win) ?? DEFAULT_WINDOW_GLASS_APPEARANCE;
      const requestedBackground = update.backgroundColor ? update.backgroundColor : null;
      const next: WindowGlassAppearance = {
        glass: supportsGlass(input.platform) && (update.glass ?? current.glass),
        backgroundColor: requestedBackground ?? current.backgroundColor,
        glassTint: update.glassTint ?? current.glassTint,
        zoomFactor: update.zoomFactor ?? current.zoomFactor,
      };
      states.set(win, next);

      if (next.zoomFactor !== current.zoomFactor) win.webContents.setZoomFactor(next.zoomFactor);
      const glassChanged = next.glass !== current.glass;
      if (glassChanged) win.setVibrancy(next.glass ? VIBRANCY : null);
      const backgroundColor = next.glass ? TRANSPARENT_BACKGROUND : next.backgroundColor;
      if (backgroundColor !== null && (glassChanged || requestedBackground !== null)) {
        win.setBackgroundColor(backgroundColor);
      }
      if (!sameAppearance(current, next)) schedulePersist(next);
    },

    flush: persistNow,
  };
}
