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

    close(): void {
      store.close();
    },

    async refreshWorkout(): Promise<RefreshResult> {
      try {
        const posts = await fetchPosts();
        const post = findLatestDailyWorkoutPost(posts, appConfig.titleKeyword);

        if (!post) {
          const workout = store.setRefreshStatus("failed");
          return { ok: false, workout, message: "No Daily Workout post found" };
        }

        const current = store.getCurrentWorkout();
        const parsed = parseWorkout({ title: post.title, selftext: post.selftext });
        const workout = store.saveCurrentWorkout({
          id: "current",
          ...parsed,
          redditId: post.id,
          redditTitle: post.title,
          redditCreatedAt: new Date(post.createdUtc * 1000).toISOString(),
          fetchedAt: new Date().toISOString(),
          lastRefreshStatus: "success",
          completed: current.redditId === post.id ? current.completed : false
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
