# Orangetheory Daily Workout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first mobile web app that shows the current Orangetheory Daily Workout from r/orangetheory, with manual Reddit refresh, SQLite persistence, deterministic parsing, and a completed celebration state.

**Architecture:** Use Next.js App Router for the frontend and API routes. Keep business logic in focused `lib/*` modules so the manual refresh API can be reused by a future 9am IST scheduler. Store a single current workout in SQLite and use deterministic parsing with raw-text fallback.

**Tech Stack:** Next.js, React, TypeScript, SQLite via `better-sqlite3`, Vitest for parser and service tests.

---

## File Structure

Create these files:

- `package.json`: npm scripts and dependencies.
- `tsconfig.json`: TypeScript config for Next.js.
- `next.config.ts`: Next.js config.
- `next-env.d.ts`: Next.js type references.
- `vitest.config.ts`: Vitest config using Node environment.
- `.gitignore`: ignores `node_modules`, `.next`, local SQLite files, and env files.
- `app/layout.tsx`: root HTML shell and metadata.
- `app/page.tsx`: server page that reads current workout.
- `app/globals.css`: mobile-first visual system and component styling.
- `app/api/refresh/route.ts`: manual refresh route.
- `app/api/workout/route.ts`: current workout read route.
- `app/api/workout/complete/route.ts`: completion toggle route.
- `components/workout-app.tsx`: client-side refresh/completion UI.
- `components/workout-content.tsx`: render structured sections or raw cleaned text.
- `lib/config.ts`: developer config with env fallbacks.
- `lib/types.ts`: shared domain types.
- `lib/sample-workout.ts`: seeded sample workout.
- `lib/parser.ts`: title matching, date extraction, cleanup, and section parsing.
- `lib/reddit.ts`: public Reddit JSON fetch adapter.
- `lib/db.ts`: SQLite schema and persistence functions.
- `lib/workouts.ts`: application service coordinating db, reddit, and parser.
- `tests/parser.test.ts`: parser coverage.
- `tests/workouts.test.ts`: service/API-like refresh coverage with mocked Reddit fetcher and isolated SQLite file.

No existing app files need modification because the repository currently contains only docs.

---

### Task 1: Scaffold The Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `next-env.d.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

- [ ] **Step 1: Add package metadata and scripts**

Create `package.json` with these scripts and dependencies:

```json
{
  "name": "daily-workout",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "better-sqlite3": "^11.8.1",
    "next": "^15.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/node": "^22.10.10",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "typescript": "^5.7.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Add TypeScript and Next config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

Create `next-env.d.ts`:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// This file is maintained by Next.js.
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname
    }
  }
});
```

- [ ] **Step 3: Add ignore rules**

Create `.gitignore`:

```gitignore
node_modules
.next
out
coverage
.env
.env.local
*.db
*.db-shm
*.db-wal
```

- [ ] **Step 4: Add minimal app shell**

Create `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Workout",
  description: "A clean daily Orangetheory workout viewer"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `app/page.tsx`:

```tsx
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Orangetheory</p>
        <h1>Today's Workout</h1>
        <p className="hero-copy">Your cleaned daily workout will appear here.</p>
      </section>
    </main>
  );
}
```

Create `app/globals.css`:

```css
:root {
  color: #17120b;
  background: #fff8ea;
  font-family: Arial, Helvetica, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #fff8ea;
}

button {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  max-width: 760px;
  margin: 0 auto;
  background: #fffdf7;
}

