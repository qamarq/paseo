import { useEffect } from "react";
import { updateDesktopWindowChrome } from "@/desktop/electron/window";
import { getDesktopHost } from "@/desktop/host";
import type { AppSettingsUpdate } from "@/hooks/use-settings";
import { readInterfaceScaleStep, stepInterfaceScale } from "./mono-settings";

export function useDesktopInterfaceScale(
  scale: number | null,
  updateSettings: (updates: AppSettingsUpdate) => Promise<void>,
): void {
  useEffect(() => {
    if (scale === null) return;
    void updateDesktopWindowChrome({ zoomFactor: scale / 100 }).catch((error) => {
      console.warn("[DesktopWindow] Failed to apply the interface scale", error);
    });
  }, [scale]);

  useEffect(() => {
    let disposed = false;
    let stop: (() => void) | undefined;
    const subscription = getDesktopHost()?.events?.on?.("interface-scale", (payload) => {
      const step = readInterfaceScaleStep(payload);
      if (step === null) return;
      void updateSettings((current) => ({
        monoAppearance: {
          ...current.monoAppearance,
          interfaceScale: stepInterfaceScale(current.monoAppearance.interfaceScale, step),
        },
      }));
    });
    void Promise.resolve(subscription).then((unsubscribe) => {
      if (disposed) unsubscribe?.();
      else stop = unsubscribe;
      return;
    });
    return () => {
      disposed = true;
      stop?.();
    };
  }, [updateSettings]);
}
