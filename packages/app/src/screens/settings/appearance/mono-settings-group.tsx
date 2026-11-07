import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function MonoSettingsGroup({
  title,
  description,
  trailing,
  children,
}: {
  title: string;
  description?: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {trailing}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  group: {
    marginBottom: theme.spacing[8],
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: theme.spacing[3],
    marginBottom: theme.spacing[3],
  },
  headerText: {
    flex: 1,
    gap: theme.spacing[1],
  },
  title: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
  },
  description: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
  },
  content: {
    gap: theme.spacing[3],
  },
}));
