import { appConfig } from "./config";
import { isDailyWorkoutTitle, isBoilerplate } from "./parser";
import type { RedditPost, RedditComment } from "./types";

type JsonRecord = Record<string, unknown>;

const USER_AGENT = "web:daily-workout-viewer:v1.0.0 (by /u/krarox22)";

async function getRedditAccessToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT
      },
      body: "grant_type=client_credentials",
      cache: "no-store"
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

export async function fetchRecentPosts(): Promise<RedditPost[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), appConfig.requestTimeoutMs);
  const subreddit = encodeURIComponent(appConfig.subreddit);

  try {
    const token = await getRedditAccessToken();
    const url = token
      ? `https://oauth.reddit.com/r/${subreddit}/new?limit=${appConfig.maxPostsToScan}`
      : `https://www.reddit.com/r/${subreddit}/new.json?limit=${appConfig.maxPostsToScan}`;

    const headers: HeadersInit = {
      "User-Agent": USER_AGENT
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      signal: controller.signal,
      headers
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
      .filter((post) => isDailyWorkoutTitle(post.title, keyword) && !isBoilerplate(post.selftext))
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

export async function fetchPostComments(postId: string): Promise<RedditComment[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), appConfig.requestTimeoutMs);

  try {
    const token = await getRedditAccessToken();
    const url = token
      ? `https://oauth.reddit.com/comments/${encodeURIComponent(postId)}`
      : `https://www.reddit.com/comments/${encodeURIComponent(postId)}.json`;

    const headers: HeadersInit = {
      "User-Agent": USER_AGENT
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      signal: controller.signal,
      headers
    });

    if (!response.ok) {
      throw new Error(`Reddit comments request failed with status ${response.status}`);
    }

    const data = await response.json();
    return mapRedditComments(data);
  } finally {
    clearTimeout(timeout);
  }
}

function mapRedditComments(data: unknown): RedditComment[] {
  if (!Array.isArray(data) || data.length < 2) {
    return [];
  }
  const commentsListing = data[1];
  const listingData = asRecord(commentsListing)?.data;
  const children = asRecord(listingData)?.children;

  if (!Array.isArray(children)) {
    return [];
  }

  return children.flatMap((child) => {
    const comment = mapRedditCommentChild(child);
    return comment ? [comment] : [];
  });
}

function mapRedditCommentChild(child: unknown): RedditComment | null {
  const data = asRecord(asRecord(child)?.data);
  if (!data) {
    return null;
  }

  const id = data.id;
  const author = data.author;
  const body = data.body;
  const createdUtc = data.created_utc;

  if (typeof id !== "string" || typeof author !== "string" || typeof body !== "string" || typeof createdUtc !== "number") {
    return null;
  }

  return {
    id,
    author,
    body,
    createdUtc
  };
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}
