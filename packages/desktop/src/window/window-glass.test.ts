import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createWindowGlassController,
  DEFAULT_WINDOW_GLASS_APPEARANCE,
  getGlassWindowOptions,
  windowGlassArguments,
  type WindowGlassAppearance,
} from "./window-glass";

const GLASS: WindowGlassAppearance = {
  glass: true,
  backgroundColor: "#0f0f0f",
  glassTint: "rgba(15, 15, 15, 0.67)",
};

function createFakeWindow() {
  const calls: Array<[string, string | null]> = [];
  return {
    calls,
    setVibrancy: (type: "under-window" | null) => calls.push(["vibrancy", type]),
    setBackgroundColor: (color: string) => calls.push(["background", color]),
  };
}

describe("getGlassWindowOptions", () => {
  it("opens a glass window on macOS with vibrancy over a transparent background", () => {
    expect(
      getGlassWindowOptions({
        platform: "darwin",
        appearance: GLASS,
        fallbackBackgroundColor: "#181B1A",
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
      }),
    ).toEqual({ backgroundColor: "#0f0f0f", visualEffectState: "active" });
  });

  it("falls back to the system color before any appearance is saved", () => {
    expect(
      getGlassWindowOptions({
        platform: "darwin",
        appearance: DEFAULT_WINDOW_GLASS_APPEARANCE,
        fallbackBackgroundColor: "#181B1A",
      }),
    ).toEqual({ backgroundColor: "#181B1A", visualEffectState: "active" });
  });

  it.each(["win32", "linux"] as const)("keeps %s windows opaque", (platform) => {
    expect(
      getGlassWindowOptions({ platform, appearance: GLASS, fallbackBackgroundColor: "#181B1A" }),
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
    const controller = createWindowGlassController({ platform: "darwin", persist: () => {} });
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
    const controller = createWindowGlassController({ platform: "darwin", persist });
    const win = createFakeWindow();
    controller.register(win, GLASS, "#181B1A");

    controller.apply(win, { glass: true });
    vi.runAllTimers();

    expect(persist).not.toHaveBeenCalled();
    expect(win.calls).toEqual([]);
  });

  it("falls back to the system color when glass turns off before any color was saved", () => {
    const controller = createWindowGlassController({ platform: "darwin", persist: () => {} });
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
    const controller = createWindowGlassController({ platform: "darwin", persist });
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
});
