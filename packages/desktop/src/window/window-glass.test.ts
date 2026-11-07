import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createWindowGlassController,
  DEFAULT_WINDOW_GLASS_APPEARANCE,
  getGlassWindowOptions,
  windowGlassArguments,
  type NativeGlass,
  type WindowGlassAppearance,
} from "./window-glass";

const GLASS: WindowGlassAppearance = {
  glass: true,
  backgroundColor: "#0f0f0f",
  glassTint: "rgba(15, 15, 15, 0.67)",
  blurRadius: 44,
  zoomFactor: 1,
};

const HANDLE = Buffer.from("native-window-handle");

function createFakeNativeGlass(calls: Array<[string, string | null]>): NativeGlass {
  return {
    apply: (handle, blurRadius) => {
      expect(handle).toBe(HANDLE);
      calls.push(["native", blurRadius === null ? null : String(blurRadius)]);
    },
  };
}

function createFakeWindow() {
  const calls: Array<[string, string | null]> = [];
  const zoom = { factor: 1 };
  return {
    calls,
    zoom,
    setVibrancy: (type: "under-window" | null) => calls.push(["vibrancy", type]),
    setBackgroundColor: (color: string) => calls.push(["background", color]),
    getNativeWindowHandle: () => HANDLE,
    webContents: {
      getZoomFactor: () => zoom.factor,
      setZoomFactor: (factor: number) => {
        zoom.factor = factor;
        calls.push(["zoom", String(factor)]);
      },
    },
  };
}

describe("getGlassWindowOptions", () => {
  it("opens a glass window on macOS with vibrancy over a transparent background", () => {
    expect(
      getGlassWindowOptions({
        platform: "darwin",
        appearance: GLASS,
        fallbackBackgroundColor: "#181B1A",
        nativeGlass: null,
      }),
    ).toEqual({
      backgroundColor: "#00000000",
      vibrancy: "under-window",
      visualEffectState: "active",
    });
  });

  it("opens opaque in the last background color when glass was off", () => {
    expect(
      getGlassWindowOptions({
        platform: "darwin",
        appearance: { ...GLASS, glass: false },
        fallbackBackgroundColor: "#181B1A",
        nativeGlass: null,
      }),
    ).toEqual({ backgroundColor: "#0f0f0f", visualEffectState: "active" });
  });

  it("falls back to the system color before any appearance is saved", () => {
    expect(
      getGlassWindowOptions({
        platform: "darwin",
        appearance: DEFAULT_WINDOW_GLASS_APPEARANCE,
        fallbackBackgroundColor: "#181B1A",
        nativeGlass: null,
      }),
    ).toEqual({ backgroundColor: "#181B1A", visualEffectState: "active" });
  });

  it("leaves vibrancy to the native backdrop when it is available", () => {
    expect(
      getGlassWindowOptions({
        platform: "darwin",
        appearance: GLASS,
        fallbackBackgroundColor: "#181B1A",
        nativeGlass: createFakeNativeGlass([]),
      }),
    ).toEqual({ backgroundColor: "#00000000", visualEffectState: "active" });
  });

  it.each(["win32", "linux"] as const)("keeps %s windows opaque", (platform) => {
    expect(
      getGlassWindowOptions({
        platform,
        appearance: GLASS,
        fallbackBackgroundColor: "#181B1A",
        nativeGlass: null,
      }),
    ).toEqual({ backgroundColor: "#0f0f0f" });
  });
});

describe("windowGlassArguments", () => {
  it("hands the saved tint to the preload only for macOS glass windows", () => {
    expect(windowGlassArguments({ platform: "darwin", appearance: GLASS })).toEqual([
      "--paseo-window-glass-tint=rgba(15, 15, 15, 0.67)",
    ]);
    expect(
      windowGlassArguments({ platform: "darwin", appearance: { ...GLASS, glass: false } }),
    ).toEqual([]);
    expect(windowGlassArguments({ platform: "linux", appearance: GLASS })).toEqual([]);
  });
});

