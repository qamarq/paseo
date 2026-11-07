import { useCallback, useMemo, type ReactNode } from "react";
import { Pressable, View, type PressableStateCallbackType } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { inlineUnistylesStyle } from "@/styles/unistyles-inline-style";

const DOT_SIZE = 14;
const RING_WIDTH = 2;
const RING_GAP = 1;

export function ColorSwatch({
  color,
  selected,
  accessibilityLabel,
  onPress,
  children,
  testID,
}: {
  color: string;
  selected: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  children?: ReactNode;
  testID?: string;
}) {
  const accessibilityState = useMemo(() => ({ selected }), [selected]);
  const dotStyle = useMemo(
    () => [styles.dot, inlineUnistylesStyle({ backgroundColor: color })],
    [color],
  );
  const ringStyle = useCallback(
    ({ hovered, pressed }: PressableStateCallbackType) => [
      styles.ring,
      selected ? styles.ringSelected : null,
      hovered || pressed ? styles.ringActive : null,
    ],
    [selected],
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={ringStyle}
      testID={testID}
    >
      <View style={dotStyle}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  ring: {
    padding: RING_GAP,
    borderRadius: theme.borderRadius.full,
    borderWidth: RING_WIDTH,
    borderColor: "transparent",
  },
  ringSelected: {
    borderColor: theme.colors.foreground,
  },
  ringActive: {
    opacity: 0.85,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
}));
