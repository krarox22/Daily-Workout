import type { ParsedWorkout, WorkoutSection } from "./types";

type ParseInput = {
  title: string;
  selftext: string;
};

const SECTION_HEADING_RE =
  /^(?:(?:tread|row|floor|lift|finisher)(?:\s+(?:block(?:\s+\d+)?|\d+))?|notes|coach notes)$/i;

export function isDailyWorkoutTitle(title: string, keyword: string): boolean {
  return title.toLowerCase().includes(keyword.toLowerCase());
}

export function extractDisplayDate(title: string): string | null {
  const match = title.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\b/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = match[3] ? normalizeYear(match[3]) : 2026;
  if (year === null || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function normalizeYear(yearText: string): number | null {
  if (yearText.length === 2) return 2000 + Number(yearText);
  if (yearText.length === 4) return Number(yearText);
  return null;
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
