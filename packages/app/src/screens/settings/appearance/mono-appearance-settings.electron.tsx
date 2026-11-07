import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import { Text, useColorScheme, View } from "react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { Pipette } from "lucide-react-native";
import { useContributedThemes } from "@/appearance/provider";
import { patchMonoAppearance, selectMonoScheme } from "@/appearance/mono-scheme-selection";
import {
  DEFAULT_MONO_APPEARANCE,
  INTERFACE_SCALE_OPTIONS,
  MONO_APPEARANCE_RANGES,
  resolveMonoColorScheme,
  type MonoAppearance,
  type MonoSchemePreference,
} from "@/appearance/mono-settings";
import { SettingsCard, SettingsRow, SettingsSelect, SettingsSwitch } from "@/components/settings";
import { Button } from "@/components/ui/button";
import { ColorSwatch } from "@/components/ui/color-swatch";
import { SegmentedControl, type SegmentedControlOption } from "@/components/ui/segmented-control";
import { Slider } from "@/components/ui/slider";
import { getIsElectronMac } from "@/constants/platform";
import { useAppSettings, type AppSettingsUpdate } from "@/hooks/use-settings";
import type { MonoDiffPalette } from "@/styles/mono-theme";
import type { Theme } from "@/styles/theme";
import { createTrailingThrottle } from "@/utils/trailing-throttle";
import { MONO_APPEARANCE_COPY as copy } from "./mono-appearance-copy";
import { MonoSettingsGroup } from "./mono-settings-group";

// Each live slider step rebuilds the Mono theme, so updates are rate-limited.
const LIVE_APPLY_INTERVAL_MS = 200;
const NO_PLUGIN_THEME = "none";
const CUSTOM_ACCENT_FALLBACK = "#4da3f5";

const ACCENT_SWATCHES = [
  { key: "blue", color: "#4da3f5" },
  { key: "violet", color: "#8b5cf6" },
  { key: "pink", color: "#ec4899" },
  { key: "red", color: "#ef4444" },
  { key: "orange", color: "#f59e0b" },
  { key: "green", color: "#10b981" },
] as const;

const SCHEME_OPTIONS: SegmentedControlOption<MonoSchemePreference>[] = [
  { value: "system", label: copy.theme.scheme.options.system },
  { value: "dark", label: copy.theme.scheme.options.dark },
  { value: "light", label: copy.theme.scheme.options.light },
];

const DIFF_OPTIONS: SegmentedControlOption<MonoDiffPalette>[] = [
  { value: "default", label: copy.theme.diff.options.default },
  { value: "colorblind", label: copy.theme.diff.options.colorblind },
  { value: "highContrast", label: copy.theme.diff.options.highContrast },
];

const SCALE_OPTIONS = INTERFACE_SCALE_OPTIONS.map((scale) => ({
  label: `${scale}%`,
  value: String(scale),
}));

const HIDDEN_COLOR_INPUT: CSSProperties = {
  position: "absolute",
  width: 0,
  height: 0,
  opacity: 0,
  pointerEvents: "none",
};

type UpdateMono = (patch: Partial<MonoAppearance>) => void;
type NumericMonoField = "hue" | "saturation" | "darkLightness" | "sidebarOpacity" | "blurRadius";

function useLiveMonoUpdate<Value>(
  update: UpdateMono,
  toPatch: (value: Value) => Partial<MonoAppearance>,
) {
  const latest = useRef({ update, toPatch });
  useEffect(() => {
    latest.current = { update, toPatch };
  });
  const [throttle] = useState(() =>
    createTrailingThrottle(
      (value: Value) => latest.current.update(latest.current.toPatch(value)),
      LIVE_APPLY_INTERVAL_MS,
    ),
  );
  useEffect(() => () => throttle.flush(), [throttle]);
  return throttle;
}

