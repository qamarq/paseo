import { useSyncExternalStore } from "react";
import { pluginRegistry } from "@/plugins/registry";
import { useHostRegistryStatus, useHosts } from "@/runtime/host-runtime";

export function usePluginCatalogsSettled(): boolean {
  const registryStatus = useHostRegistryStatus();
  const hosts = useHosts();
  const readSettled = () =>
    registryStatus === "ready" &&
    hosts.every((host) => pluginRegistry.getCatalogStatus(host.serverId) !== "loading");
  return useSyncExternalStore(pluginRegistry.subscribe, readSettled, readSettled);
}
