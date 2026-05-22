export function readPositiveIntegerEnv(value: string | undefined, fallback: number): number {
  const trimmedValue = value?.trim();

  if (!trimmedValue || !/^[1-9]\d*$/.test(trimmedValue)) {
    return fallback;
  }

  const parsedValue = Number(trimmedValue);

  return Number.isSafeInteger(parsedValue) ? parsedValue : fallback;
}

export const appConfig = {
  subreddit: process.env.REDDIT_SUBREDDIT ?? "orangetheory",
  titleKeyword: process.env.REDDIT_TITLE_KEYWORD ?? "Daily Workout",
  targetCommentAuthor: process.env.REDDIT_TARGET_COMMENT_AUTHOR ?? "dc031114",
  maxPostsToScan: readPositiveIntegerEnv(process.env.REDDIT_MAX_POSTS_TO_SCAN, 25),
  requestTimeoutMs: readPositiveIntegerEnv(process.env.REDDIT_REQUEST_TIMEOUT_MS, 8000),
  sqlitePath: process.env.SQLITE_PATH ?? "daily-workout.db"
};
