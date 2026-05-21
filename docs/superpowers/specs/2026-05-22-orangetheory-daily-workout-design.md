# Orangetheory Daily Workout App Design

## Summary

Build a mobile-first web app that displays the current Orangetheory Daily Workout from r/orangetheory. Version 1 starts local-first, uses Next.js, stores one current workout in SQLite, and fetches Reddit manually through a refresh button. The app does not use AI for daily processing. It uses deterministic cleanup and parsing rules, with safe fallback behavior when post formats vary.

The app is designed so a 9am IST scheduled refresh can be added later by calling the same refresh service used by the manual button.

## Goals

- Show one current Orangetheory Daily Workout in a clean mobile-first UI.
- Fetch from public Reddit JSON/RSS-style endpoints without Reddit credentials.
- Pick the latest r/orangetheory post whose title contains `Daily Workout`.
- Clean the workout body and display structured sections when parsing is confident.
- Fall back to raw cleaned workout text when parsing is uncertain.
- Store the current workout and completion state in SQLite.
- Provide a manual refresh button for v1.
- Support parser and API route tests.

## Non-Goals

- No login or user accounts.
- No Reddit source link in the UI.
- No AI calls for parsing, summarizing, or rewriting the daily workout.
- No workout archive or history in v1.
- No visible settings screen in v1.
- No automatic 9am IST scheduler in v1, though the architecture must allow it later.

## Product Behavior

On first launch, the app shows a seeded sample workout so the interface feels complete before Reddit has been fetched.

The main screen shows:

- A bold orange hero header.
- A title like `Today's Workout · May 22` when the date can be parsed from the Reddit title.
- A fallback title of `Today's Workout` when no date can be parsed.
- A refresh button.
- A subtle refresh status near the refresh button.
- The cleaned workout content.
- A simple completion control.

When the user taps refresh, the app calls a Next.js API route. The route fetches recent r/orangetheory posts, finds the newest post whose title contains `Daily Workout`, cleans and parses the post body, saves the result to SQLite, and returns the current workout.

If refresh fails, the app keeps showing the saved workout and displays a subtle status such as `Last refresh failed`. The failure should not replace the workout view with a full-page error.

When the user marks the workout complete, the main workout view changes into a celebratory `Great job!` state. The completed state should include an option to undo or view the workout again. When a new workout replaces the old one, completion resets.

## Visual Direction

The app is mobile-first and should feel energetic without sacrificing readability.

The visual style is a hybrid:

- Bold orange/yellow hero at the top.
- Strong fitness typography and high-contrast accents.
- Clean readable cards or text blocks below the hero.
- Desktop support through a wider centered layout, not a separate complex dashboard.

The design should avoid a settings-heavy or analytics-heavy experience. The app is primarily for quickly seeing the day's workout on a phone.

## Architecture

Use Next.js for both the frontend and backend API.

Suggested modules:

- `app/page`: server or client entry for rendering the current workout.
- `app/api/refresh/route`: manual refresh endpoint.
- `app/api/workout/route`: optional read endpoint if the UI fetches data client-side.
- `lib/config`: developer config for subreddit, title keyword, request timeout, and max posts to scan.
- `lib/reddit`: public Reddit fetch adapter.
- `lib/parser`: deterministic cleanup, date extraction, and section parsing.
- `lib/db`: SQLite connection and persistence functions.
- `lib/workouts`: application service that coordinates fetch, parse, and save behavior.

The refresh route should call an internal service rather than embedding all logic directly in the route. This keeps the same service reusable later from cron.

## Data Flow

Initial page load:

1. Read current workout from SQLite.
2. If no workout exists, insert or return the seeded sample workout.
3. Render the mobile-first workout view.

Manual refresh:

1. User taps refresh.
2. UI calls `POST /api/refresh`.
3. API route calls the workout refresh service.
4. Service fetches public Reddit data.
5. Service finds the newest post whose title contains `Daily Workout`.
6. Parser extracts metadata and cleaned workout content.
7. Service saves the new current workout to SQLite and resets completion.
8. API returns the saved workout plus refresh status.
9. UI updates without requiring a full reload.

Refresh failure:

1. API catches fetch, parse, or storage errors.
2. Existing saved workout remains unchanged.
3. Refresh status is updated to failed.
4. API returns the current saved workout plus failure status when possible.
5. UI shows a subtle failure status near the refresh control.

## Reddit Fetching

Use public Reddit endpoints only in v1. The app should not require Reddit API credentials.

The fetcher should:

- Query recent posts from r/orangetheory.
- Scan a bounded number of recent posts.
- Match posts whose title contains `Daily Workout`, case-insensitively.
- Prefer the newest matching post.
- Use request timeout handling.
- Return enough metadata for internal tracking, such as Reddit post ID, title, created time, and body text.

The app should store metadata internally for debugging and duplicate handling, but should not show a Reddit source link in the UI.

## Parsing

Parsing must be deterministic and conservative.

The parser should:

- Preserve Orangetheory shorthand exactly as written.
- Clean obvious Reddit formatting noise.
- Extract a display date from the title when possible.
- Attempt to identify workout sections such as Tread, Row, Floor, Lift, Finisher, and Notes.
- Preserve the original post order when structured sections are detected.
- Return structured sections only when confidence is high.
- Return raw cleaned workout text when parsing is uncertain.

The parser should not rewrite, summarize, expand abbreviations, or invent missing structure.

## Storage

Use SQLite in v1.

The data model should support:

- One current workout.
- Reddit metadata for internal use.
- Cleaned raw workout text.
- Optional parsed sections in JSON.
- Parsed display date.
- Last successful refresh time.
- Last refresh status.
- Completion state.

Because v1 is today-only, replacing the current workout should reset completion. The schema may still be designed so history can be added later without a rewrite.

## Configuration

No settings screen in v1.

Use developer config or environment variables for:

- Subreddit name, default `orangetheory`.
- Title keyword, default `Daily Workout`.
- Max posts to scan.
- Request timeout.
- SQLite database path.

## Error Handling

The app should prefer saved content over disruptive errors.

Expected behavior:

- If Reddit fetch fails, keep showing the saved workout.
- If no matching post is found, keep showing the saved workout.
- If parsing fails, show raw cleaned text when available.
- If date extraction fails, show `Today's Workout`.
- If no saved workout exists and refresh fails, show the seeded sample workout plus subtle failure status.

## Testing

V1 should include parser and API route tests.

Parser tests should cover:

- Reddit text cleanup.
- Title keyword matching.
- Date extraction from common title formats.
- Structured section parsing in original order.
- Fallback to raw cleaned text when sections are uncertain.
- Preservation of Orangetheory shorthand.

API route or service tests should cover:

- Successful refresh from mocked Reddit data.
- No matching Daily Workout post.
- Failed Reddit fetch.
- Database write on success.
- Preserving the saved workout on failure.
- Resetting completion when a new workout replaces the old one.

## Future Enhancements

Future work can add:

- A 9am IST scheduled refresh using Vercel Cron, Render cron, local cron, or another scheduler.
- Workout history and search.
- Cloud storage for deployed environments.
- A small protected admin or developer-only status page.
- Optional deployment-specific health checks.

These should build on the same refresh service, parser, and storage interfaces from v1.
