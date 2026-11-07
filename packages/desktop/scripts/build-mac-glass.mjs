import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") process.exit(0);

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(desktopDir, "native", "mac-glass", "glass.mm");
const output = path.join(desktopDir, "dist", "native", "mac-glass.node");
// Node-API is ABI-stable, so the running Node's headers build an addon Electron can load.
const nodeHeaders = path.resolve(path.dirname(process.execPath), "..", "include", "node");

if (!existsSync(path.join(nodeHeaders, "node_api.h"))) {
  throw new Error(
    `Node-API headers not found in ${nodeHeaders}; install Node from an official build.`,
  );
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
    "-Werror",
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
