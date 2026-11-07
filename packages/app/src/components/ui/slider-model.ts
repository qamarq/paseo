import type { StyleProp, ViewStyle } from "react-native";

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  accessibilityLabel: string;
  onValueChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export interface SliderRange {
  min: number;
  max: number;
  step: number;
}

export function clampSliderValue(value: number, range: SliderRange): number {
  const stepped = range.min + Math.round((value - range.min) / range.step) * range.step;
  const precision = Math.max(0, -Math.floor(Math.log10(range.step)));
  const rounded = Number(stepped.toFixed(precision));
  return Math.min(range.max, Math.max(range.min, rounded));
}

export function sliderValueAtFraction(fraction: number, range: SliderRange): number {
  return clampSliderValue(range.min + fraction * (range.max - range.min), range);
}

export function sliderFraction(value: number, range: SliderRange): number {
  if (range.max === range.min) return 0;
  return (clampSliderValue(value, range) - range.min) / (range.max - range.min);
}
