// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DesktopWindowChromeUpdate } from "@/desktop/host";
import { useMonoLook } from "./mono-look.electron";
import { DEFAULT_MONO_APPEARANCE, type MonoAppearance } from "./mono-settings";

let updates: DesktopWindowChromeUpdate[] = [];

beforeEach(() => {
  updates = [];
  window.paseoDesktop = {
    platform: "darwin",
    window: {
      getCurrentWindow: () => ({
        updateChrome: async (update) => {
          updates.push(update);
        },
      }),
    },
  };
});

afterEach(() => {
  delete window.paseoDesktop;
});

function renderMonoLook(appearance: MonoAppearance) {
  return renderHook(({ current }) => useMonoLook(current, true), {
    initialProps: { current: appearance },
  });
}

describe("useMonoLook on macOS Electron", () => {
  it("asks the window for glass with the Mono tint and blur radius", async () => {
    renderMonoLook(DEFAULT_MONO_APPEARANCE);

    await waitFor(() =>
      expect(updates.at(-1)).toEqual({
        glass: true,
        glassTint: "rgba(15, 15, 15, 0.67)",
        blurRadius: 44,
      }),
    );
  });

  it("sends a new blur radius as the setting changes", async () => {
    const { rerender } = renderMonoLook(DEFAULT_MONO_APPEARANCE);
    await waitFor(() => expect(updates.at(-1)?.blurRadius).toBe(44));

    rerender({ current: { ...DEFAULT_MONO_APPEARANCE, blurRadius: 12 } });

    await waitFor(() => expect(updates.at(-1)?.blurRadius).toBe(12));
  });

  it("turns glass off without a tint or radius in the light scheme", async () => {
    renderMonoLook({ ...DEFAULT_MONO_APPEARANCE, scheme: "light" });

    await waitFor(() => expect(updates.at(-1)).toEqual({ glass: false }));
  });
});