function MonoSliderRow({
  field,
  label,
  hint,
  value,
  unit,
  disabled,
  update,
}: {
  field: NumericMonoField;
  label: string;
  hint?: string;
  value: number;
  unit: string;
  disabled?: boolean;
  update: UpdateMono;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const throttle = useLiveMonoUpdate(update, (next: number) => ({ [field]: next }));
  const range = MONO_APPEARANCE_RANGES[field];
  const handleChange = useCallback(
    (next: number) => {
      setDraft(next);
      throttle.call(next);
    },
    [throttle],
  );
  const handleComplete = useCallback(
    (next: number) => {
      throttle.call(next);
      throttle.flush();
      setDraft(null);
    },
    [throttle],
  );
  const shown = draft ?? value;
  return (
    <SettingsRow label={label} hint={hint}>
      <View style={styles.sliderControl}>
        <Slider
          value={shown}
          min={range.min}
          max={range.max}
          disabled={disabled}
          accessibilityLabel={label}
          onValueChange={handleChange}
          onSlidingComplete={handleComplete}
        />
        <Text style={styles.sliderValue}>{`${shown}${unit}`}</Text>
      </View>
    </SettingsRow>
  );
}

const ThemedPipette = withUnistyles(Pipette, (theme: Theme) => ({
  color: theme.colors.foregroundMuted,
}));
const ContentSwatch = withUnistyles(ColorSwatch, (theme: Theme) => ({
  color: theme.colors.foreground,
}));
const EmptySwatch = withUnistyles(ColorSwatch, (theme: Theme) => ({
  color: theme.colors.surface3,
}));

function PresetAccentSwatch({
  swatch,
  selected,
  update,
}: {
  swatch: (typeof ACCENT_SWATCHES)[number];
  selected: boolean;
  update: UpdateMono;
}) {
  const select = useCallback(() => update({ accentColor: swatch.color }), [swatch, update]);
  return (
    <ColorSwatch
      color={swatch.color}
      selected={selected}
      accessibilityLabel={copy.theme.accent.swatches[swatch.key]}
      onPress={select}
    />
  );
}

function AccentRow({ accentColor, update }: { accentColor: string | null; update: UpdateMono }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const throttle = useLiveMonoUpdate(update, (color: string) => ({
    accentColor: color.toLowerCase(),
  }));
  const isCustom =
    accentColor !== null && !ACCENT_SWATCHES.some((swatch) => swatch.color === accentColor);
  const selectDefault = useCallback(() => update({ accentColor: null }), [update]);
  const openCustom = useCallback(() => inputRef.current?.click(), []);
  const handleCustom = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => throttle.call(event.currentTarget.value),
    [throttle],
  );
  return (
    <SettingsRow label={copy.theme.accent.label} hint={copy.theme.accent.hint}>
      <View style={styles.swatches} accessibilityRole="radiogroup">
        <ContentSwatch
          selected={accentColor === null}
          accessibilityLabel={copy.theme.accent.swatches.default}
          onPress={selectDefault}
        />
        {ACCENT_SWATCHES.map((swatch) => (
          <PresetAccentSwatch
            key={swatch.key}
            swatch={swatch}
            selected={accentColor === swatch.color}
            update={update}
          />
        ))}
        {isCustom && accentColor ? (
          <ColorSwatch
            color={accentColor}
            selected
            accessibilityLabel={copy.theme.accent.custom}
            onPress={openCustom}
          />
        ) : (
          <EmptySwatch
            selected={false}
            accessibilityLabel={copy.theme.accent.custom}
            onPress={openCustom}
          >
            <ThemedPipette size={9} strokeWidth={2} />
          </EmptySwatch>
        )}
        <input
          ref={inputRef}
          type="color"
          tabIndex={-1}
          aria-hidden
          value={accentColor ?? CUSTOM_ACCENT_FALLBACK}
          onChange={handleCustom}
          style={HIDDEN_COLOR_INPUT}
        />
      </View>
    </SettingsRow>
  );
}

function PluginThemeRow({ updateSettings }: { updateSettings: (u: AppSettingsUpdate) => unknown }) {
  const { options, selected, select } = useContributedThemes();
  const selectOptions = useMemo(
    () => [
      { label: copy.theme.pluginTheme.none, value: NO_PLUGIN_THEME },
      ...options.map((option) => ({ label: option.name, value: option.id })),
    ],
    [options],
  );
  const handleChange = useCallback(
    (id: string) => {
      const option = options.find((candidate) => candidate.id === id);
      if (option) {
        select(option);
        return;
      }
      void updateSettings((current) => selectMonoScheme(current, current.monoAppearance.scheme));
    },
    [options, select, updateSettings],
  );
  if (options.length === 0) return null;
  return (
    <SettingsSelect
      label={copy.theme.pluginTheme.label}
      hint={copy.theme.pluginTheme.hint}
      value={selected?.id ?? NO_PLUGIN_THEME}
      options={selectOptions}
      onValueChange={handleChange}
    />
  );
}

