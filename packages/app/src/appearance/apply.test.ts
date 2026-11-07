import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { darkHighlightColors, resolveSyntaxColors } from "@getpaseo/highlight";
import { buildMonoTheme, type MonoThemeInput } from "@/styles/mono-theme";
import {
  DEFAULT_UI_FONT_STACK,
  MONO_THEME_NAMES,
  REGISTERED_THEMES,
  type Theme,
} from "@/styles/theme";
import { applyAppearance, applyMonoTheme, type AppearanceInput } from "./apply";

// Override the global react-native-unistyles mock (vitest.setup.ts) so that
// UnistylesRuntime.updateTheme is a spy that records (themeName, updater) calls.
const { runtime, updateTheme, setTheme, setAdaptiveThemes } = vi.hoisted(() => {
  const updateThemeSpy = vi.fn();
  const setThemeSpy = vi.fn();
  const setAdaptiveThemesSpy = vi.fn();
  return {
    runtime: {
      themeName: undefined as string | undefined,
      updateTheme: updateThemeSpy,
      setTheme: setThemeSpy,
      setAdaptiveThemes: setAdaptiveThemesSpy,
    },
    updateTheme: updateThemeSpy,
    setTheme: setThemeSpy,
    setAdaptiveThemes: setAdaptiveThemesSpy,
  };
});
vi.mock("react-native-unistyles", () => ({ UnistylesRuntime: runtime }));

const ALL_THEME_KEYS = Object.keys(REGISTERED_THEMES);

// The signature of the updater passed to UnistylesRuntime.updateTheme.
type ThemeUpdater = (theme: FakeTheme) => FakeTheme;

// The subset of the theme shape the updater reads / spreads. The real Theme type
// is a frozen `as const` literal; the updater only touches these fields. Casting a
// fake of this shape through `unknown` to ThemeUpdater's param is test-only.
interface FakeTheme {
  colorScheme: "light" | "dark";
  fontFamily: { ui: string; mono: string };
  fontSize: {
    code: number;
    content: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    "2xl": number;
    "3xl": number;
    "4xl": number;
  };
  lineHeight: { diff: number };
  contentMaxWidth: number;
  colors: { foreground: string; syntax: Record<string, string> };
}

function makeFakeTheme(): FakeTheme {
  return {
    colorScheme: "dark",
    fontFamily: { ui: "seed-ui-stack", mono: "seed-mono-stack" },
    fontSize: {
      code: 12,
      content: 15,
      sm: 12,
      base: 14,
      lg: 16,
      xl: 18,
      "2xl": 20,
      "3xl": 22,
      "4xl": 26,
    },
    lineHeight: { diff: 22 },
    contentMaxWidth: 820,
    colors: { foreground: "#fff", syntax: {} },
  };
}

function makeInput(overrides: Partial<AppearanceInput> = {}): AppearanceInput {
  return {
    uiFontFamily: "",
    monoFontFamily: "",
    uiBaseFontSize: 14,
    contentFontSize: 15,
    codeFontSize: 12,
    contentMaxWidth: 820,
    syntaxTheme: "one",
    ...overrides,
  };
}

// Run a single captured updater (default the first) against a fresh fake theme.
function runCapturedUpdater(call = 0): FakeTheme {
  const updater = updateTheme.mock.calls[call]?.[1] as unknown as ThemeUpdater;
  return updater(makeFakeTheme());
}

