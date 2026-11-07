import { describe, expect, it } from "vitest";
import { DEFAULT_CLIENT_SETTINGS, type AppSettings } from "@/hooks/use-settings";
import { cycleMonoScheme, patchMonoAppearance, selectMonoScheme } from "./mono-scheme-selection";

function settings(overrides: Partial<AppSettings> = {}): AppSettings {
  return { ...DEFAULT_CLIENT_SETTINGS, ...overrides };
}

describe("selectMonoScheme", () => {
  it("sets the scheme and keeps a built-in theme preference", () => {
    expect(selectMonoScheme(settings({ theme: "dark" }), "light")).toEqual({
      monoAppearance: { ...DEFAULT_CLIENT_SETTINGS.monoAppearance, scheme: "light" },
    });
  });

  it("leaves a plugin theme so the desktop look takes over", () => {
    expect(selectMonoScheme(settings({ theme: "plugin" }), "dark")).toEqual({
      theme: "auto",
      monoAppearance: { ...DEFAULT_CLIENT_SETTINGS.monoAppearance, scheme: "dark" },
    });
  });
});

describe("cycleMonoScheme", () => {
  it("moves to the next scheme", () => {
    const current = settings({
      monoAppearance: { ...DEFAULT_CLIENT_SETTINGS.monoAppearance, scheme: "dark" },
    });

    expect(cycleMonoScheme(current).monoAppearance?.scheme).toBe("light");
  });
});

describe("patchMonoAppearance", () => {
  it("changes only the given fields", () => {
    expect(patchMonoAppearance(settings(), { hue: 30 }).monoAppearance).toEqual({
      ...DEFAULT_CLIENT_SETTINGS.monoAppearance,
      hue: 30,
    });
  });
});
