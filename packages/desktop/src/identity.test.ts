import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertDesktopDaemonListen,
  DESKTOP_IDENTITY,
  resolveDesktopPaseoHome,
  seedDesktopDaemonListen,
} from "./identity.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const ownHome = join(homedir(), ".paseo-glass");

let tempHome = "";

afterEach(() => {
  if (tempHome) {
    rmSync(tempHome, { recursive: true, force: true });
    tempHome = "";
  }
});

describe("desktop identity", () => {
  it("matches the packaged application identity", () => {
    const config = readFileSync(join(packageRoot, "electron-builder.yml"), "utf8");

    expect(config).toContain(`appId: ${DESKTOP_IDENTITY.appId}\n`);
    expect(config).toContain(`productName: ${DESKTOP_IDENTITY.productName}\n`);
    expect(config).toContain(`  executableName: ${DESKTOP_IDENTITY.productName}\n`);
    expect(config).toContain("publish: null\n");
  });

  it("uses its own home when none is configured", () => {
    expect(resolveDesktopPaseoHome({})).toBe(ownHome);
    expect(resolveDesktopPaseoHome({ PASEO_HOME: "  " })).toBe(ownHome);
  });

  it("never adopts the upstream Paseo home inherited from a Paseo terminal", () => {
    expect(resolveDesktopPaseoHome({ PASEO_HOME: "~/.paseo" })).toBe(ownHome);
    expect(resolveDesktopPaseoHome({ PASEO_HOME: join(homedir(), ".paseo") })).toBe(ownHome);
  });

  it("keeps an explicitly configured home", () => {
    expect(resolveDesktopPaseoHome({ PASEO_HOME: "/tmp/paseo-glass-e2e" })).toBe(
      "/tmp/paseo-glass-e2e",
    );
  });

  it("seeds a fresh home with its own daemon listen address and the server defaults", () => {
    tempHome = mkdtempSync(join(tmpdir(), "paseo-glass-home-"));

    expect(seedDesktopDaemonListen(tempHome)).toBe(true);

    const config = JSON.parse(readFileSync(join(tempHome, "config.json"), "utf8"));
    expect(config.daemon.listen).toBe(DESKTOP_IDENTITY.daemonListen);
    expect(config.daemon.relay).toEqual({ enabled: false });
    expect(seedDesktopDaemonListen(tempHome)).toBe(false);
  });

  it("leaves an existing daemon config untouched", () => {
    tempHome = mkdtempSync(join(tmpdir(), "paseo-glass-home-"));
    const existing = `${JSON.stringify({ version: 1, daemon: { listen: "127.0.0.1:7001" } })}\n`;
    writeFileSync(join(tempHome, "config.json"), existing);

    expect(seedDesktopDaemonListen(tempHome)).toBe(false);
    expect(readFileSync(join(tempHome, "config.json"), "utf8")).toBe(existing);
  });

  it("refuses a daemon config that listens on the official Paseo port", () => {
    tempHome = mkdtempSync(join(tmpdir(), "paseo-glass-home-"));
    const writeListen = (listen?: string) =>
      writeFileSync(
        join(tempHome, "config.json"),
        JSON.stringify({ version: 1, daemon: listen === undefined ? {} : { listen } }),
      );

    for (const listen of [
      "127.0.0.1:6767",
      "0.0.0.0:6767",
      "localhost:6767",
      "[::1]:6767",
      "6767",
    ]) {
      writeListen(listen);
      expect(() => assertDesktopDaemonListen(tempHome), listen).toThrow(
        `paseo daemon config set daemon.listen ${DESKTOP_IDENTITY.daemonListen} --home ${tempHome}`,
      );
    }
    writeListen();
    expect(() => assertDesktopDaemonListen(tempHome)).toThrow(/official Paseo app/);
  });

  it("accepts its own port, other ports and socket listeners", () => {
    tempHome = mkdtempSync(join(tmpdir(), "paseo-glass-home-"));
    expect(seedDesktopDaemonListen(tempHome)).toBe(true);
    expect(() => assertDesktopDaemonListen(tempHome)).not.toThrow();

    for (const listen of ["127.0.0.1:6768", "/tmp/paseo-glass.sock", "unix:///tmp/paseo.sock"]) {
      writeFileSync(
        join(tempHome, "config.json"),
        JSON.stringify({ version: 1, daemon: { listen } }),
      );
      expect(() => assertDesktopDaemonListen(tempHome), listen).not.toThrow();
    }
  });
});
