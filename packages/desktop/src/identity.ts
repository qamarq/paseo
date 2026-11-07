import { existsSync } from "node:fs";
import path from "node:path";
import { editPersistedConfig } from "@getpaseo/server/configuration";
import { resolvePaseoHome } from "@getpaseo/server/daemon-control";

export const DESKTOP_IDENTITY = {
  productName: "Paseo Glass",
  appId: "sh.paseo.desktop.glass",
  deepLinkScheme: "paseo-glass",
  paseoHome: "~/.paseo-glass",
  daemonListen: "127.0.0.1:6777",
  updatesEnabled: false,
} as const;

const UPSTREAM_PASEO_HOME = "~/.paseo";

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
