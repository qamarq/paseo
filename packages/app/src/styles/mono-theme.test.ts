import { describe, expect, it } from "vitest";
import { buildMonoTheme, monoWindowTint, type MonoThemeInput } from "./mono-theme";
import { darkTheme, lightTheme } from "./theme";

function input(overrides: Partial<MonoThemeInput> = {}): MonoThemeInput {
  return {
    scheme: "dark",
    hue: 243,
    saturation: 0,
    darkLightness: 6,
    accentColor: null,
    diffPalette: "default",
    glass: null,
    ...overrides,
  };
}

const OPAQUE_HEX = /^#[0-9a-f]{6}$/;
const THEME_COLOR =
  /^(#[0-9a-f]{6}([0-9a-f]{2})?|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0|1|0?\.\d+)\))$/i;

const OPAQUE_TOKENS = [
  "surface0",
  "surface1",
  "surface2",
  "surface3",
  "surface4",
  "surfaceDiffEmpty",
  "surfaceSidebar",
  "surfaceSidebarHover",
  "surfaceSidebarSelected",
  "surfaceWorkspace",
  "foreground",
  "foregroundMuted",
  "foregroundExtraMuted",
  "border",
  "borderAccent",
  "accent",
  "accentBright",
  "accentForeground",
  "primary",
  "primaryForeground",
  "destructive",
  "ring",
  "diffAddition",
  "diffDeletion",
  "actionPrimary",
  "actionPrimaryForeground",
  "userBubble",
  "diffAdditionForeground",
  "diffDeletionForeground",
  "surfaceWindow",
  "surfaceSidebarGlass",
  "surfacePaneGlass",
  "surfaceWorkspaceGlass",
] as const;

function stringColors(colors: object): [string, string][] {
  return Object.entries(colors).flatMap(([key, value]): [string, string][] => {
    if (key === "palette" || key === "syntax") return [];
    if (typeof value === "string") return [[key, value]];
    return stringColors(value).map(([child, color]) => [`${key}.${child}`, color]);
  });
}

describe("buildMonoTheme", () => {
  it("resolves the default dark look from the user's tint", () => {
    const { colorScheme, colors } = buildMonoTheme(input());

    expect(colorScheme).toBe("dark");
    expect(colors.surface0).toBe("#0f0f0f");
    expect(colors.foreground).toBe("#ebebeb");
    expect(colors.border).toBe("#1f1f1f");
    expect(colors.surface2).toBe("#252525");
    expect(colors.foregroundMuted).toBe("#7d7d7d");
    expect(colors.surfaceSidebar).toBe("#0e0e0e");
    expect(colors.surfaceWorkspace).toBe(colors.surface0);
    expect(colors.interactionHighlight).toBe("rgba(235, 235, 235, 0.1)");
  });

  it("matches MonoCode's own defaults at hue 240, lightness 9", () => {
    const dark = buildMonoTheme(input({ hue: 240, darkLightness: 9 })).colors;
    const light = buildMonoTheme(input({ hue: 240, scheme: "light" })).colors;

    expect(dark.surface0).toBe("#171717");
    expect(dark.foreground).toBe("#ebebeb");
    expect(light.surface0).toBe("#f7f7f7");
    expect(light.foreground).toBe("#2e2e2e");
  });

  it("builds light from the same tint and ignores dark-mode lightness", () => {
    const light = buildMonoTheme(input({ scheme: "light", darkLightness: 0 }));

    expect(light.colorScheme).toBe("light");
    expect(light.colors.surface0).toBe("#f7f7f7");
    expect(light.colors.surfaceSidebar).toBe(light.colors.surface0);
    expect(light.colors.surface2).toBe("#ebebeb");
    expect(light.colors.interactionHighlight).toBe("rgba(46, 46, 46, 0.1)");
  });

  it("tints every surface with hue and saturation", () => {
    const { colors } = buildMonoTheme(input({ hue: 240, saturation: 50, darkLightness: 10 }));
    const [r, g, b] = [1, 3, 5].map((offset) =>
      Number.parseInt(colors.surface0.slice(offset, offset + 2), 16),
    );

    expect(b).toBeGreaterThan(r);
    expect(r).toBe(g);
    expect(colors.surface0).toBe("#0d0d26");
  });

  it("orders the surface scale from base to strongest fill in both schemes", () => {
    const red = (hex: string) => Number.parseInt(hex.slice(1, 3), 16);
    for (const scheme of ["dark", "light"] as const) {
      const { colors } = buildMonoTheme(input({ scheme }));
      const scale = [colors.surface1, colors.surface2, colors.surface3, colors.surface4].map(
        (surface) => Math.abs(red(surface) - red(colors.surface0)),
      );

      expect(scale).toEqual([...scale].sort((a, b) => a - b));
      expect(new Set(scale).size).toBe(scale.length);
    }
  });

  it("keeps the neutral primary action white on dark and ink on light", () => {
    const dark = buildMonoTheme(input()).colors;
    const light = buildMonoTheme(input({ scheme: "light" })).colors;

    expect([dark.primary, dark.primaryForeground]).toEqual(["#ffffff", "#000000"]);
    expect([light.primary, light.primaryForeground]).toEqual([light.foreground, light.surface0]);
  });

  it("uses the user accent for the primary action with a contrasting foreground", () => {
    const bright = buildMonoTheme(input({ accentColor: "#f59e0b" })).colors;
    const deep = buildMonoTheme(input({ accentColor: "#1d4ed8", scheme: "light" })).colors;

    expect([bright.primary, bright.primaryForeground]).toEqual(["#f59e0b", "#000000"]);
    expect([deep.primary, deep.primaryForeground]).toEqual(["#1d4ed8", "#ffffff"]);
  });

  it("keeps MonoCode's blue accent for toggles and focus regardless of the user accent", () => {
    const neutral = buildMonoTheme(input()).colors;
    const custom = buildMonoTheme(input({ accentColor: "#ef4444" })).colors;

    expect(neutral.accent).toBe("#459bf7");
    expect(custom.accent).toBe(neutral.accent);
    expect(neutral.ring).toBe(neutral.accent);
    expect(neutral.accentForeground).toBe("#ffffff");
  });

  it.each([
    ["default", "dark", "#6ee7b7", "#fda4af"],
    ["default", "light", "#047857", "#be123c"],
    ["colorblind", "dark", "#79c0ff", "#ffa657"],
    ["colorblind", "light", "#0550ae", "#953800"],
    ["highContrast", "dark", "#cae8ff", "#ffdfb6"],
    ["highContrast", "light", "#032563", "#471700"],
  ] as const)("maps the %s %s diff palette onto the diff tokens", (palette, scheme, add, del) => {
    const { colors } = buildMonoTheme(input({ diffPalette: palette, scheme }));

    expect(colors.diffAddition).toBe(add);
    expect(colors.diffDeletion).toBe(del);
  });

  it("emits opaque hex for surfaces and borders so hex-alpha suffixes stay valid", () => {
    const cases: MonoThemeInput[] = [
      input(),
      input({ scheme: "light" }),
      input({ hue: 0, saturation: 100, darkLightness: 30 }),
      input({ hue: 360, saturation: 100, darkLightness: 0, scheme: "light" }),
      input({ accentColor: "#8b5cf6", diffPalette: "highContrast" }),
    ];

    for (const testCase of cases) {
      const { colors } = buildMonoTheme(testCase);
      for (const token of OPAQUE_TOKENS) {
        expect(colors[token], token).toMatch(OPAQUE_HEX);
      }
      for (const [key, color] of stringColors(colors)) {
        expect(color, key).toMatch(THEME_COLOR);
      }
    }
  });

  it("produces the same token set as the built-in themes", () => {
    const keys = (colors: object) =>
      stringColors(colors)
        .map(([key]) => key)
        .sort();

    expect(keys(buildMonoTheme(input()).colors)).toEqual(keys(darkTheme.colors));
    expect(keys(buildMonoTheme(input({ scheme: "light" })).colors)).toEqual(
      keys(lightTheme.colors),
    );
  });

  it("is a pure function of its input", () => {
    expect(buildMonoTheme(input({ hue: 120, saturation: 30 }))).toEqual(
      buildMonoTheme(input({ hue: 120, saturation: 30 })),
    );
  });

  it("keeps every glass layer opaque when glass is off", () => {
    const { colors } = buildMonoTheme(input());

    expect(colors.surfaceWindow).toBe(colors.surface0);
    expect(colors.surfaceSidebarGlass).toBe(colors.surfaceSidebar);
    expect(colors.surfacePaneGlass).toBe(colors.surface0);
    expect(colors.surfaceWorkspaceGlass).toBe(colors.surfaceWorkspace);
  });

  it("clears the window and sidebar layers under glass and leaves menus opaque", () => {
    const { colors } = buildMonoTheme(input({ glass: { mainPaneGlass: true } }));
    const opaque = buildMonoTheme(input()).colors;

    expect(colors.surfaceWindow).toBe("transparent");
    expect(colors.surfaceSidebarGlass).toBe("transparent");
    expect(colors.surfacePaneGlass).toBe("transparent");
    expect(colors.surfaceWorkspaceGlass).toBe("transparent");
    expect(colors.surface0).toBe(opaque.surface0);
    expect(colors.popover).toBe(opaque.popover);
    expect(colors.input).toBe(opaque.input);
  });

  it("keeps the main pane opaque when main pane glass is off", () => {
    const { colors } = buildMonoTheme(input({ glass: { mainPaneGlass: false } }));

    expect(colors.surfaceSidebarGlass).toBe("transparent");
    expect(colors.surfacePaneGlass).toBe(colors.surface0);
    expect(colors.surfaceWorkspaceGlass).toBe(colors.surface0);
  });

  it("makes row and chip fills translucent and turns off knockouts under glass", () => {
    const { colors, chrome } = buildMonoTheme(input({ glass: { mainPaneGlass: true } }));

    expect(chrome.glass).toBe(true);
    expect(colors.surfaceSidebarHover).toBe("rgba(235, 235, 235, 0.05)");
    expect(colors.surfaceSidebarSelected).toBe("rgba(235, 235, 235, 0.12)");
    expect(chrome.fills).toMatchObject({
      surface0: "transparent",
      surfaceSidebar: "transparent",
      surface2: "rgba(235, 235, 235, 0.1)",
    });
    expect(colors.terminal.background).toBe("rgba(0, 0, 0, 0)");
  });

  it("keeps the main pane fill and terminal opaque when main pane glass is off", () => {
    const { colors, chrome } = buildMonoTheme(input({ glass: { mainPaneGlass: false } }));

    expect(chrome.fills?.surface0).toBeUndefined();
    expect(colors.terminal.background).toBe(colors.surface0);
  });

  it("uses MonoCode's chrome geometry with or without glass", () => {
    for (const glass of [null, { mainPaneGlass: true }]) {
      const { chrome } = buildMonoTheme(input({ glass }));
      expect(chrome).toMatchObject({
        tabHeight: 30,
        tabRadius: 6,
        floatingRadius: 12,
        modalRadius: 16,
        composerRadius: 8,
      });
    }
    expect(buildMonoTheme(input()).chrome.glass).toBe(false);
  });

  it("frosts floating surfaces in dark and keeps them solid in light", () => {
    const dark = buildMonoTheme(input()).chrome;
    const light = buildMonoTheme(input({ scheme: "light" }));

    expect(dark.floatingBlur).toBe(24);
    expect(dark.composerBlur).toBe(8);
    expect(light.chrome.floatingBlur).toBe(0);
    expect(light.chrome.floatingFill).toBe(light.colors.surface0);
  });

  it("never applies glass to the light scheme", () => {
    const glassy = buildMonoTheme(input({ scheme: "light", glass: { mainPaneGlass: true } }));

    expect(glassy).toEqual(buildMonoTheme(input({ scheme: "light" })));
  });
});

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe("Mono action and message colors", () => {
  it("fills primary actions with the primary color, never the toggle accent", () => {
    for (const accentColor of [null, "#ef4444"]) {
      const { colors } = buildMonoTheme(input({ accentColor }));

      expect(colors.actionPrimary).toBe(colors.primary);
      expect(colors.actionPrimaryForeground).toBe(colors.primaryForeground);
      expect(colors.actionPrimary).not.toBe(colors.accent);
    }
  });

  it("tints user bubbles with ink by default and with the user accent when set", () => {
    expect(buildMonoTheme(input()).colors.userBubble).toBe("#252525");
    expect(buildMonoTheme(input({ accentColor: "#ef4444" })).colors.userBubble).toBe("#451c1c");
  });

  it("edges accent bubbles with the accent at 30% and leaves the neutral bubble borderless", () => {
    const neutral = buildMonoTheme(input()).colors;
    const accent = buildMonoTheme(input({ accentColor: "#ef4444" })).colors;

    expect(neutral.userBubbleBorder).toBe(neutral.userBubble);
    expect(accent.userBubbleBorder).toBe("rgba(239, 68, 68, 0.3)");
  });

  it.each([
    ["default", "rgba(16, 185, 129, 0.15)", "rgba(244, 63, 94, 0.15)"],
    ["colorblind", "rgba(56, 139, 253, 0.15)", "rgba(219, 109, 40, 0.15)"],
    ["highContrast", "rgba(88, 166, 255, 0.28)", "rgba(240, 136, 62, 0.28)"],
  ] as const)("tints %s diff lines with the palette's marker hue", (palette, add, del) => {
    const { colors } = buildMonoTheme(input({ diffPalette: palette }));

    expect(colors.diffAdditionBackground).toBe(add);
    expect(colors.diffDeletionBackground).toBe(del);
    expect(colors.diffAdditionForeground).toBe(colors.diffAddition);
  });

  it("keeps light muted text readable at 4.5:1 across tints", () => {
    for (const [hue, saturation] of [
      [243, 0],
      [0, 100],
      [120, 60],
      [210, 100],
      [300, 40],
    ]) {
      const { colors } = buildMonoTheme(input({ scheme: "light", hue, saturation }));

      expect(contrast(colors.foregroundMuted, colors.surface0)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("Mono diff gutter", () => {
  it.each([
    ["default", 0.15, 0.25],
    ["highContrast", 0.28, 0.45],
  ] as const)(
    "composes the %s gutter overlay up to MonoCode's gutter strength",
    (diffPalette, line, gutter) => {
      const { colors } = buildMonoTheme(input({ diffPalette }));
      const overlay = Number(/, ([\d.]+)\)$/.exec(colors.diffAdditionGutter)?.[1]);

      expect(1 - (1 - line) * (1 - overlay)).toBeCloseTo(gutter, 2);
    },
  );
});

describe("monoWindowTint", () => {
  const tint = { hue: 243, saturation: 0, darkLightness: 6 };

  it("paints the dark base at MonoCode's window alpha", () => {
    expect(monoWindowTint({ ...tint, sidebarOpacity: 45 })).toBe("rgba(15, 15, 15, 0.67)");
    expect(monoWindowTint({ ...tint, sidebarOpacity: 85 })).toBe("rgba(15, 15, 15, 0.91)");
    expect(monoWindowTint({ ...tint, sidebarOpacity: 100 })).toBe("rgba(15, 15, 15, 1)");
    expect(monoWindowTint({ ...tint, sidebarOpacity: 15 })).toBe("rgba(15, 15, 15, 0.49)");
  });

  it("follows the tint, not the light scheme", () => {
    expect(
      monoWindowTint({ hue: 240, saturation: 50, darkLightness: 10, sidebarOpacity: 45 }),
    ).toBe("rgba(13, 13, 38, 0.67)");
  });
});
