import { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { inlineUnistylesStyle } from "@/styles/unistyles-inline-style";
import {
  clampSliderValue,
  sliderFraction,
  sliderValueAtFraction,
  type SliderProps,
} from "./slider-model";

const THUMB_SIZE = 16;
const ACCESSIBILITY_ACTIONS = [{ name: "increment" }, { name: "decrement" }] as const;

export function Slider({
  value,
  min,
  max,
  step = 1,
  disabled = false,
  accessibilityLabel,
  onValueChange,
  onSlidingComplete,
  style,
  testID,
}: SliderProps) {
  const range = useMemo(() => ({ min, max, step }), [min, max, step]);
  const [width, setWidth] = useState(0);
  const trackLeft = useRef(0);
  const latest = useRef(value);

  const emit = useCallback(
    (next: number) => {
      latest.current = next;
      onValueChange(next);
    },
    [onValueChange],
  );
  const valueAt = useCallback(
    (pageX: number) =>
      sliderValueAtFraction(width > 0 ? (pageX - trackLeft.current) / width : 0, range),
    [range, width],
  );
  const handleGrant = useCallback(
    (event: GestureResponderEvent) => {
      trackLeft.current = event.nativeEvent.pageX - event.nativeEvent.locationX;
      emit(valueAt(event.nativeEvent.pageX));
    },
    [emit, valueAt],
  );
  const handleMove = useCallback(
    (event: GestureResponderEvent) => emit(valueAt(event.nativeEvent.pageX)),
    [emit, valueAt],
  );
  const handleRelease = useCallback(() => onSlidingComplete?.(latest.current), [onSlidingComplete]);
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width),
    [],
  );
  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const direction = event.nativeEvent.actionName === "increment" ? 1 : -1;
      const next = clampSliderValue(value + direction * step, range);
      emit(next);
      onSlidingComplete?.(next);
    },
    [emit, onSlidingComplete, range, step, value],
  );
  const canRespond = useCallback(() => !disabled, [disabled]);
  const refuseTermination = useCallback(() => false, []);

  const thumbStyle = useMemo(
    () => [
      styles.thumb,
      inlineUnistylesStyle({
        transform: [{ translateX: sliderFraction(value, range) * Math.max(0, width - THUMB_SIZE) }],
      }),
    ],
    [range, value, width],
  );
  const accessibilityValue = useMemo(() => ({ min, max, now: value }), [min, max, value]);
  const accessibilityState = useMemo(() => ({ disabled }), [disabled]);

  return (
    <View
      style={[styles.container, disabled ? styles.disabled : null, style]}
      onLayout={handleLayout}
      onStartShouldSetResponder={canRespond}
      onMoveShouldSetResponder={canRespond}
      onResponderTerminationRequest={refuseTermination}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={handleRelease}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={accessibilityValue}
      accessibilityState={accessibilityState}
      accessibilityActions={ACCESSIBILITY_ACTIONS}
      onAccessibilityAction={handleAccessibilityAction}
      testID={testID}
    >
      <View pointerEvents="none" style={styles.track} />
      <View pointerEvents="none" style={thumbStyle} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    width: 180,
    height: 32,
    justifyContent: "center",
  },
  disabled: {
    opacity: theme.opacity[50],
  },
  track: {
    height: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface3,
  },
  thumb: {
    position: "absolute",
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: theme.colors.foreground,
  },
}));