.hero {
  padding: 32px 22px 28px;
  color: #211500;
  background: linear-gradient(135deg, #ffb21a 0%, #ff8a00 100%);
  border-bottom-left-radius: 28px;
  border-bottom-right-radius: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 2.4rem;
  line-height: 0.95;
}

.hero-copy {
  margin: 14px 0 0;
  max-width: 28rem;
  font-weight: 700;
}
```

- [ ] **Step 5: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 6: Verify scaffold**

Run:

```bash
npm run build
```

Expected: Next.js production build completes successfully.

- [ ] **Step 7: Commit scaffold**

Run:

```bash
git add package.json package-lock.json tsconfig.json next.config.ts next-env.d.ts vitest.config.ts .gitignore app
git commit -m "chore: scaffold Next.js app"
```

---

### Task 2: Add Domain Types, Config, And Seed Workout

**Files:**
- Create: `lib/types.ts`
- Create: `lib/config.ts`
- Create: `lib/sample-workout.ts`

- [ ] **Step 1: Add shared domain types**

Create `lib/types.ts`:

```ts
export type RefreshStatus = "idle" | "success" | "failed";

export type WorkoutSection = {
  heading: string;
  body: string;
};

export type ParsedWorkout = {
  title: string;
  displayDate: string | null;
  rawText: string;
  sections: WorkoutSection[];
  parserMode: "structured" | "raw";
};

export type Workout = ParsedWorkout & {
  id: string;
  redditId: string | null;
  redditTitle: string | null;
  redditCreatedAt: string | null;
  fetchedAt: string | null;
  lastRefreshStatus: RefreshStatus;
  completed: boolean;
};

export type RedditPost = {
  id: string;
  title: string;
  selftext: string;
  createdUtc: number;
};
```

- [ ] **Step 2: Add developer config**

Create `lib/config.ts`:

```ts
export const appConfig = {
  subreddit: process.env.REDDIT_SUBREDDIT ?? "orangetheory",
  titleKeyword: process.env.REDDIT_TITLE_KEYWORD ?? "Daily Workout",
  maxPostsToScan: Number(process.env.REDDIT_MAX_POSTS_TO_SCAN ?? "25"),
  requestTimeoutMs: Number(process.env.REDDIT_REQUEST_TIMEOUT_MS ?? "8000"),
  sqlitePath: process.env.SQLITE_PATH ?? "daily-workout.db"
};
```

- [ ] **Step 3: Add seeded sample workout**

Create `lib/sample-workout.ts`:

```ts
import type { Workout } from "./types";

export const sampleWorkout: Workout = {
  id: "current",
  title: "Today's Workout",
  displayDate: null,
  rawText: [
    "Tread Block",
    "2 min base",
    "1 min push",
    "30 sec AO",
    "",
    "Floor Block",
    "Goblet squats",
    "Low rows",
    "Plank shoulder taps",
    "",
    "Finisher",
    "30 sec AO effort"
  ].join("\n"),
  sections: [
    {
      heading: "Tread Block",
      body: ["2 min base", "1 min push", "30 sec AO"].join("\n")
    },
    {
      heading: "Floor Block",
      body: ["Goblet squats", "Low rows", "Plank shoulder taps"].join("\n")
    },
    {
      heading: "Finisher",
      body: "30 sec AO effort"
    }
  ],
  parserMode: "structured",
  redditId: null,
  redditTitle: null,
  redditCreatedAt: null,
  fetchedAt: null,
  lastRefreshStatus: "idle",
  completed: false
};
```

- [ ] **Step 4: Type-check**

Run:

```bash
npm run build
```

Expected: Build succeeds with the new modules.

- [ ] **Step 5: Commit domain foundation**

Run:

```bash
git add lib package.json package-lock.json
git commit -m "feat: add workout domain foundation"
```

---

### Task 3: Build The Deterministic Parser With Tests

**Files:**
- Create: `tests/parser.test.ts`
- Create: `lib/parser.ts`

- [ ] **Step 1: Write parser tests**

Create `tests/parser.test.ts`:

```ts
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
    const cleaned = cleanRedditText("**Tread**\\n\\n* 1 min AO\\n* 30 sec WR\\n\\n&nbsp;");
    expect(cleaned).toBe("Tread\\n1 min AO\\n30 sec WR");
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
      ].join("\\n")
    });

    expect(parsed.parserMode).toBe("structured");
    expect(parsed.displayDate).toBe("May 22");
    expect(parsed.sections.map((section) => section.heading)).toEqual(["Floor Block", "Tread Block"]);
    expect(parsed.sections[1].body).toContain("1 min AO");
  });

  it("falls back to raw mode when section parsing is uncertain", () => {
    const parsed = parseWorkout({
      title: "Daily Workout",
      selftext: "Template varies today\\n2 rounds of work\\nAO where coached"
    });

    expect(parsed.parserMode).toBe("raw");
    expect(parsed.sections).toEqual([]);
    expect(parsed.rawText).toContain("AO where coached");
  });
});
```

- [ ] **Step 2: Run parser tests to verify failure**

Run:

```bash
npm test -- tests/parser.test.ts
```

Expected: FAIL because `lib/parser.ts` does not exist.

- [ ] **Step 3: Implement parser**

Create `lib/parser.ts`:

```ts
import type { ParsedWorkout, WorkoutSection } from "./types";

