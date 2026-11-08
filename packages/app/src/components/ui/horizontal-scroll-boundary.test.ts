import { describe, expect, it } from "vitest";
import { buildMonoTheme } from "@/styles/mono-theme";
import { darkTheme } from "@/styles/theme";
import { horizontalScrollMask } from "./horizontal-scroll-boundary";

const glassTheme = buildMonoTheme({
  scheme: "dark",
  hue: 243,
  saturation: 0,
  darkLightness: 6,
  accentColor: null,
  diffPalette: "default",
  glass: { mainPaneGlass: true },
});

describe("horizontalScrollMask", () => {
  it("fades only the edges that have content scrolled past them", () => {
    expect(horizontalScrollMask(glassTheme, { start: false, end: true })).toEqual({
      WebkitMaskImage:
        "linear-gradient(to right, transparent, #000 0px, #000 calc(100% - 24px), transparent)",
    });
    expect(horizontalScrollMask(glassTheme, { start: true, end: false })).toEqual({
      WebkitMaskImage:
        "linear-gradient(to right, transparent, #000 24px, #000 calc(100% - 0px), transparent)",
    });
  });

  it("masks nothing outside glass, where the painted shades still work", () => {
    expect(horizontalScrollMask(darkTheme, { start: true, end: true })).toEqual({});
  });
});
