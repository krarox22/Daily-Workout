import { appConfig } from "./config";
import { createWorkoutStore, type WorkoutStore } from "./db";
import { parseWorkout, isBoilerplate, isDailyWorkoutTitle } from "./parser";
import { fetchRecentPosts, fetchPostComments } from "./reddit";
import type { RedditPost, RedditComment, Workout } from "./types";

type ServiceDeps = {
  store?: WorkoutStore;
  fetchPosts?: () => Promise<RedditPost[]>;
  fetchComments?: (postId: string) => Promise<RedditComment[]>;
};

export type RefreshResult = {
  ok: boolean;
  workout: Workout;
  message: string;
};

function extractLinkedPostId(text: string): string | null {
  const match = text.match(/\/comments\/([a-z0-9]{5,10})/i);
  return match ? match[1] : null;
}

export function createWorkoutService(deps: ServiceDeps = {}) {
  const store = deps.store ?? createWorkoutStore();
  const fetchPosts = deps.fetchPosts ?? fetchRecentPosts;
  const fetchComments = deps.fetchComments ?? fetchPostComments;

  return {
    getCurrentWorkout(): Workout {
      return store.getCurrentWorkout();
    },

    setCompleted(completed: boolean): Workout {
      return store.setCompleted(completed);
    },

    close(): void {
      store.close();
    },

    async refreshWorkout(overridePostId?: string): Promise<RefreshResult> {
      try {
        let selectedPost: { id: string; title: string; selftext: string; createdUtc: number } | null = null;
        let selectedText = "";

        if (overridePostId) {
          const comments = await fetchComments(overridePostId);
          const targetComment = comments.find(
            (c) => c.author.toLowerCase() === appConfig.targetCommentAuthor.toLowerCase()
          );
          selectedText = targetComment ? targetComment.body : "";
          selectedPost = {
            id: overridePostId,
            title: `Daily Workout and General Chat for Saturday 05/16/26 (Demo)`,
            selftext: selectedText,
            createdUtc: Math.floor(Date.now() / 1000)
          };
        } else {
          const posts = await fetchPosts();
          const dailyPosts = posts
            .filter((p) => isDailyWorkoutTitle(p.title, appConfig.titleKeyword))
            .sort((a, b) => b.createdUtc - a.createdUtc);

          for (const post of dailyPosts) {
            const comments = await fetchComments(post.id);
            const targetComment = comments.find(
              (c) => c.author.toLowerCase() === appConfig.targetCommentAuthor.toLowerCase()
            );

            if (targetComment) {
              selectedPost = post;
              selectedText = targetComment.body;
              break;
            }

            if (!isBoilerplate(post.selftext)) {
              selectedPost = post;
              selectedText = post.selftext;
              break;
            }
          }
        }

        if (!selectedPost) {
          const workout = store.setRefreshStatus("failed");
          return { ok: false, workout, message: "No Daily Workout post found" };
        }

        let parsed = parseWorkout({ title: selectedPost.title, selftext: selectedText });

        // If the parsed workout is raw (no structured sections found) and contains a link to another Reddit post,
        // we follow the link to fetch comments for that post and extract the target workout comment from it.
        if (parsed.parserMode === "raw") {
          const linkedPostId = extractLinkedPostId(selectedText);
          if (linkedPostId) {
            try {
              const linkedComments = await fetchComments(linkedPostId);
              const targetLinkedComment = linkedComments.find(
                (c) => c.author.toLowerCase() === appConfig.targetCommentAuthor.toLowerCase()
              );
              if (targetLinkedComment) {
                const linkedParsed = parseWorkout({
                  title: selectedPost.title,
                  selftext: targetLinkedComment.body
                });
                if (linkedParsed.parserMode === "structured") {
                  parsed = linkedParsed;
                }
              }
            } catch (err) {
              // Ignore link-following failure and fallback to the original raw workout text
            }
          }
        }

        const current = store.getCurrentWorkout();
        const workout = store.saveCurrentWorkout({
          id: "current",
          ...parsed,
          redditId: selectedPost.id,
          redditTitle: selectedPost.title,
          redditCreatedAt: new Date(selectedPost.createdUtc * 1000).toISOString(),
          fetchedAt: new Date().toISOString(),
          lastRefreshStatus: "success",
          completed: current.redditId === selectedPost.id ? current.completed : false
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