export function MonoAppearanceSettings() {
  const { settings, updateSettings } = useAppSettings();
  const mono = settings.monoAppearance;
  const isLight = resolveMonoColorScheme(mono.scheme, useColorScheme()) === "light";
  const showTranslucency = getIsElectronMac();

  const update = useCallback<UpdateMono>(
    (patch) => void updateSettings((current) => patchMonoAppearance(current, patch)),
    [updateSettings],
  );
  const selectScheme = useCallback(
    (scheme: MonoSchemePreference) =>
      void updateSettings((current) => selectMonoScheme(current, scheme)),
    [updateSettings],
  );
  const selectDiffPalette = useCallback(
    (diffPalette: MonoDiffPalette) => update({ diffPalette }),
    [update],
  );
  const setMainPaneGlass = useCallback(
    (mainPaneGlass: boolean) => update({ mainPaneGlass }),
    [update],
  );
  const setInterfaceScale = useCallback(
    (scale: string) => update({ interfaceScale: Number(scale) }),
    [update],
  );
  const restoreDefaults = useCallback(
    () => void updateSettings({ monoAppearance: DEFAULT_MONO_APPEARANCE }),
    [updateSettings],
  );
  const restoreButton = useMemo(
    () => (
      <Button variant="ghost" size="sm" onPress={restoreDefaults}>
        {copy.restoreDefaults}
      </Button>
    ),
    [restoreDefaults],
  );

  return (
    <>
      <MonoSettingsGroup
        title={copy.theme.title}
        description={copy.theme.description}
        trailing={restoreButton}
      >
        <SettingsCard>
          <SettingsRow label={copy.theme.scheme.label} hint={copy.theme.scheme.hint}>
            <SegmentedControl
              options={SCHEME_OPTIONS}
              value={mono.scheme}
              onValueChange={selectScheme}
            />
          </SettingsRow>
          <PluginThemeRow updateSettings={updateSettings} />
          <AccentRow accentColor={mono.accentColor} update={update} />
          <SettingsRow label={copy.theme.diff.label} hint={copy.theme.diff.hint}>
            <SegmentedControl
              options={DIFF_OPTIONS}
              value={mono.diffPalette}
              onValueChange={selectDiffPalette}
            />
          </SettingsRow>
        </SettingsCard>
      </MonoSettingsGroup>
      <MonoSettingsGroup title={copy.color.title} description={copy.color.description}>
        <SettingsCard>
          <MonoSliderRow
            field="hue"
            label={copy.color.hue.label}
            hint={copy.color.hue.hint}
            value={mono.hue}
            unit="°"
            update={update}
          />
          <MonoSliderRow
            field="saturation"
            label={copy.color.saturation.label}
            hint={copy.color.saturation.hint}
            value={mono.saturation}
            unit="%"
            update={update}
          />
          <MonoSliderRow
            field="darkLightness"
            label={copy.color.darkLightness.label}
            hint={copy.color.darkLightness.hint}
            value={mono.darkLightness}
            unit="%"
            disabled={isLight}
            update={update}
          />
        </SettingsCard>
      </MonoSettingsGroup>
      {showTranslucency ? (
        <MonoSettingsGroup
          title={copy.translucency.title}
          description={isLight ? copy.translucency.lightDescription : copy.translucency.description}
        >
          <SettingsCard>
            <MonoSliderRow
              field="sidebarOpacity"
              label={copy.translucency.sidebarOpacity.label}
              hint={copy.translucency.sidebarOpacity.hint}
              value={mono.sidebarOpacity}
              unit="%"
              disabled={isLight}
              update={update}
            />
            <MonoSliderRow
              field="blurRadius"
              label={copy.translucency.blurRadius.label}
              hint={copy.translucency.blurRadius.hint}
              value={mono.blurRadius}
              unit=""
              disabled={isLight}
              update={update}
            />
            <SettingsSwitch
              label={copy.translucency.mainPaneGlass.label}
              hint={copy.translucency.mainPaneGlass.hint}
              value={mono.mainPaneGlass}
              onValueChange={setMainPaneGlass}
              disabled={isLight}
            />
          </SettingsCard>
        </MonoSettingsGroup>
      ) : null}
      <MonoSettingsGroup title={copy.interface.title}>
        <SettingsCard>
          <SettingsSelect
            label={copy.interface.scale.label}
            hint={copy.interface.scale.hint}
            value={String(mono.interfaceScale)}
            options={SCALE_OPTIONS}
            onValueChange={setInterfaceScale}
          />
        </SettingsCard>
      </MonoSettingsGroup>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  sliderControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  sliderValue: {
    minWidth: 40,
    textAlign: "right",
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontVariant: ["tabular-nums"],
  },
  swatches: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1.5],
  },
}));
