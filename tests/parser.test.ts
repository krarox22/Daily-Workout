import { describe, expect, it } from "vitest";
import {
  cleanRedditText,
  extractDisplayDate,
  isDailyWorkoutTitle,
  parseWorkout,
  isBoilerplate
} from "@/lib/parser";

describe("parser", () => {
  it("matches Daily Workout titles case-insensitively", () => {
    expect(isDailyWorkoutTitle("Daily Workout and General Chat for Friday 05/22/26", "Daily Workout")).toBe(true);
    expect(isDailyWorkoutTitle("daily workout intel", "Daily Workout")).toBe(true);
    expect(isDailyWorkoutTitle("Lift 50 discussion", "Daily Workout")).toBe(false);
  });

  it("identifies boilerplate posts correctly", () => {
    const boilerplate = `
Workout
Use this post to discuss the OTF workout template or other general topics. Don't forget to upvote comments containing the workout details to help us keep key info at the top!

[Monthly Calendar](https://sites.google.com/view/otf-workout-calendar)

[Most Recent Tornado Templates](https://www.reddit.com/r/orangetheory/new/?f=flair_name%3A%22Tornado%20Templates%22&restrict_sr=1&sort=new)

[Hyrox Templates Megathread](https://www.reddit.com/r/orangetheory/comments/1q9h51j/hyrox_templates_megathread/)

Friendly reminder that asking for intel is not permitted.  In case you missed it, please see the [recent announcement](https://www.reddit.com/r/orangetheory/comments/1tagyp8/small_change_regarding_the_way_intel_is_posted/) regarding the retirement of SplatBot and how early intel/daily workout threads will work moving forward.  The next day's daily thread will be automatically posted earlier (around 3pm Eastern) so that if there is early intel, it can be shared here.  Later at night, the post flair will be changed to the Daily Workout flair and the post will be pinned to the highlights.  The early existence of this thread does not imply that there is early intel - as always, if someone has intel to provide, they will generally provide it.  Please review rule #2 for more details.

To find old Daily Workout posts, you can filter by the Daily Workout post flair.  For posts prior to 5/12/26, you can still look for [recent submissions by u/splat\\_bot](https://www.reddit.com/user/splat_bot/submitted/).

\\[This post has been automatically generated\\]
    `;
    expect(isBoilerplate(boilerplate)).toBe(true);
    expect(isBoilerplate("Tread Block\n2 min push\n\nFloor Block\n10 squats")).toBe(false);
  });

  it("extracts display dates from common title formats", () => {
    expect(extractDisplayDate("Daily Workout and General Chat for Friday 05/22/26")).toBe("May 22");
    expect(extractDisplayDate("Daily Workout - 5/7/2026")).toBe("May 7");
    expect(extractDisplayDate("Daily Workout")).toBeNull();
  });

  it("rejects invalid display dates instead of rolling them over", () => {
    expect(extractDisplayDate("Daily Workout - 2/31/2026")).toBeNull();
    expect(extractDisplayDate("Daily Workout - 2/29/2026")).toBeNull();
    expect(extractDisplayDate("Daily Workout - 13/1/2026")).toBeNull();
    expect(extractDisplayDate("Daily Workout - 0/1/2026")).toBeNull();
  });

  it("cleans reddit markdown without expanding Orangetheory shorthand", () => {
    const cleaned = cleanRedditText("**Tread**\n\n* 1 min AO\n* 30 sec WR\n\n&nbsp;\n\n>! spoiler text !<\nline with backslash \\");
    expect(cleaned).toBe("Tread\n1 min AO\n30 sec WR\n\nspoiler text\nline with backslash");
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

  it("keeps label-like body lines inside structured section bodies", () => {
    const parsed = parseWorkout({
      title: "Daily Workout - 5/22/2026",
      selftext: [
        "Tread Block",
        "row 200m",
        "tread 30 sec AO",
        "",
        "Floor Block",
        "floor exercises"
      ].join("\n")
    });

    expect(parsed.parserMode).toBe("structured");
    expect(parsed.sections.map((section) => section.heading)).toEqual(["Tread Block", "Floor Block"]);
    expect(parsed.sections[0].body).toBe(["row 200m", "tread 30 sec AO"].join("\n"));
    expect(parsed.sections[1].body).toBe("floor exercises");
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

  it("parses structured sections successfully even when content appears before the first section heading", () => {
    const parsed = parseWorkout({
      title: "Daily Workout - 5/22/2026",
      selftext: [
        "Coach note: templates are approximate today",
        "",
        "Tread Block",
        "2 min push",
        "",
        "Floor Block",
        "10 squats"
      ].join("\n")
    });

    expect(parsed.parserMode).toBe("structured");
    expect(parsed.sections.map((s) => s.heading)).toEqual(["Tread Block", "Floor Block"]);
    expect(parsed.sections[0].body).toBe("2 min push");
    expect(parsed.sections[1].body).toBe("10 squats");
    expect(parsed.rawText).toContain("Coach note: templates are approximate today");
  });
});
