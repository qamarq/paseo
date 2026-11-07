import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTrailingThrottle } from "./trailing-throttle";

describe("createTrailingThrottle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs the first call at once and the latest one after the interval", () => {
    const run = vi.fn();
    const throttle = createTrailingThrottle(run, 100);

    throttle.call(1);
    throttle.call(2);
    throttle.call(3);
    expect(run.mock.calls).toEqual([[1]]);

    vi.advanceTimersByTime(100);
    expect(run.mock.calls).toEqual([[1], [3]]);

    vi.advanceTimersByTime(100);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("delivers a pending value on flush and drops it on cancel", () => {
    const run = vi.fn();
    const throttle = createTrailingThrottle(run, 100);

    throttle.call(1);
    throttle.call(2);
    throttle.flush();
    expect(run.mock.calls).toEqual([[1], [2]]);

    throttle.call(3);
    throttle.call(4);
    throttle.cancel();
    vi.runAllTimers();
    expect(run.mock.calls).toEqual([[1], [2], [3]]);
  });
});
