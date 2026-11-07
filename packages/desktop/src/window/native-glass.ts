import path from "node:path";
import log from "electron-log/main";
import type { NativeGlass } from "./window-glass.js";

const ADDON_PATH = path.join(__dirname, "..", "native", "mac-glass.node");

function isNativeGlass(addon: unknown): addon is NativeGlass {
  return (
    typeof addon === "object" &&
    addon !== null &&
    "apply" in addon &&
    typeof addon.apply === "function"
  );
}

export function loadNativeGlass(platform: NodeJS.Platform): NativeGlass | null {
  if (platform !== "darwin") return null;
  let addon: unknown;
  try {
    addon = require(ADDON_PATH);
  } catch (error) {
    log.warn("[window] native glass addon failed to load; using AppKit vibrancy", error);
    return null;
  }
  if (!isNativeGlass(addon)) {
    log.warn("[window] native glass addon has no apply(); using AppKit vibrancy");
    return null;
  }
  return addon;
}