describe("createWindowGlassController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("turns vibrancy on and keeps the background transparent while glass is on", () => {
    const persisted: WindowGlassAppearance[] = [];
    const controller = createWindowGlassController({
      platform: "darwin",
      nativeGlass: null,
      persist: (appearance) => persisted.push(appearance),
    });
    const win = createFakeWindow();
    controller.register(
      win,
      { ...DEFAULT_WINDOW_GLASS_APPEARANCE, backgroundColor: "#0f0f0f" },
      "#181B1A",
    );

    controller.apply(win, { glass: true, glassTint: GLASS.glassTint ?? undefined });
    controller.apply(win, { backgroundColor: "#101010" });

    expect(win.calls).toEqual([
      ["vibrancy", "under-window"],
      ["background", "#00000000"],
      ["background", "#00000000"],
    ]);
    vi.runAllTimers();
    expect(persisted).toEqual([{ ...GLASS, backgroundColor: "#101010" }]);
  });

  it("restores the opaque background when glass turns off", () => {
    const controller = createWindowGlassController({
      platform: "darwin",
      nativeGlass: null,
      persist: () => {},
    });
    const win = createFakeWindow();
    controller.register(win, GLASS, "#181B1A");

    controller.apply(win, { glass: false });

    expect(win.calls).toEqual([
      ["vibrancy", null],
      ["background", "#0f0f0f"],
    ]);
  });

  it("ignores glass on platforms without vibrancy and still applies the background", () => {
    const persisted: WindowGlassAppearance[] = [];
    const controller = createWindowGlassController({
      platform: "win32",
      nativeGlass: null,
      persist: (appearance) => persisted.push(appearance),
    });
    const win = createFakeWindow();
    controller.register(win, GLASS, "#181B1A");

    controller.apply(win, { glass: true, backgroundColor: "#202020" });

    expect(win.calls).toEqual([["background", "#202020"]]);
    vi.runAllTimers();
    expect(persisted).toEqual([{ ...GLASS, glass: false, backgroundColor: "#202020" }]);
  });

  it("does not persist an update that changes nothing", () => {
    const persist = vi.fn();
    const controller = createWindowGlassController({
      platform: "darwin",
      nativeGlass: null,
      persist,
    });
    const win = createFakeWindow();
    controller.register(win, GLASS, "#181B1A");

    controller.apply(win, { glass: true });
    vi.runAllTimers();

    expect(persist).not.toHaveBeenCalled();
    expect(win.calls).toEqual([]);
  });

  it("falls back to the system color when glass turns off before any color was saved", () => {
    const controller = createWindowGlassController({
      platform: "darwin",
      nativeGlass: null,
      persist: () => {},
    });
    const win = createFakeWindow();
    controller.register(win, { ...GLASS, backgroundColor: null }, "#181B1A");

    controller.apply(win, { glass: false });

    expect(win.calls).toEqual([
      ["vibrancy", null],
      ["background", "#181B1A"],
    ]);
  });

  it("writes a pending appearance immediately on flush", () => {
    const persist = vi.fn();
    const controller = createWindowGlassController({
      platform: "darwin",
      nativeGlass: null,
      persist,
    });
    const win = createFakeWindow();
    controller.register(win, GLASS, "#181B1A");

    controller.apply(win, { glass: false });
    controller.flush();
    controller.flush();

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({ ...GLASS, glass: false });
    vi.runAllTimers();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("applies and persists the interface zoom factor", () => {
    const persist = vi.fn();
    const controller = createWindowGlassController({
      platform: "linux",
      nativeGlass: null,
      persist,
    });
    const win = createFakeWindow();
    controller.register(win, GLASS, "#181B1A");

    controller.apply(win, { zoomFactor: 1.2 });
    controller.apply(win, { zoomFactor: 1.2 });
    vi.runAllTimers();

    expect(win.calls).toEqual([["zoom", "1.2"]]);
    expect(persist).toHaveBeenCalledWith({ ...GLASS, glass: false, zoomFactor: 1.2 });
  });

  it("re-applies a zoom factor that another same-origin window changed", () => {
    const controller = createWindowGlassController({
      platform: "linux",
      nativeGlass: null,
      persist: vi.fn(),
    });
    const win = createFakeWindow();
    controller.register(win, GLASS, "#181B1A");

    controller.apply(win, { zoomFactor: 1.2 });
    win.zoom.factor = 1.5;
    controller.apply(win, { zoomFactor: 1.2 });

    expect(win.calls).toEqual([
      ["zoom", "1.2"],
      ["zoom", "1.2"],
    ]);
  });

  describe("with the native backdrop", () => {
    function setup(registered: WindowGlassAppearance) {
      const persisted: WindowGlassAppearance[] = [];
      const win = createFakeWindow();
      const controller = createWindowGlassController({
        platform: "darwin",
        nativeGlass: createFakeNativeGlass(win.calls),
        persist: (appearance) => persisted.push(appearance),
      });
      controller.register(win, registered, "#181B1A");
      return { controller, win, persisted };
    }

    it("draws a restored glass window's backdrop at its saved radius before it shows", () => {
      const { win } = setup({ ...GLASS, blurRadius: 30 });

      expect(win.calls).toEqual([["native", "30"]]);
    });

    it("draws the backdrop instead of AppKit vibrancy when glass turns on", () => {
      const { controller, win } = setup({ ...GLASS, glass: false });

      controller.apply(win, { glass: true, blurRadius: 20 });

      expect(win.calls).toEqual([
        ["native", "20"],
        ["background", "#00000000"],
      ]);
    });

    it("follows the blur radius live and persists it", () => {
      const { controller, win, persisted } = setup(GLASS);
      win.calls.length = 0;

      controller.apply(win, { glass: true, blurRadius: 12 });
      controller.apply(win, { glass: true, blurRadius: 12 });
      vi.runAllTimers();

      expect(win.calls).toEqual([["native", "12"]]);
      expect(persisted).toEqual([{ ...GLASS, blurRadius: 12 }]);
    });

    it("keeps a radius sent while glass is off for the next time glass turns on", () => {
      const { controller, win } = setup({ ...GLASS, glass: false });

      controller.apply(win, { blurRadius: 8 });
      controller.apply(win, { glass: true });

      expect(win.calls).toEqual([
        ["native", "8"],
        ["background", "#00000000"],
      ]);
    });

    it("hides the backdrop and restores the opaque background when glass turns off", () => {
      const { controller, win } = setup(GLASS);
      win.calls.length = 0;

      controller.apply(win, { glass: false });

      expect(win.calls).toEqual([
        ["native", null],
        ["background", "#0f0f0f"],
      ]);
    });
  });
});
