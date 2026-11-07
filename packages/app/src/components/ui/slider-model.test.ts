import { describe, expect, it } from "vitest";
import { clampSliderValue, sliderFraction, sliderValueAtFraction } from "./slider-model";

const HUE = { min: 0, max: 360, step: 1 };

describe("slider model", () => {
  it("snaps to the step and stays in range", () => {
    expect(clampSliderValue(243.4, HUE)).toBe(243);
    expect(clampSliderValue(-12, HUE)).toBe(0);
    expect(clampSliderValue(400, HUE)).toBe(360);
    expect(clampSliderValue(0.27, { min: 0, max: 1, step: 0.1 })).toBe(0.3);
    expect(clampSliderValue(17, { min: 15, max: 100, step: 5 })).toBe(15);
  });

  it("maps a track position to a stepped value and back", () => {
    expect(sliderValueAtFraction(0.675, HUE)).toBe(243);
    expect(sliderValueAtFraction(1.2, HUE)).toBe(360);
    expect(sliderFraction(90, HUE)).toBe(0.25);
    expect(sliderFraction(5, { min: 5, max: 5, step: 1 })).toBe(0);
  });
});