type ParseInput = {
  title: string;
  selftext: string;
};

const SECTION_HEADING_RE = /^(tread|row|floor|lift|finisher|notes?|coach notes?|block|tread block|row block|floor block|lift block)(\\b.*)?$/i;

export function isDailyWorkoutTitle(title: string, keyword: string): boolean {
  return title.toLowerCase().includes(keyword.toLowerCase());
}

export function extractDisplayDate(title: string): string | null {
  const match = title.match(/\\b(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?\\b/);
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
    .replace(/\\r\\n/g, "\\n")
    .replace(/\\*\\*(.*?)\\*\\*/g, "$1")
    .replace(/^\\s*[-*+]\\s+/gm, "")
    .replace(/^\\s*>\\s?/gm, "")
    .split("\\n")
    .map((line) => line.trim())
    .join("\\n")
    .replace(/\\n{3,}/g, "\\n\\n")
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
  const lines = rawText.split("\\n");
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
      current.body += `${line}\\n`;
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
```

- [ ] **Step 4: Run parser tests**

Run:

```bash
npm test -- tests/parser.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit parser**

Run:

```bash
git add lib/parser.ts tests/parser.test.ts
git commit -m "feat: add deterministic workout parser"
```

---

### Task 4: Add SQLite Persistence

**Files:**
- Create: `lib/db.ts`
- Create: `tests/workouts.test.ts`

- [ ] **Step 1: Write database behavior tests**

Create the first version of `tests/workouts.test.ts`:

```ts
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
```

- [ ] **Step 2: Run database tests to verify failure**

Run:

```bash
npm test -- tests/workouts.test.ts
```

Expected: FAIL because `lib/db.ts` does not exist.

- [ ] **Step 3: Implement SQLite store**

Create `lib/db.ts`:

```ts
import Database from "better-sqlite3";
import { appConfig } from "./config";
import { sampleWorkout } from "./sample-workout";
import type { Workout } from "./types";

type WorkoutRow = {
  id: string;
  title: string;
  display_date: string | null;
  raw_text: string;
  sections_json: string;
  parser_mode: "structured" | "raw";
  reddit_id: string | null;
  reddit_title: string | null;
  reddit_created_at: string | null;
  fetched_at: string | null;
  last_refresh_status: "idle" | "success" | "failed";
  completed: 0 | 1;
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
      parser_mode TEXT NOT NULL,
      reddit_id TEXT,
      reddit_title TEXT,
      reddit_created_at TEXT,
      fetched_at TEXT,
      last_refresh_status TEXT NOT NULL,
      completed INTEGER NOT NULL
    )
  `);

  return {
    getCurrentWorkout(): Workout {
      const row = db.prepare("SELECT * FROM current_workout WHERE id = ?").get("current") as WorkoutRow | undefined;
      return row ? rowToWorkout(row) : sampleWorkout;
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
    }
  };
}

function rowToWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    title: row.title,
    displayDate: row.display_date,
    rawText: row.raw_text,
    sections: JSON.parse(row.sections_json),
    parserMode: row.parser_mode,
    redditId: row.reddit_id,
    redditTitle: row.reddit_title,
    redditCreatedAt: row.reddit_created_at,
    fetchedAt: row.fetched_at,
    lastRefreshStatus: row.last_refresh_status,
    completed: row.completed === 1
  };
}
```

- [ ] **Step 4: Run database tests**

Run:

```bash
npm test -- tests/workouts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit SQLite store**

