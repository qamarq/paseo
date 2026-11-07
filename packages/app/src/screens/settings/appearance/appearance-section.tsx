import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { SettingsSection } from "@/components/settings/headings/settings-section";
import { ThemePicker } from "@/appearance/theme-picker";
import { settingsStyles } from "@/styles/settings";
import { TypographySettings } from "./typography-settings";

export function AppearanceSection() {
  const { t } = useTranslation();
  return (
    <View>
      <SettingsSection title={t("settings.appearance.theme.title")}>
        <View style={[settingsStyles.card, styles.themeCard]}>
          <ThemePicker />
        </View>
      </SettingsSection>
      <TypographySettings Section={SettingsSection} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  themeCard: {
    padding: theme.spacing[3],
  },
}));
