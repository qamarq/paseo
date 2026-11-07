import { useCallback, useEffect, useMemo, useRef, type ChangeEvent } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { clampSliderValue, type SliderProps } from "./slider-model";

const STYLE_ID = "paseo-slider-styles";
const SLIDER_CLASS = "paseo-slider";

function installSliderStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.${SLIDER_CLASS} {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}
.${SLIDER_CLASS}:disabled {
  cursor: default;
}
.${SLIDER_CLASS}::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: var(--colors-surface3);
}
.${SLIDER_CLASS}::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  margin-top: -4px;
  border: none;
  border-radius: 999px;
  background: var(--colors-foreground);
}
.${SLIDER_CLASS}::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: var(--colors-surface3);
}
.${SLIDER_CLASS}::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: none;
  border-radius: 999px;
  background: var(--colors-foreground);
}
.${SLIDER_CLASS}:focus {
  outline: none;
}
.${SLIDER_CLASS}:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 2px var(--colors-ring);
}
`;
  document.head.appendChild(style);
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const range = useMemo(() => ({ min, max, step }), [min, max, step]);

  useEffect(() => installSliderStyles(), []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || !onSlidingComplete) return;
    const handleCommit = () => onSlidingComplete(clampSliderValue(Number(input.value), range));
    input.addEventListener("change", handleCommit);
    return () => input.removeEventListener("change", handleCommit);
  }, [onSlidingComplete, range]);

  const handleInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onValueChange(clampSliderValue(Number(event.currentTarget.value), range));
    },
    [onValueChange, range],
  );

  return (
    <View style={[styles.container, disabled ? styles.disabled : null, style]}>
      <input
        ref={inputRef}
        type="range"
        className={SLIDER_CLASS}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={accessibilityLabel}
        data-testid={testID}
        onChange={handleInput}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    width: 180,
    justifyContent: "center",
  },
  disabled: {
    opacity: theme.opacity[50],
  },
}));