Run:

```bash
git add lib/db.ts tests/workouts.test.ts
git commit -m "feat: add SQLite workout store"
```

---

### Task 5: Add Reddit Fetch Adapter

**Files:**
- Create: `lib/reddit.ts`
- Modify: `tests/workouts.test.ts`

- [ ] **Step 1: Extend tests for post selection**

Append this import and test to `tests/workouts.test.ts`:

```ts
import { findLatestDailyWorkoutPost } from "@/lib/reddit";
```

```ts
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/workouts.test.ts
```

Expected: FAIL because `lib/reddit.ts` does not exist.

- [ ] **Step 3: Implement Reddit adapter**

Create `lib/reddit.ts`:

```ts
import { appConfig } from "./config";
import { isDailyWorkoutTitle } from "./parser";
import type { RedditPost } from "./types";

type RedditListing = {
  data: {
    children: Array<{
      data: {
        id: string;
        title: string;
        selftext?: string;
        created_utc: number;
      };
    }>;
  };
};

export async function fetchRecentPosts(): Promise<RedditPost[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), appConfig.requestTimeoutMs);

  try {
    const url = `https://www.reddit.com/r/${appConfig.subreddit}/new.json?limit=${appConfig.maxPostsToScan}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "daily-workout-local-app/0.1"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Reddit request failed with ${response.status}`);
    }

    const listing = (await response.json()) as RedditListing;
    return listing.data.children.map((child) => ({
      id: child.data.id,
      title: child.data.title,
      selftext: child.data.selftext ?? "",
      createdUtc: child.data.created_utc
    }));
  } finally {
    clearTimeout(timeout);
  }
}

