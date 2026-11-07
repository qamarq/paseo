import { describe, expect, it } from "vitest";
import { resolveMonoColorScheme } from "./mono-settings";

describe("resolveMonoColorScheme", () => {
  it.each([
    ["light", "light"],
    ["dark", "dark"],
    [null, "dark"],
    [undefined, "dark"],
    ["unspecified", "dark"],
  ] as const)("follows the OS scheme %s as %s when set to system", (systemScheme, expected) => {
    expect(resolveMonoColorScheme("system", systemScheme)).toBe(expected);
  });

  it("keeps an explicit scheme whatever the OS reports", () => {
    expect(resolveMonoColorScheme("dark", "light")).toBe("dark");
    expect(resolveMonoColorScheme("light", "dark")).toBe("light");
  });
});
