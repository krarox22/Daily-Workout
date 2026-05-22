import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createWorkoutStore } from "@/lib/db";
import { findLatestDailyWorkoutPost } from "@/lib/reddit";
import { sampleWorkout } from "@/lib/sample-workout";

type TestWorkoutStore = ReturnType<typeof createWorkoutStore> & {
  close: () => void;
};

let tempDir: string;
let dbPath: string;
let store: TestWorkoutStore | undefined;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "daily-workout-"));
  dbPath = join(tempDir, "test.db");
});

afterEach(() => {
  store?.close();
  store = undefined;
  rmSync(tempDir, { recursive: true, force: true });
});

describe("workout store", () => {
  it("returns the sample workout when no saved workout exists", () => {
    store = createTestStore();
    expect(store.getCurrentWorkout().rawText).toBe(sampleWorkout.rawText);
  });

  it("saves and reads the current workout", () => {
    store = createTestStore();
    store.saveCurrentWorkout({
      ...sampleWorkout,
      rawText: "Saved workout",
      parserMode: "raw",
      sections: [],
      lastRefreshStatus: "success",
      fetchedAt: "2026-05-22T03:30:00.000Z"
    });

    const saved = store.getCurrentWorkout();
    expect(saved.rawText).toBe("Saved workout");
    expect(saved.lastRefreshStatus).toBe("success");
  });

  it("saves workouts under the current id regardless of input id", () => {
    store = createTestStore();
    store.saveCurrentWorkout({
      ...sampleWorkout,
      id: "not-current",
      rawText: "Saved workout from alternate id",
      parserMode: "raw",
      sections: []
    });

    const saved = store.getCurrentWorkout();
    expect(saved.id).toBe("current");
    expect(saved.rawText).toBe("Saved workout from alternate id");
  });

  it("updates completion without changing workout text", () => {
    store = createTestStore();
    store.saveCurrentWorkout(sampleWorkout);
    store.setCompleted(true);

    const saved = store.getCurrentWorkout();
    expect(saved.completed).toBe(true);
    expect(saved.rawText).toBe(sampleWorkout.rawText);
  });

  it.each([
    ["parser_mode", "weird"],
    ["last_refresh_status", "pending"],
    ["completed", 2]
  ])("rejects invalid persisted %s values", (column, value) => {
    store = createTestStore();
    const db = new Database(dbPath);

    try {
      expect(() => {
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
        `).run({
          ...sampleWorkout,
          parserMode: column === "parser_mode" ? value : sampleWorkout.parserMode,
          sectionsJson: JSON.stringify(sampleWorkout.sections),
          lastRefreshStatus: column === "last_refresh_status" ? value : sampleWorkout.lastRefreshStatus,
          completed: column === "completed" ? value : 0
        });
      }).toThrow();
    } finally {
      db.close();
    }
  });

  it.each([
    ["invalid JSON", "not json"],
    ["non-section array", JSON.stringify([{ heading: "Tread Block", body: 123 }])]
  ])("falls back to the sample workout when old schema contains %s sections_json", (_label, sectionsJson) => {
    insertLaxWorkoutRow({ sectionsJson });
    store = createTestStore();

    expect(store.getCurrentWorkout()).toEqual(sampleWorkout);
  });

  it.each([
    ["parserMode", "mystery"],
    ["lastRefreshStatus", "pending"],
    ["completed", 2]
  ])("falls back to the sample workout when old schema contains invalid %s", (field, value) => {
    insertLaxWorkoutRow({ [field]: value });
    store = createTestStore();

    expect(store.getCurrentWorkout()).toEqual(sampleWorkout);
  });
});

describe("reddit post selection", () => {
  it("selects the newest title containing Daily Workout", () => {
    const post = findLatestDailyWorkoutPost(
      [
        { id: "old", title: "Daily Workout - 5/21/2026", selftext: "Old", createdUtc: 100 },
        { id: "skip", title: "Lift 50 discussion", selftext: "Skip", createdUtc: 300 },
        { id: "new", title: "Daily Workout - 5/22/2026", selftext: "New", createdUtc: 200 }
      ],
      "Daily Workout"
    );

    expect(post?.id).toBe("new");
  });
});

function createTestStore(): TestWorkoutStore {
  return createWorkoutStore(dbPath) as TestWorkoutStore;
}

function insertLaxWorkoutRow(overrides: Record<string, unknown>) {
  const db = new Database(dbPath);

  try {
    db.exec(`
      CREATE TABLE current_workout (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        display_date TEXT,
        raw_text TEXT NOT NULL,
        sections_json TEXT NOT NULL,
        parser_mode TEXT NOT NULL,
        reddit_id TEXT,
        reddit_title TEXT,
        reddit_created_at TEXT,
        fetched_at TEXT,
        last_refresh_status TEXT NOT NULL,
        completed INTEGER NOT NULL
      )
    `);

    const workout = {
      ...sampleWorkout,
      rawText: "Persisted corrupt workout",
      sectionsJson: JSON.stringify(sampleWorkout.sections),
      completed: 0,
      ...overrides
    };

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
    `).run(workout);
  } finally {
    db.close();
  }
}
