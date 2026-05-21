export const appConfig = {
  subreddit: process.env.REDDIT_SUBREDDIT ?? "orangetheory",
  titleKeyword: process.env.REDDIT_TITLE_KEYWORD ?? "Daily Workout",
  maxPostsToScan: Number(process.env.REDDIT_MAX_POSTS_TO_SCAN ?? "25"),
  requestTimeoutMs: Number(process.env.REDDIT_REQUEST_TIMEOUT_MS ?? "8000"),
  sqlitePath: process.env.SQLITE_PATH ?? "daily-workout.db"
};
