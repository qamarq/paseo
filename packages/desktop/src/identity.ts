import { existsSync } from "node:fs";
import path from "node:path";
import { editPersistedConfig, readPersistedConfig } from "@getpaseo/server/configuration";
import { resolvePaseoHome } from "@getpaseo/server/daemon-control";

export const DESKTOP_IDENTITY = {
  productName: "Paseo Glass",
  appId: "sh.paseo.desktop.glass",
  deepLinkScheme: "paseo-glass",
  cliName: "paseo-glass",
  paseoHome: "~/.paseo-glass",
  daemonListen: "127.0.0.1:6777",
  updatesEnabled: false,
} as const;

const UPSTREAM_PASEO_HOME = "~/.paseo";
const UPSTREAM_DAEMON_PORT = 6767;
const SERVER_DEFAULT_LISTEN = `127.0.0.1:${UPSTREAM_DAEMON_PORT}`;

export function resolveDesktopPaseoHome(env: NodeJS.ProcessEnv): string {
  const ownHome = resolvePaseoHome({ PASEO_HOME: DESKTOP_IDENTITY.paseoHome });
  if (!env.PASEO_HOME?.trim()) return ownHome;
  const configured = resolvePaseoHome(env);
  return configured === resolvePaseoHome({ PASEO_HOME: UPSTREAM_PASEO_HOME })
    ? ownHome
    : configured;
}

export function seedDesktopDaemonListen(home: string): boolean {
  if (existsSync(path.join(home, "config.json"))) return false;
  editPersistedConfig(home, "daemon.listen", { value: DESKTOP_IDENTITY.daemonListen });
  return true;
}

export function assertDesktopDaemonListen(home: string): void {
  const listen = readPersistedConfig(home).daemon?.listen ?? SERVER_DEFAULT_LISTEN;
  if (listenPort(listen) !== UPSTREAM_DAEMON_PORT) return;
  throw new Error(
    `${DESKTOP_IDENTITY.productName} will not start its daemon on ${listen}, the port the official ` +
      `Paseo app uses. Run \`paseo daemon config set daemon.listen ${DESKTOP_IDENTITY.daemonListen} ` +
      `--home ${home}\` or set daemon.listen in ${path.join(home, "config.json")}, then start it again.`,
  );
}

function listenPort(listen: string): number | null {
  const trimmed = listen.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (/^(\\\\|pipe:\/\/|unix:\/\/|\/|~)/.test(trimmed)) return null;
  const port = Number(trimmed.slice(trimmed.lastIndexOf(":") + 1));
  return Number.isInteger(port) ? port : null;
}
