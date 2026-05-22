import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkoutStore } from "@/lib/db";
import { findLatestDailyWorkoutPost } from "@/lib/reddit";
import { sampleWorkout } from "@/lib/sample-workout";
import { createWorkoutService } from "@/lib/workouts";

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

  it("skips boilerplate posts and selects the next newest valid post", () => {
    const post = findLatestDailyWorkoutPost(
      [
        { id: "old", title: "Daily Workout - 5/21/2026", selftext: "Tread Block\n1 min AO", createdUtc: 100 },
        { id: "boilerplate", title: "Daily Workout - 5/22/2026", selftext: "Use this post to discuss the OTF workout template", createdUtc: 200 }
      ],
      "Daily Workout"
    );

    expect(post?.id).toBe("old");
  });
});

describe("workout service", () => {
  it("closes the backing store", () => {
    const close = vi.fn();
    const fakeStore = {
      getCurrentWorkout: vi.fn(),
      saveCurrentWorkout: vi.fn(),
      setRefreshStatus: vi.fn(),
      setCompleted: vi.fn(),
      close
    } satisfies TestWorkoutStore;

    const service = createWorkoutService({ store: fakeStore });

    service.close();

    expect(close).toHaveBeenCalledOnce();
  });

  it("refreshes from a matching Reddit post and resets completion", async () => {
    store = createTestStore();
    store.saveCurrentWorkout({ ...sampleWorkout, completed: true });
    const service = createWorkoutService({
      store,
      fetchPosts: async () => [
        {
          id: "abc123",
          title: "Daily Workout and General Chat for Friday 05/22/26",
          selftext: "Tread Block\n2 min push\n\nFloor Block\n10 squats",
          createdUtc: 1779400000
        }
      ],
      fetchComments: async () => []
    });

    const result = await service.refreshWorkout();

    expect(result.ok).toBe(true);
    expect(result.workout.redditId).toBe("abc123");
    expect(result.workout.completed).toBe(false);
    expect(result.workout.lastRefreshStatus).toBe("success");
    expect(result.workout.displayDate).toBe("May 22");
  });

  it("preserves completion when refreshing the same Reddit post", async () => {
    store = createTestStore();
    store.saveCurrentWorkout({ ...sampleWorkout, redditId: "abc123", completed: true });
    const service = createWorkoutService({
      store,
      fetchPosts: async () => [
        {
          id: "abc123",
          title: "Daily Workout and General Chat for Friday 05/22/26",
          selftext: "Tread Block\n2 min push\n\nFloor Block\n10 squats",
          createdUtc: 1779400000
        }
      ],
      fetchComments: async () => []
    });

    const result = await service.refreshWorkout();

    expect(result.ok).toBe(true);
    expect(result.workout.redditId).toBe("abc123");
    expect(result.workout.completed).toBe(true);
  });

  it("resets completion when refreshing a different Reddit post", async () => {
    store = createTestStore();
    store.saveCurrentWorkout({ ...sampleWorkout, redditId: "old123", completed: true });
    const service = createWorkoutService({
      store,
      fetchPosts: async () => [
        {
          id: "new123",
          title: "Daily Workout and General Chat for Friday 05/22/26",
          selftext: "Tread Block\n2 min push\n\nFloor Block\n10 squats",
          createdUtc: 1779400000
        }
      ],
      fetchComments: async () => []
    });

    const result = await service.refreshWorkout();

    expect(result.ok).toBe(true);
    expect(result.workout.redditId).toBe("new123");
    expect(result.workout.completed).toBe(false);
  });

  it("preserves saved workout when no matching post exists", async () => {
    store = createTestStore();
    store.saveCurrentWorkout({ ...sampleWorkout, rawText: "Keep me" });
    const service = createWorkoutService({
      store,
      fetchPosts: async () => [{ id: "x", title: "Lift 50", selftext: "Nope", createdUtc: 1 }],
      fetchComments: async () => []
    });

    const result = await service.refreshWorkout();

    expect(result.ok).toBe(false);
    expect(result.workout.rawText).toBe("Keep me");
    expect(result.workout.lastRefreshStatus).toBe("failed");
  });

  it("preserves saved workout when Reddit fetch fails", async () => {
    store = createTestStore();
    store.saveCurrentWorkout({ ...sampleWorkout, rawText: "Still here" });
    const service = createWorkoutService({
      store,
      fetchPosts: async () => {
        throw new Error("network down");
      },
      fetchComments: async () => []
    });

    const result = await service.refreshWorkout();

    expect(result.ok).toBe(false);
    expect(result.workout.rawText).toBe("Still here");
    expect(result.workout.lastRefreshStatus).toBe("failed");
  });

  it("uses workout comment from target author when post is boilerplate", async () => {
    store = createTestStore();
    const service = createWorkoutService({
      store,
      fetchPosts: async () => [
        {
          id: "today123",
          title: "Daily Workout and General Chat for Friday 05/22/26",
          selftext: "Use this post to discuss the OTF workout template",
          createdUtc: 1779400000
        }
      ],
      fetchComments: async (postId) => {
        if (postId === "today123") {
          return [
            {
              id: "comm1",
              author: "someuser",
              body: "I love this template",
              createdUtc: 1779400100
            },
            {
              id: "comm2",
              author: "dc031114",
              body: "Tread Block\n30 sec AO\n\nFloor Block\nGoblet squats",
              createdUtc: 1779400200
            }
          ];
        }
        return [];
      }
    });

    const result = await service.refreshWorkout();

    expect(result.ok).toBe(true);
    expect(result.workout.redditId).toBe("today123");
    expect(result.workout.rawText).toContain("Tread Block");
    expect(result.workout.rawText).toContain("Goblet squats");
    expect(result.workout.sections.length).toBe(2);
  });

  it("skips boilerplate post without target comment and scans older posts", async () => {
    store = createTestStore();
    const service = createWorkoutService({
      store,
      fetchPosts: async () => [
        {
          id: "yesterday123",
          title: "Daily Workout - 5/21/2026",
          selftext: "Old Tread Block\n1 min push",
          createdUtc: 1779300000
        },
        {
          id: "today123",
          title: "Daily Workout - 5/22/2026",
          selftext: "Use this post to discuss the OTF workout template",
          createdUtc: 1779400000
        }
      ],
      fetchComments: async (postId) => {
        if (postId === "today123") {
          return [
            {
              id: "comm1",
              author: "otheruser",
              body: "No intel yet!",
              createdUtc: 1779400100
            }
          ];
        }
        return [];
      }
    });
    const result = await service.refreshWorkout();

    expect(result.ok).toBe(true);
    expect(result.workout.redditId).toBe("yesterday123");
    expect(result.workout.rawText).toContain("Old Tread Block");
  });

  it("automatically resolves repeat template links to extract structured workout", async () => {
    store = createTestStore();
    const service = createWorkoutService({
      store,
      fetchPosts: async () => [
        {
          id: "today123",
          title: "Daily Workout and General Chat for Friday 05/22/26",
          selftext: "Use this post to discuss the OTF workout template",
          createdUtc: 1779400000
        }
      ],
      fetchComments: async (postId) => {
        if (postId === "today123") {
          return [
            {
              id: "comm1",
              author: "dc031114",
              body: "Repeating endurance template from [7th of May](https://www.reddit.com/r/orangetheory/comments/prev456/daily_workout_and_general_chat_for_thursday_5726/).",
              createdUtc: 1779400100
            }
          ];
        } else if (postId === "prev456") {
          return [
            {
              id: "commPrev",
              author: "dc031114",
              body: "Tread Block 1\n30 sec AO\n\nFloor Block 1\nGoblet squats",
              createdUtc: 1779300100
            }
          ];
        }
        return [];
      }
    });

    const result = await service.refreshWorkout();

    expect(result.ok).toBe(true);
    expect(result.workout.redditId).toBe("today123");
    expect(result.workout.rawText).toContain("Tread Block 1");
    expect(result.workout.rawText).toContain("Goblet squats");
    expect(result.workout.parserMode).toBe("structured");
    expect(result.workout.sections.length).toBe(2);
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
