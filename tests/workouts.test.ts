import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createWorkoutStore } from "@/lib/db";
import { sampleWorkout } from "@/lib/sample-workout";

let tempDir: string;
let dbPath: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "daily-workout-"));
  dbPath = join(tempDir, "test.db");
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("workout store", () => {
  it("returns the sample workout when no saved workout exists", () => {
    const store = createWorkoutStore(dbPath);
    expect(store.getCurrentWorkout().rawText).toBe(sampleWorkout.rawText);
  });

  it("saves and reads the current workout", () => {
    const store = createWorkoutStore(dbPath);
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

  it("updates completion without changing workout text", () => {
    const store = createWorkoutStore(dbPath);
    store.saveCurrentWorkout(sampleWorkout);
    store.setCompleted(true);

    const saved = store.getCurrentWorkout();
    expect(saved.completed).toBe(true);
    expect(saved.rawText).toBe(sampleWorkout.rawText);
  });
});
