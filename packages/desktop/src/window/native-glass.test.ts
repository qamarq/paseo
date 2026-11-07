import { describe, expect, it, vi } from "vitest";

const warn = vi.hoisted(() => vi.fn());

vi.mock("electron-log/main", () => ({
  default: { warn },
}));

import { loadNativeGlass } from "./native-glass";

describe("loadNativeGlass", () => {
  it.each(["linux", "win32"] as const)("has no native glass on %s", (platform) => {
    expect(loadNativeGlass(platform)).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back to AppKit vibrancy when the macOS addon cannot load", () => {
    expect(loadNativeGlass("darwin")).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "[window] native glass addon failed to load; using AppKit vibrancy",
      expect.anything(),
    );
  });
});
