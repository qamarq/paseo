import { View } from "react-native";
import { MonoAppearanceSettings } from "./mono-appearance-settings";
import { MonoSettingsGroup } from "./mono-settings-group";
import { TypographySettings } from "./typography-settings";

export function AppearanceSection() {
  return (
    <View>
      <MonoAppearanceSettings />
      <TypographySettings Section={MonoSettingsGroup} />
    </View>
  );
}