export function findLatestDailyWorkoutPost(posts: RedditPost[], keyword: string): RedditPost | null {
  return [...posts]
    .filter((post) => isDailyWorkoutTitle(post.title, keyword))
    .sort((a, b) => b.createdUtc - a.createdUtc)[0] ?? null;
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/workouts.test.ts tests/parser.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Reddit adapter**

Run:

```bash
git add lib/reddit.ts tests/workouts.test.ts
git commit -m "feat: add Reddit post adapter"
```

---

### Task 6: Add Workout Refresh Service And API Routes

**Files:**
- Create: `lib/workouts.ts`
- Create: `app/api/refresh/route.ts`
- Create: `app/api/workout/route.ts`
- Create: `app/api/workout/complete/route.ts`
- Modify: `tests/workouts.test.ts`

- [ ] **Step 1: Add refresh service tests**

Append this import to `tests/workouts.test.ts`:

```ts
import { createWorkoutService } from "@/lib/workouts";
```

Append these tests:

```ts
describe("workout service", () => {
  it("refreshes from a matching Reddit post and resets completion", async () => {
    const store = createWorkoutStore(dbPath);
    store.saveCurrentWorkout({ ...sampleWorkout, completed: true });
    const service = createWorkoutService({
      store,
      fetchPosts: async () => [
        {
          id: "abc123",
          title: "Daily Workout and General Chat for Friday 05/22/26",
          selftext: "Tread Block\\n2 min push\\n\\nFloor Block\\n10 squats",
          createdUtc: 1779400000
        }
      ]
    });

    const result = await service.refreshWorkout();

    expect(result.workout.redditId).toBe("abc123");
    expect(result.workout.completed).toBe(false);
    expect(result.workout.lastRefreshStatus).toBe("success");
    expect(result.workout.displayDate).toBe("May 22");
  });

  it("preserves saved workout when no matching post exists", async () => {
    const store = createWorkoutStore(dbPath);
    store.saveCurrentWorkout({ ...sampleWorkout, rawText: "Keep me" });
    const service = createWorkoutService({
      store,
      fetchPosts: async () => [{ id: "x", title: "Lift 50", selftext: "Nope", createdUtc: 1 }]
    });

    const result = await service.refreshWorkout();

    expect(result.ok).toBe(false);
    expect(result.workout.rawText).toBe("Keep me");
    expect(result.workout.lastRefreshStatus).toBe("failed");
  });

  it("preserves saved workout when Reddit fetch fails", async () => {
    const store = createWorkoutStore(dbPath);
    store.saveCurrentWorkout({ ...sampleWorkout, rawText: "Still here" });
    const service = createWorkoutService({
      store,
      fetchPosts: async () => {
        throw new Error("network down");
      }
    });

    const result = await service.refreshWorkout();

    expect(result.ok).toBe(false);
    expect(result.workout.rawText).toBe("Still here");
    expect(result.workout.lastRefreshStatus).toBe("failed");
  });
});
```

- [ ] **Step 2: Run service tests to verify failure**

Run:

```bash
npm test -- tests/workouts.test.ts
```

Expected: FAIL because `lib/workouts.ts` does not exist.

- [ ] **Step 3: Implement workout service**

Create `lib/workouts.ts`:

```ts
import { appConfig } from "./config";
import { createWorkoutStore, type WorkoutStore } from "./db";
import { parseWorkout } from "./parser";
import { fetchRecentPosts, findLatestDailyWorkoutPost } from "./reddit";
import type { RedditPost, Workout } from "./types";

type ServiceDeps = {
  store?: WorkoutStore;
  fetchPosts?: () => Promise<RedditPost[]>;
};

export type RefreshResult = {
  ok: boolean;
  workout: Workout;
  message: string;
};

export function createWorkoutService(deps: ServiceDeps = {}) {
  const store = deps.store ?? createWorkoutStore();
  const fetchPosts = deps.fetchPosts ?? fetchRecentPosts;

  return {
    getCurrentWorkout(): Workout {
      return store.getCurrentWorkout();
    },

    setCompleted(completed: boolean): Workout {
      return store.setCompleted(completed);
    },

    async refreshWorkout(): Promise<RefreshResult> {
      try {
        const posts = await fetchPosts();
        const post = findLatestDailyWorkoutPost(posts, appConfig.titleKeyword);

        if (!post) {
          const workout = store.setRefreshStatus("failed");
          return { ok: false, workout, message: "No Daily Workout post found" };
        }

        const parsed = parseWorkout({ title: post.title, selftext: post.selftext });
        const workout = store.saveCurrentWorkout({
          id: "current",
          ...parsed,
          redditId: post.id,
          redditTitle: post.title,
          redditCreatedAt: new Date(post.createdUtc * 1000).toISOString(),
          fetchedAt: new Date().toISOString(),
          lastRefreshStatus: "success",
          completed: false
        });

        return { ok: true, workout, message: "Workout refreshed" };
      } catch (error) {
        const workout = store.setRefreshStatus("failed");
        return {
          ok: false,
          workout,
          message: error instanceof Error ? error.message : "Refresh failed"
        };
      }
    }
  };
}
```

- [ ] **Step 4: Add API routes**

Create `app/api/refresh/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createWorkoutService } from "@/lib/workouts";

export async function POST() {
  const service = createWorkoutService();
  const result = await service.refreshWorkout();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
```

Create `app/api/workout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createWorkoutService } from "@/lib/workouts";

export async function GET() {
  const service = createWorkoutService();
  return NextResponse.json({ workout: service.getCurrentWorkout() });
}
```

Create `app/api/workout/complete/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createWorkoutService } from "@/lib/workouts";

export async function POST(request: Request) {
  const body = (await request.json()) as { completed?: boolean };
  const service = createWorkoutService();
  const workout = service.setCompleted(Boolean(body.completed));
  return NextResponse.json({ workout });
}
```

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm test
npm run build
```

Expected: Tests and build pass.

- [ ] **Step 6: Commit service and API routes**

Run:

```bash
git add lib/workouts.ts app/api tests/workouts.test.ts
git commit -m "feat: add workout refresh API"
```

---

### Task 7: Build The Mobile-First UI

**Files:**
- Create: `components/workout-app.tsx`
- Create: `components/workout-content.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add workout content renderer**

Create `components/workout-content.tsx`:

```tsx
import type { Workout } from "@/lib/types";

type Props = {
  workout: Workout;
};

export function WorkoutContent({ workout }: Props) {
  if (workout.parserMode === "structured" && workout.sections.length > 0) {
    return (
      <div className="section-list">
        {workout.sections.map((section) => (
          <section className="workout-card" key={section.heading}>
            <h2>{section.heading}</h2>
            <pre>{section.body}</pre>
          </section>
        ))}
      </div>
    );
  }

  return (
    <section className="workout-card">
      <h2>Workout</h2>
      <pre>{workout.rawText}</pre>
    </section>
  );
}
```

- [ ] **Step 2: Add client app component**

Create `components/workout-app.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import type { Workout } from "@/lib/types";
import { WorkoutContent } from "./workout-content";

type Props = {
  initialWorkout: Workout;
};

export function WorkoutApp({ initialWorkout }: Props) {
  const [workout, setWorkout] = useState(initialWorkout);
  const [statusText, setStatusText] = useState(statusFromWorkout(initialWorkout));
  const [isPending, startTransition] = useTransition();

  const title = workout.displayDate ? `Today's Workout · ${workout.displayDate}` : "Today's Workout";

  function refreshWorkout() {
    startTransition(async () => {
      const response = await fetch("/api/refresh", { method: "POST" });
      const result = (await response.json()) as { ok: boolean; workout: Workout; message: string };
      setWorkout(result.workout);
      setStatusText(result.ok ? "Updated just now" : "Last refresh failed");
    });
  }

  function setCompleted(completed: boolean) {
    startTransition(async () => {
      const response = await fetch("/api/workout/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed })
      });
      const result = (await response.json()) as { workout: Workout };
      setWorkout(result.workout);
      setStatusText(statusFromWorkout(result.workout));
    });
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Orangetheory</p>
        <h1>{title}</h1>
        <p className="hero-copy">Clean daily workout. No noise, no AI rewrite.</p>
        <div className="hero-actions">
          <button className="primary-button" disabled={isPending} onClick={refreshWorkout}>
            {isPending ? "Refreshing..." : "Refresh"}
          </button>
          <span className="status-text">{statusText}</span>
        </div>
      </section>

      <section className="content-wrap">
        {workout.completed ? (
          <section className="complete-card">
            <p className="complete-kicker">Completed</p>
            <h2>Great job!</h2>
            <p>You showed up and finished today's work.</p>
            <button className="secondary-button" disabled={isPending} onClick={() => setCompleted(false)}>
              View workout again
            </button>
          </section>
        ) : (
          <>
            <WorkoutContent workout={workout} />
            <button className="done-button" disabled={isPending} onClick={() => setCompleted(true)}>
              Mark as done
            </button>
          </>
        )}
      </section>
    </main>
  );
}

