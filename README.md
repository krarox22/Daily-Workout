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

Use Node 22.22.1 or another runtime compatible with the `engines` range in `package.json`.

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
