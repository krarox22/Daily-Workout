import type { ParsedWorkout, WorkoutSection } from "./types";

type ParseInput = {
  title: string;
  selftext: string;
};

const SECTION_HEADING_RE =
  /^(tread|row|floor|lift|finisher|notes?|coach notes?|block|tread block|row block|floor block|lift block)(\b.*)?$/i;

export function isDailyWorkoutTitle(title: string, keyword: string): boolean {
  return title.toLowerCase().includes(keyword.toLowerCase());
}

export function extractDisplayDate(title: string): string | null {
  const match = title.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(2026, month - 1, day));
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

export function cleanRedditText(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseWorkout(input: ParseInput): ParsedWorkout {
  const rawText = cleanRedditText(input.selftext);
  const sections = parseSections(rawText);

  return {
    title: "Today's Workout",
    displayDate: extractDisplayDate(input.title),
    rawText,
    sections,
    parserMode: sections.length >= 2 ? "structured" : "raw"
  };
}

function parseSections(rawText: string): WorkoutSection[] {
  const lines = rawText.split("\n");
  const sections: WorkoutSection[] = [];
  let current: WorkoutSection | null = null;

  for (const line of lines) {
    if (!line) continue;

    if (isSectionHeading(line)) {
      if (current && current.body.trim()) {
        sections.push({ heading: current.heading, body: current.body.trim() });
      }
      current = { heading: line, body: "" };
      continue;
    }

    if (current) {
      current.body += `${line}\n`;
    }
  }

  if (current && current.body.trim()) {
    sections.push({ heading: current.heading, body: current.body.trim() });
  }

  return sections.length >= 2 ? sections : [];
}

function isSectionHeading(line: string): boolean {
  if (line.length > 48) return false;
  return SECTION_HEADING_RE.test(line);
}
