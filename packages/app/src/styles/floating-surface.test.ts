import { describe, expect, it } from "vitest";
import { floatingSurfaceStyle, modalSurfaceStyle } from "./floating-surface";
import { buildMonoTheme } from "./mono-theme";
import { darkTheme } from "./theme";

const MONO_GLASS = buildMonoTheme({
  scheme: "dark",
  hue: 243,
  saturation: 0,
  darkLightness: 6,
  accentColor: null,
  diffPalette: "default",
  glass: { mainPaneGlass: true },
});

const SEAL = " drop-shadow(0 0 0 #0f0f0f)".repeat(4);
const MONO_SHADOW = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)";

describe("floating surfaces", () => {
  it("keep a built-in theme's own fill, border, radius and shadow", () => {
    const defaults = {
      backgroundColor: darkTheme.colors.surface1,
      borderColor: darkTheme.colors.borderAccent,
      borderRadius: darkTheme.borderRadius.lg,
      shadow: darkTheme.shadow.md,
    };

    expect(floatingSurfaceStyle(darkTheme, defaults)).toEqual({
      backgroundColor: defaults.backgroundColor,
      borderColor: defaults.borderColor,
      borderRadius: defaults.borderRadius,
      ...darkTheme.shadow.md,
    });
    expect(modalSurfaceStyle(darkTheme, { ...defaults, shadow: undefined })).toEqual({
      backgroundColor: defaults.backgroundColor,
      borderColor: defaults.borderColor,
      borderRadius: defaults.borderRadius,
    });
  });

  it("frost on a sealed backdrop under Mono glass", () => {
    const defaults = {
      backgroundColor: darkTheme.colors.surface1,
      borderColor: darkTheme.colors.borderAccent,
      borderRadius: darkTheme.borderRadius.lg,
      shadow: darkTheme.shadow.md,
    };
    const frosted = {
      backgroundColor: "rgba(24, 24, 24, 0.6)",
      boxShadow: MONO_SHADOW,
      backdropFilter: `blur(24px)${SEAL}`,
    };

    expect(floatingSurfaceStyle(MONO_GLASS, defaults)).toEqual({
      ...frosted,
      borderColor: "rgba(235, 235, 235, 0.1)",
      borderRadius: 12,
    });
    expect(modalSurfaceStyle(MONO_GLASS, defaults)).toEqual({
      ...frosted,
      borderColor: "rgba(235, 235, 235, 0.07)",
      borderRadius: 16,
    });
  });
});
