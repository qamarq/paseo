import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") process.exit(0);

const script = fileURLToPath(import.meta.url);
const desktopDir = path.resolve(path.dirname(script), "..");
const source = path.join(desktopDir, "native", "mac-glass", "glass.mm");
const output = path.join(desktopDir, "dist", "native", "mac-glass.node");
// Node-API is ABI-stable, so the running Node's headers build an addon Electron can load.
const nodeHeaders = path.resolve(path.dirname(process.execPath), "..", "include", "node");

function isUpToDate() {
  if (!existsSync(output)) return false;
  const builtAt = statSync(output).mtimeMs;
  return builtAt > statSync(source).mtimeMs && builtAt > statSync(script).mtimeMs;
}

function findMissingToolchain() {
  if (!existsSync(path.join(nodeHeaders, "node_api.h"))) {
    return `Node-API headers not found in ${nodeHeaders}; install Node from an official build`;
  }
  try {
    execFileSync("xcrun", ["--find", "clang++"], { stdio: "ignore" });
  } catch {
    return "xcrun clang++ is unavailable; install the Xcode Command Line Tools";
  }
  return null;
}

if (isUpToDate()) process.exit(0);

const missing = findMissingToolchain();
if (missing !== null) {
  if (process.env.CI) throw new Error(missing);
  console.warn(`[mac-glass] ${missing}. Skipping the addon; window glass uses AppKit vibrancy.`);
  process.exit(0);
}

mkdirSync(path.dirname(output), { recursive: true });
execFileSync(
  "xcrun",
  [
    "clang++",
    "-std=c++17",
    "-ObjC++",
    "-fobjc-arc",
    "-O2",
    "-Wall",
    "-bundle",
    "-undefined",
    "dynamic_lookup",
    "-arch",
    "arm64",
    "-arch",
    "x86_64",
    "-mmacosx-version-min=13.0",
    "-I",
    nodeHeaders,
    "-framework",
    "AppKit",
    "-framework",
    "QuartzCore",
    source,
    "-o",
    output,
  ],
  { stdio: "inherit" },
);