describe("applyAppearance", () => {
  beforeEach(() => {
    updateTheme.mockClear();
    runtime.themeName = undefined;
  });

  it("patches every registered Unistyles theme exactly once", () => {
    applyAppearance(makeInput());

    expect(updateTheme).toHaveBeenCalledTimes(ALL_THEME_KEYS.length);
    expect(updateTheme.mock.calls.map((call) => call[0])).toEqual([...ALL_THEME_KEYS]);
  });

  it("patches the active theme before inactive registry entries", () => {
    runtime.themeName = "darkPureBlack";

    applyAppearance(makeInput({ uiBaseFontSize: 15 }));

    expect(updateTheme.mock.calls.map((call) => call[0])).toEqual([
      "darkPureBlack",
      ...ALL_THEME_KEYS.filter((key) => key !== "darkPureBlack"),
    ]);
  });

  it("patches the content max width into the theme", () => {
    applyAppearance(makeInput({ contentMaxWidth: 1600 }));

    expect(runCapturedUpdater().contentMaxWidth).toBe(1600);
  });

  it("resolves an empty UI font family to the default stack", () => {
    applyAppearance(makeInput({ uiFontFamily: "" }));

    expect(runCapturedUpdater().fontFamily.ui).toBe(DEFAULT_UI_FONT_STACK);
  });

  it("passes a non-empty UI font family through trimmed", () => {
    applyAppearance(makeInput({ uiFontFamily: "  Menlo  " }));

    expect(runCapturedUpdater().fontFamily.ui).toBe("Menlo");
  });

  it("scales the whole UI ramp proportionally while preserving ratios", () => {
    applyAppearance(makeInput({ uiBaseFontSize: 15 }));

    const { fontSize } = runCapturedUpdater();
    expect(fontSize.base).toBe(15);
    expect(fontSize.sm).toBe(13);
    expect(fontSize.lg).toBe(17);
    expect(fontSize.xl).toBe(19);
    expect(fontSize["4xl"]).toBe(28);
  });

  it("derives the UI ramp from the canonical sizes, not the live theme (no compounding)", () => {
    applyAppearance(makeInput({ uiBaseFontSize: 15 }));

    // Simulate a theme whose fontSize was already scaled by a prior apply; the
    // updater must ignore it and rebuild from the authored FONT_SIZE ramp.
    const updater = updateTheme.mock.calls[0]?.[1] as unknown as ThemeUpdater;
    const alreadyScaled = makeFakeTheme();
    alreadyScaled.fontSize = {
      code: 4,
      content: 4,
      sm: 4,
      base: 4,
      lg: 4,
      xl: 4,
      "2xl": 4,
      "3xl": 4,
      "4xl": 4,
    };

    const { fontSize } = updater(alreadyScaled);
    expect(fontSize.base).toBe(15); // rebuilt from FONT_SIZE, not the live value of 4
    expect(fontSize.lg).toBe(17);
  });

  it("leaves the UI ramp at authored sizes when only the code size changes", () => {
    applyAppearance(makeInput({ uiBaseFontSize: 14, codeFontSize: 10 }));

    const { fontSize } = runCapturedUpdater();
    expect(fontSize.base).toBe(14);
    expect(fontSize.lg).toBe(16);
    expect(fontSize.sm).toBe(12);
    expect(fontSize.code).toBe(10);
  });

  it("sets content size independently of the interface and code sizes", () => {
    applyAppearance(makeInput({ uiBaseFontSize: 14, contentFontSize: 19, codeFontSize: 10 }));

    const { fontSize } = runCapturedUpdater();
    expect(fontSize.base).toBe(14);
    expect(fontSize.content).toBe(19);
    expect(fontSize.code).toBe(10);
  });

  it("sets fontSize.code to codeFontSize regardless of the UI font size", () => {
    applyAppearance(makeInput({ uiBaseFontSize: 14, codeFontSize: 18 }));

    expect(runCapturedUpdater().fontSize.code).toBe(18);
  });

  it("couples lineHeight.diff to the code font size", () => {
    applyAppearance(makeInput({ codeFontSize: 18 }));

    expect(runCapturedUpdater().lineHeight.diff).toBe(Math.round(18 * 1.5)); // 27
  });

  it("swaps colors.syntax to the resolved palette for the named theme", () => {
    applyAppearance(makeInput({ syntaxTheme: "dracula" }));

    const { colors } = runCapturedUpdater();
    expect(colors.syntax).toEqual(resolveSyntaxColors("dracula", "dark"));
  });

  it("resolves a syntax theme using the theme's own color scheme", () => {
    applyAppearance(makeInput({ syntaxTheme: "github" }));

    // makeFakeTheme().colorScheme === "dark" -> github resolves to the dark palette.
    expect(runCapturedUpdater().colors.syntax).toEqual(darkHighlightColors);
    expect(runCapturedUpdater().colors.syntax).toEqual(resolveSyntaxColors("github", "dark"));
  });
});

describe("applyMonoTheme", () => {
  const monoInput: MonoThemeInput = {
    scheme: "dark",
    hue: 243,
    saturation: 0,
    darkLightness: 6,
    accentColor: null,
    diffPalette: "default",
  };
  const registry: Record<string, Theme> = {};
  const activated: Array<{ name: string; theme: Theme | undefined }> = [];

  beforeEach(() => {
    Object.assign(registry, REGISTERED_THEMES);
    activated.length = 0;
    runtime.themeName = undefined;
    updateTheme.mockImplementation((name: string, updater: (theme: Theme) => Theme) => {
      registry[name] = updater(registry[name] as Theme);
    });
    setTheme.mockImplementation((name: string) => {
      activated.push({ name, theme: registry[name] });
    });
    setAdaptiveThemes.mockClear();
  });

  afterEach(() => {
    updateTheme.mockReset();
    setTheme.mockReset();
  });

  it("activates the Mono slot built from the Mono colours with the appearance patch", () => {
    applyMonoTheme(
      monoInput,
      makeInput({ uiBaseFontSize: 15, contentMaxWidth: 1600, syntaxTheme: "dracula" }),
    );

    expect(setAdaptiveThemes).toHaveBeenCalledWith(false);
    expect(activated.map(({ name }) => name)).toEqual([MONO_THEME_NAMES.dark]);
    const theme = activated[0]?.theme;
    expect(theme?.colors).toEqual({
      ...buildMonoTheme(monoInput).colors,
      syntax: resolveSyntaxColors("dracula", "dark"),
    });
    expect(theme?.fontSize.base).toBe(15);
    expect(theme?.contentMaxWidth).toBe(1600);
  });

  it("activates the light slot for the light scheme", () => {
    const light: MonoThemeInput = { ...monoInput, scheme: "light", hue: 30, saturation: 40 };

    applyMonoTheme(light, makeInput());

    expect(activated.map(({ name }) => name)).toEqual([MONO_THEME_NAMES.light]);
    expect(activated[0]?.theme?.colorScheme).toBe("light");
    expect(activated[0]?.theme?.colors.surface0).toBe(buildMonoTheme(light).colors.surface0);
  });

  it("builds only the active Mono slot", () => {
    applyMonoTheme(monoInput, makeInput());

    expect(registry[MONO_THEME_NAMES.light]?.colors.surface0).toBe(
      REGISTERED_THEMES[MONO_THEME_NAMES.light].colors.surface0,
    );
  });

  it("registers the Mono slots so the appearance patch reaches them", () => {
    expect(ALL_THEME_KEYS).toEqual(
      expect.arrayContaining([MONO_THEME_NAMES.dark, MONO_THEME_NAMES.light]),
    );
  });
});
