import { describe, expect, it } from "vitest";
import { readPositiveIntegerEnv } from "@/lib/config";

describe("readPositiveIntegerEnv", () => {
  it("falls back when the value is missing or blank", () => {
    expect(readPositiveIntegerEnv(undefined, 25)).toBe(25);
    expect(readPositiveIntegerEnv("", 25)).toBe(25);
  });

  it("falls back when the value is not a finite positive integer", () => {
    expect(readPositiveIntegerEnv("abc", 25)).toBe(25);
    expect(readPositiveIntegerEnv("Infinity", 25)).toBe(25);
    expect(readPositiveIntegerEnv("0", 25)).toBe(25);
    expect(readPositiveIntegerEnv("-3", 25)).toBe(25);
    expect(readPositiveIntegerEnv("12.7", 25)).toBe(25);
  });

  it("reads positive integers", () => {
    expect(readPositiveIntegerEnv("12", 25)).toBe(12);
  });
});
