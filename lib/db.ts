import Database from "better-sqlite3";
import { appConfig } from "./config";
import { isBoilerplate } from "./parser";
import { sampleWorkout } from "./sample-workout";
import type { Workout, WorkoutSection } from "./types";

type WorkoutRow = {
  id: string;
  title: string;
  display_date: string | null;
  raw_text: string;
  sections_json: string;
  parser_mode: string;
  reddit_id: string | null;
  reddit_title: string | null;
  reddit_created_at: string | null;
  fetched_at: string | null;
  last_refresh_status: string;
  completed: number;
};

export type WorkoutStore = ReturnType<typeof createWorkoutStore>;

export function createWorkoutStore(dbPath = appConfig.sqlitePath) {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS current_workout (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      display_date TEXT,
      raw_text TEXT NOT NULL,
      sections_json TEXT NOT NULL,
      parser_mode TEXT NOT NULL CHECK (parser_mode IN ('structured', 'raw')),
      reddit_id TEXT,
      reddit_title TEXT,
      reddit_created_at TEXT,
      fetched_at TEXT,
      last_refresh_status TEXT NOT NULL CHECK (last_refresh_status IN ('idle', 'success', 'failed')),
      completed INTEGER NOT NULL CHECK (completed IN (0, 1))
    )
  `);

  return {
    getCurrentWorkout(): Workout {
      const row = db.prepare("SELECT * FROM current_workout WHERE id = ?").get("current") as WorkoutRow | undefined;
      if (row) {
        const workout = rowToWorkout(row);
        if (isBoilerplate(workout.rawText)) {
          return sampleWorkout;
        }
        return workout;
      }
      return sampleWorkout;
    },

    saveCurrentWorkout(workout: Workout): Workout {
      db.prepare(`
        INSERT INTO current_workout (
          id, title, display_date, raw_text, sections_json, parser_mode,
          reddit_id, reddit_title, reddit_created_at, fetched_at,
          last_refresh_status, completed
        )
        VALUES (
          @id, @title, @displayDate, @rawText, @sectionsJson, @parserMode,
          @redditId, @redditTitle, @redditCreatedAt, @fetchedAt,
          @lastRefreshStatus, @completed
        )
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          display_date = excluded.display_date,
          raw_text = excluded.raw_text,
          sections_json = excluded.sections_json,
          parser_mode = excluded.parser_mode,
          reddit_id = excluded.reddit_id,
          reddit_title = excluded.reddit_title,
          reddit_created_at = excluded.reddit_created_at,
          fetched_at = excluded.fetched_at,
          last_refresh_status = excluded.last_refresh_status,
          completed = excluded.completed
      `).run({
        ...workout,
        id: "current",
        sectionsJson: JSON.stringify(workout.sections),
        completed: workout.completed ? 1 : 0
      });

      return this.getCurrentWorkout();
    },

    setRefreshStatus(status: Workout["lastRefreshStatus"]): Workout {
      const current = this.getCurrentWorkout();
      return this.saveCurrentWorkout({ ...current, lastRefreshStatus: status });
    },

    setCompleted(completed: boolean): Workout {
      const current = this.getCurrentWorkout();
      return this.saveCurrentWorkout({ ...current, completed });
    },

    close(): void {
      db.close();
    }
  };
}

function rowToWorkout(row: WorkoutRow): Workout {
  const sections = parseWorkoutSections(row.sections_json);

  if (
    sections === undefined ||
    !isParserMode(row.parser_mode) ||
    !isRefreshStatus(row.last_refresh_status) ||
    !isCompletedValue(row.completed)
  ) {
    return sampleWorkout;
  }

  return {
    id: row.id,
    title: row.title,
    displayDate: row.display_date,
    rawText: row.raw_text,
    sections,
    parserMode: row.parser_mode,
    redditId: row.reddit_id,
    redditTitle: row.reddit_title,
    redditCreatedAt: row.reddit_created_at,
    fetchedAt: row.fetched_at,
    lastRefreshStatus: row.last_refresh_status,
    completed: row.completed === 1
  };
}

function parseWorkoutSections(sectionsJson: string): WorkoutSection[] | undefined {
  try {
    const sections = JSON.parse(sectionsJson) as unknown;
    return isWorkoutSectionArray(sections) ? sections : undefined;
  } catch {
    return undefined;
  }
}

function isWorkoutSectionArray(value: unknown): value is WorkoutSection[] {
  return Array.isArray(value) && value.every((section) => (
    typeof section === "object" &&
    section !== null &&
    typeof (section as WorkoutSection).heading === "string" &&
    typeof (section as WorkoutSection).body === "string"
  ));
}

function isParserMode(value: string): value is Workout["parserMode"] {
  return value === "structured" || value === "raw";
}

function isRefreshStatus(value: string): value is Workout["lastRefreshStatus"] {
  return value === "idle" || value === "success" || value === "failed";
}

function isCompletedValue(value: number): value is 0 | 1 {
  return value === 0 || value === 1;
}
