import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DESKTOP_IDENTITY } from "../../identity.js";

vi.mock("electron", () => ({
  app: { isPackaged: false, getPath: () => "/unused/exe" },
}));

vi.mock("electron-log/main", () => ({
  default: { info: vi.fn(), warn: vi.fn() },
}));

import { getCliInstallStatus, installCli, uninstallCli } from "./install.js";

const OFFICIAL_CLI_SOURCE = "/Applications/Paseo.app/Contents/Resources/bin/paseo";

let fakeHome = "";

beforeEach(() => {
  fakeHome = mkdtempSync(path.join(os.tmpdir(), "paseo-glass-cli-install-"));
  vi.spyOn(os, "homedir").mockReturnValue(fakeHome);
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(fakeHome, { recursive: true, force: true });
});

describe.skipIf(process.platform === "win32")("CLI install", () => {
  it("installs under its own name and leaves the official paseo CLI alone", async () => {
    const binDir = path.join(fakeHome, ".local", "bin");
    const officialCli = path.join(binDir, "paseo");
    const ownCli = path.join(binDir, DESKTOP_IDENTITY.cliName);
    mkdirSync(binDir, { recursive: true });
    symlinkSync(OFFICIAL_CLI_SOURCE, officialCli);

    expect(DESKTOP_IDENTITY.cliName).not.toBe("paseo");
    expect(await getCliInstallStatus()).toEqual({ installed: false });

    expect(await installCli()).toEqual({ installed: true });
    expect(lstatSync(ownCli).isSymbolicLink()).toBe(true);
    expect(readlinkSync(officialCli)).toBe(OFFICIAL_CLI_SOURCE);

    expect(await uninstallCli()).toEqual({ installed: false });
    expect(existsSync(ownCli)).toBe(false);
    expect(readlinkSync(officialCli)).toBe(OFFICIAL_CLI_SOURCE);
  });
});
