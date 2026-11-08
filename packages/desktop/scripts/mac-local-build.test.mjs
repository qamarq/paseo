import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const require = createRequire(import.meta.url);
const {
  configureBuildCommand,
  createYargs,
  normalizeOptions,
} = require("electron-builder/out/builder");
const { Arch, Packager } = require("electron-builder");

const desktopDir = fileURLToPath(new URL("..", import.meta.url));
const desktopScripts = readScripts(new URL("../package.json", import.meta.url));
const rootScripts = readScripts(new URL("../../../package.json", import.meta.url));

function readScripts(url) {
  return JSON.parse(readFileSync(url, "utf8")).scripts;
}

function argsAfter(script, prefix) {
  expect(script.startsWith(prefix)).toBe(true);
  return script.slice(prefix.length).trim().split(/\s+/).filter(Boolean);
}

// npm appends forwarded arguments to the last command of the desktop build script.
function electronBuilderArgv(forwarded) {
  const invocation = desktopScripts.build.split("&&").at(-1).trim().split(/\s+/);
  expect(invocation[0]).toBe("electron-builder");
  return [...invocation.slice(1), ...forwarded];
}

async function resolveBuild(argv) {
  const options = normalizeOptions(configureBuildCommand(createYargs()).parse(argv));
  const packager = new Packager({ ...options, projectDir: desktopDir });
  await packager.validateConfig();
  return { config: packager.config, options };
}

describe("local macOS build", () => {
  test("forwards its arguments through build:desktop to electron-builder", () => {
    expect(
      rootScripts["build:desktop"].endsWith("npm run build --workspace=@getpaseo/desktop --"),
    ).toBe(true);
  });

  test("builds an arm64 app folder, ad-hoc signed, without hardened runtime or notarization", async () => {
    const forwarded = argsAfter(
      desktopScripts["build:mac-local"],
      "npm --prefix ../.. run build:desktop --",
    );
    const { config, options } = await resolveBuild(electronBuilderArgv(forwarded));

    expect(config.mac.identity).toBe("-");
    expect(config.mac.hardenedRuntime).toBe(false);
    expect(config.mac.notarize).toBe(false);
    expect(config.mac.executableName).toBe("Paseo Glass");
    expect(config.appId).toBe("sh.paseo.desktop.glass");
    expect(config.publish).toBeNull();
    expect(config.protocols).toEqual([
      { name: "Paseo Glass agent link", schemes: ["paseo-glass"] },
    ]);
    expect(options.publish).toBe("never");
    const macTargets = [...options.targets.entries()].find(([platform]) => platform.name === "mac");
    expect([...macTargets[1].entries()]).toEqual([[Arch.arm64, ["dir"]]]);
  });

  test("keeps the release build signed and notarized", async () => {
    const { config } = await resolveBuild(electronBuilderArgv([]));

    expect(config.mac.identity).toBeUndefined();
    expect(config.mac.hardenedRuntime).toBe(true);
    expect(config.mac.notarize).toBe(true);
  });
});
