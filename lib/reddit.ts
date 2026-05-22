import { appConfig } from "./config";
import { isDailyWorkoutTitle } from "./parser";
import type { RedditPost } from "./types";

type JsonRecord = Record<string, unknown>;

export async function fetchRecentPosts(): Promise<RedditPost[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), appConfig.requestTimeoutMs);
  const subreddit = encodeURIComponent(appConfig.subreddit);
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${appConfig.maxPostsToScan}`;

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "daily-workout-app/0.1"
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit request failed with status ${response.status}`);
    }

    return mapRedditListing(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

export function findLatestDailyWorkoutPost(posts: RedditPost[], keyword: string): RedditPost | null {
  return (
    posts
      .filter((post) => isDailyWorkoutTitle(post.title, keyword))
      .sort((left, right) => right.createdUtc - left.createdUtc)[0] ?? null
  );
}

function mapRedditListing(listing: unknown): RedditPost[] {
  const listingData = asRecord(listing)?.data;
  const children = asRecord(listingData)?.children;

  if (!Array.isArray(children)) {
    return [];
  }

  return children.flatMap((child) => {
    const post = mapRedditChild(child);
    return post ? [post] : [];
  });
}

function mapRedditChild(child: unknown): RedditPost | null {
  const data = asRecord(asRecord(child)?.data);
  if (!data) {
    return null;
  }

  const id = data.id;
  const title = data.title;
  const selftext = data.selftext;
  const createdUtc = data.created_utc;

  if (typeof id !== "string" || typeof title !== "string" || typeof createdUtc !== "number") {
    return null;
  }

  return {
    id,
    title,
    selftext: typeof selftext === "string" ? selftext : "",
    createdUtc
  };
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}
