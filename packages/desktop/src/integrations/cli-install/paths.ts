import path from "node:path";
import { createRequire } from "node:module";
import { resolveCliShimPath } from "./path.js";
import os from "node:os";
import { app } from "electron";
import { DESKTOP_IDENTITY } from "../../identity.js";

export function getLocalBinDir(): string {
  return path.join(os.homedir(), ".local", "bin");
}

export function getCliTargetPath(): string {
  const name = DESKTOP_IDENTITY.cliName;
  return path.join(getLocalBinDir(), process.platform === "win32" ? `${name}.cmd` : name);
}

export function getBundledCliShimPath(): string {
  return resolveCliShimPath({
    platform: process.platform,
    isPackaged: app.isPackaged,
    executablePath: app.getPath("exe"),
    resolveWorkspaceCli: () => createRequire(__filename).resolve("@getpaseo/cli/bin/paseo"),
  });
}
