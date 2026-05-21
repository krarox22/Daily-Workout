import { describe, expect, it } from "vitest";
import {
  cleanRedditText,
  extractDisplayDate,
  isDailyWorkoutTitle,
  parseWorkout
} from "@/lib/parser";

describe("parser", () => {
  it("matches Daily Workout titles case-insensitively", () => {
    expect(isDailyWorkoutTitle("Daily Workout and General Chat for Friday 05/22/26", "Daily Workout")).toBe(true);
    expect(isDailyWorkoutTitle("daily workout intel", "Daily Workout")).toBe(true);
    expect(isDailyWorkoutTitle("Lift 50 discussion", "Daily Workout")).toBe(false);
  });

  it("extracts display dates from common title formats", () => {
    expect(extractDisplayDate("Daily Workout and General Chat for Friday 05/22/26")).toBe("May 22");
    expect(extractDisplayDate("Daily Workout - 5/7/2026")).toBe("May 7");
    expect(extractDisplayDate("Daily Workout")).toBeNull();
  });

  it("cleans reddit markdown without expanding Orangetheory shorthand", () => {
    const cleaned = cleanRedditText("**Tread**\n\n* 1 min AO\n* 30 sec WR\n\n&nbsp;");
    expect(cleaned).toBe("Tread\n1 min AO\n30 sec WR");
  });

  it("parses confident sections in original order", () => {
    const parsed = parseWorkout({
      title: "Daily Workout - 5/22/2026",
      selftext: [
        "Floor Block",
        "10 goblet squats",
        "8 low rows",
        "",
        "Tread Block",
        "2 min push",
        "1 min AO"
      ].join("\n")
    });

    expect(parsed.parserMode).toBe("structured");
    expect(parsed.displayDate).toBe("May 22");
    expect(parsed.sections.map((section) => section.heading)).toEqual(["Floor Block", "Tread Block"]);
    expect(parsed.sections[1].body).toContain("1 min AO");
  });

  it("falls back to raw mode when section parsing is uncertain", () => {
    const parsed = parseWorkout({
      title: "Daily Workout",
      selftext: "Template varies today\n2 rounds of work\nAO where coached"
    });

    expect(parsed.parserMode).toBe("raw");
    expect(parsed.sections).toEqual([]);
    expect(parsed.rawText).toContain("AO where coached");
  });
});
