import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SegmentedControl, type SegmentedControlOption } from "@/components/ui/segmented-control";
import { useAppSettings } from "@/hooks/use-settings";
import { selectMonoScheme } from "./mono-scheme-selection";
import type { MonoSchemePreference } from "./mono-settings";

export function ThemePicker() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppSettings();
  const options = useMemo<SegmentedControlOption<MonoSchemePreference>[]>(
    () => [
      { value: "system", label: t("settings.appearance.theme.options.auto") },
      { value: "dark", label: t("settings.appearance.theme.options.dark") },
      { value: "light", label: t("settings.appearance.theme.options.light") },
    ],
    [t],
  );
  const select = useCallback(
    (scheme: MonoSchemePreference) =>
      void updateSettings((current) => selectMonoScheme(current, scheme)),
    [updateSettings],
  );
  return (
    <SegmentedControl
      options={options}
      value={settings.monoAppearance.scheme}
      onValueChange={select}
    />
  );
}
