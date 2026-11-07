import { describe, expect, it } from "vitest";
import {
  INTERFACE_SCALE_OPTIONS,
  isMonoActive,
  nextMonoScheme,
  readInterfaceScaleStep,
  resolveMonoColorScheme,
  resolveMonoGlass,
  stepInterfaceScale,
} from "./mono-settings";

describe("resolveMonoColorScheme", () => {
  it.each([
    ["light", "light"],
    ["dark", "dark"],
    [null, "dark"],
    [undefined, "dark"],
    ["unspecified", "dark"],
  ] as const)("follows the OS scheme %s as %s when set to system", (systemScheme, expected) => {
    expect(resolveMonoColorScheme("system", systemScheme)).toBe(expected);
  });

  it("keeps an explicit scheme whatever the OS reports", () => {
    expect(resolveMonoColorScheme("dark", "light")).toBe("dark");
    expect(resolveMonoColorScheme("light", "dark")).toBe("light");
  });
});

describe("resolveMonoGlass", () => {
  it("turns glass on only for the active dark look on macOS", () => {
    expect(resolveMonoGlass({ active: true, scheme: "dark", isMac: true })).toBe(true);
    expect(resolveMonoGlass({ active: true, scheme: "light", isMac: true })).toBe(false);
    expect(resolveMonoGlass({ active: true, scheme: "dark", isMac: false })).toBe(false);
    expect(resolveMonoGlass({ active: false, scheme: "dark", isMac: true })).toBe(false);
    expect(resolveMonoGlass({ active: true, scheme: null, isMac: true })).toBe(false);
  });
});

describe("isMonoActive", () => {
  it("yields to a selected plugin theme", () => {
    expect(
      isMonoActive({
        themePreference: "plugin",
        pluginThemeSelected: true,
        pluginCatalogsSettled: true,
      }),
    ).toBe(false);
  });

  it("waits for plugin catalogs before replacing a plugin theme preference", () => {
    expect(
      isMonoActive({
        themePreference: "plugin",
        pluginThemeSelected: false,
        pluginCatalogsSettled: false,
      }),
    ).toBe(false);
    expect(
      isMonoActive({
        themePreference: "plugin",
        pluginThemeSelected: false,
        pluginCatalogsSettled: true,
      }),
    ).toBe(true);
  });

  it("applies to every built-in preference right away", () => {
    expect(
      isMonoActive({
        themePreference: "dark",
        pluginThemeSelected: false,
        pluginCatalogsSettled: false,
      }),
    ).toBe(true);
  });
});

describe("interface scale", () => {
  it("offers 50% to 200% in 10% steps", () => {
    expect(INTERFACE_SCALE_OPTIONS[0]).toBe(50);
    expect(INTERFACE_SCALE_OPTIONS.at(-1)).toBe(200);
    expect(INTERFACE_SCALE_OPTIONS).toHaveLength(16);
  });

  it("steps by 10% inside the range and resets to 100%", () => {
    expect(stepInterfaceScale(100, 1)).toBe(110);
    expect(stepInterfaceScale(100, -1)).toBe(90);
    expect(stepInterfaceScale(105, 1)).toBe(110);
    expect(stepInterfaceScale(105, -1)).toBe(100);
    expect(stepInterfaceScale(200, 1)).toBe(200);
    expect(stepInterfaceScale(50, -1)).toBe(50);
    expect(stepInterfaceScale(170, 0)).toBe(100);
  });

  it("reads only the menu's step payloads", () => {
    expect(readInterfaceScaleStep({ step: 1 })).toBe(1);
    expect(readInterfaceScaleStep({ step: 0 })).toBe(0);
    expect(readInterfaceScaleStep({ step: 2 })).toBeNull();
    expect(readInterfaceScaleStep("in")).toBeNull();
    expect(readInterfaceScaleStep(null)).toBeNull();
  });
});

describe("nextMonoScheme", () => {
  it("cycles system, dark and light", () => {
    expect(nextMonoScheme("system")).toBe("dark");
    expect(nextMonoScheme("dark")).toBe("light");
    expect(nextMonoScheme("light")).toBe("system");
  });
});
