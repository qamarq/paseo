import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { buildMonoTheme, type MonoThemeInput } from "@/styles/mono-theme";
import { darkTheme } from "@/styles/theme";
import {
  appearanceColorKey,
  appearanceLayoutKey,
  appearanceStyleBoundaryKey,
} from "./appearance-style-boundary";

describe("appearanceStyleBoundaryKey", () => {
  it("changes when content size changes without any other appearance token changing", () => {
    const contentOnlyChange = {
      ...darkTheme,
      fontSize: { ...darkTheme.fontSize, content: darkTheme.fontSize.content + 1 },
    };

    expect(appearanceStyleBoundaryKey(contentOnlyChange)).not.toBe(
      appearanceStyleBoundaryKey(darkTheme),
    );
  });
});

describe("colour-only appearance changes", () => {
  const mono = (overrides: Partial<MonoThemeInput>) =>
    buildMonoTheme({
      scheme: "dark",
      hue: 243,
      saturation: 0,
      darkLightness: 6,
      accentColor: null,
      diffPalette: "default",
      glass: null,
      ...overrides,
    });

  it("keep the layout key so in-place subtrees do not remount while a slider drags", () => {
    const before = mono({});
    const after = mono({ hue: 120, saturation: 40, darkLightness: 12 });

    expect(appearanceLayoutKey(after)).toBe(appearanceLayoutKey(before));
    expect(appearanceColorKey(after)).not.toBe(appearanceColorKey(before));
  });

  it("follow colours in place on desktop settings and the shell", () => {
    const layout = readFileSync(new URL("../app/_layout.tsx", import.meta.url), "utf8");

    expect(layout).toMatch(
      /ROOT_STACK_IN_PLACE_COLOR_SCREENS = getIsElectron\(\)\s*\? \(\["settings\/index", "settings\/\[section\]"\] as const\)/,
    );
    expect(layout).toContain("inPlaceColorScreens={ROOT_STACK_IN_PLACE_COLOR_SCREENS}");
    expect(
      layout.match(/<AppearanceStyleBoundary colorChanges={SHELL_COLOR_CHANGES}>/g),
    ).toHaveLength(3);
  });
});

// This is a placement contract against the production JSX, not a simulated native mount.
// Native Gesture Handler/Fabric lifetime behavior is verified on the release app.
describe("retained native gesture host appearance placement", () => {
  it.each([["../app/_layout.tsx", ["sidebarChrome", "themedSidebarChrome"], true]] as const)(
    "keeps native hosts outside appearance keys in %s",
    (path, hosts, hasWebKeys) => {
      const source = ts.createSourceFile(
        path,
        readFileSync(new URL(path, import.meta.url), "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      let hostsFound = 0;
      let webKeysFound = 0;
      function visit(node: ts.Node) {
        let name: string | undefined;
        if (ts.isIdentifier(node)) name = node.text;
        if (ts.isJsxSelfClosingElement(node)) name = node.tagName.getText(source);
        if (name && hosts.some((host) => host === name)) {
          hostsFound++;
          let webOnly = false;
          let keyed = false;
          for (
            let child = node, parent = node.parent;
            parent;
            child = parent, parent = parent.parent
          ) {
            if (
              ts.isIfStatement(parent) &&
              parent.expression.getText(source) === "isWeb" &&
              parent.thenStatement === child
            )
              webOnly = true;
            if (
              ts.isJsxElement(parent) &&
              parent.openingElement.tagName.getText(source) === "AppearanceStyleBoundary"
            )
              keyed = true;
          }
          if (keyed && webOnly) webKeysFound++;
          expect(keyed && !webOnly, `${name} is remounted on native appearance changes`).toBe(
            false,
          );
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
      expect(hostsFound).toBeGreaterThan(0);
      if (hasWebKeys) expect(webKeysFound).toBeGreaterThan(0);
    },
  );
});