function statusFromWorkout(workout: Workout): string {
  if (workout.lastRefreshStatus === "failed") return "Last refresh failed";
  if (workout.fetchedAt) return "Saved workout loaded";
  return "Sample workout loaded";
}
```

- [ ] **Step 3: Connect server page to SQLite**

Replace `app/page.tsx` with:

```tsx
import { WorkoutApp } from "@/components/workout-app";
import { createWorkoutService } from "@/lib/workouts";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const service = createWorkoutService();
  const workout = service.getCurrentWorkout();
  return <WorkoutApp initialWorkout={workout} />;
}
```

- [ ] **Step 4: Replace styling with full mobile UI**

Replace `app/globals.css` with:

```css
:root {
  color: #17120b;
  background: #fff8ea;
  font-family: Arial, Helvetica, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(255, 178, 26, 0.22), transparent 32rem),
    #fff8ea;
}

button {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  max-width: 760px;
  margin: 0 auto;
  background: #fffdf7;
  box-shadow: 0 22px 80px rgba(61, 31, 0, 0.08);
}

.hero {
  padding: 34px 22px 28px;
  color: #211500;
  background: linear-gradient(135deg, #ffbf2f 0%, #ff8a00 100%);
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  max-width: 13ch;
  font-size: 2.7rem;
  line-height: 0.93;
}

.hero-copy {
  margin: 14px 0 0;
  max-width: 26rem;
  font-weight: 800;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 22px;
}

.primary-button,
.secondary-button,
.done-button {
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 900;
}

.primary-button {
  padding: 12px 18px;
  color: #fff;
  background: #15100a;
}

.secondary-button {
  padding: 12px 18px;
  color: #15100a;
  background: #fff;
}

.done-button {
  width: 100%;
  margin-top: 18px;
  padding: 16px 18px;
  color: #fff;
  background: #ff6b00;
}

button:disabled {
  cursor: wait;
  opacity: 0.68;
}

.status-text {
  font-size: 0.88rem;
  font-weight: 800;
}

.content-wrap {
  padding: 22px;
}

.section-list {
  display: grid;
  gap: 14px;
}

.workout-card,
.complete-card {
  border: 1px solid rgba(33, 21, 0, 0.08);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 14px 38px rgba(61, 31, 0, 0.08);
}

.workout-card {
  padding: 18px;
}

.workout-card h2 {
  margin: 0 0 12px;
  font-size: 1.15rem;
}

.workout-card pre {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 1rem;
  line-height: 1.55;
}

.complete-card {
  padding: 34px 24px;
  text-align: center;
  color: #fff;
  background: linear-gradient(135deg, #16100a 0%, #ff7a00 100%);
}

.complete-kicker {
  margin: 0 0 8px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.complete-card h2 {
  margin: 0;
  font-size: 2.8rem;
}

.complete-card p {
  font-weight: 800;
}

@media (min-width: 720px) {
  .app-shell {
    margin-top: 24px;
    margin-bottom: 24px;
    border-radius: 30px;
    overflow: hidden;
  }

  .content-wrap {
    padding: 28px;
  }
}
```

- [ ] **Step 5: Build**

Run:

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit UI**

Run:

```bash
git add app components
git commit -m "feat: add mobile workout interface"
```

---

### Task 8: Final Verification And Documentation Polish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add README**

Create `README.md`:

```md
# Daily Workout

A local-first Next.js app for viewing the current Orangetheory Daily Workout from r/orangetheory.

## V1 Behavior

- Shows one current workout.
- Starts with a seeded sample workout.
- Uses a manual refresh button to fetch public Reddit JSON.
- Finds the newest post whose title contains `Daily Workout`.
- Cleans and conservatively parses the workout.
- Falls back to raw cleaned text when parsing is uncertain.
- Stores the current workout and completion state in SQLite.
- Does not use AI, login, Reddit credentials, history, or a settings screen.

## Local Development

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js.

## Test And Build

```bash
npm test
npm run build
```

## Configuration

Optional environment variables:

- `REDDIT_SUBREDDIT`, default `orangetheory`
- `REDDIT_TITLE_KEYWORD`, default `Daily Workout`
- `REDDIT_MAX_POSTS_TO_SCAN`, default `25`
- `REDDIT_REQUEST_TIMEOUT_MS`, default `8000`
- `SQLITE_PATH`, default `daily-workout.db`
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
npm run build
git status --short
```

Expected:

- `npm test` passes.
- `npm run build` passes.
- `git status --short` shows only intended README changes before commit.

- [ ] **Step 3: Commit README**

Run:

```bash
git add README.md
git commit -m "docs: add project README"
```

- [ ] **Step 4: Push completed implementation**

Run:

```bash
git push
```

Expected: Local `main` pushes to `origin/main`.

---

## Spec Coverage Checklist

- Mobile-first web app: Task 7.
- Seeded sample workout: Task 2 and Task 4.
- Manual refresh API route: Task 6.
- Public Reddit endpoints only: Task 5.
- Latest title containing `Daily Workout`: Task 5 and Task 6.
- Deterministic parser with structured/raw fallback: Task 3.
- Keep shorthand as-is: Task 3 tests.
- SQLite current workout storage: Task 4.
- Completed celebration state: Task 7.
- Subtle refresh failure status: Task 6 and Task 7.
- No source link, no login, no settings UI, no AI calls: Task 7 UI and README.
- Parser and API/service tests: Task 3, Task 4, Task 5, Task 6.
