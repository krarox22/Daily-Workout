"use client";

import { useState } from "react";
import type { Workout } from "@/lib/types";
import { WorkoutContent } from "./workout-content";

type Props = {
  initialWorkout: Workout;
};

type RefreshResponse = {
  ok: boolean;
  workout: Workout;
  message: string;
};

type CompletionResponse = {
  workout: Workout;
};

export function WorkoutApp({ initialWorkout }: Props) {
  const [workout, setWorkout] = useState(initialWorkout);
  const [statusText, setStatusText] = useState(statusFromWorkout(initialWorkout));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingCompletion, setIsSavingCompletion] = useState(false);

  const title = workout.displayDate ? `Today's Workout · ${workout.displayDate}` : "Today's Workout";
  const isBusy = isRefreshing || isSavingCompletion;

  async function refreshWorkout() {
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      const result = (await response.json()) as RefreshResponse;

      if (!result.workout) {
        setStatusText("Last refresh failed");
        return;
      }

      setWorkout(result.workout);
      setStatusText(response.ok && result.ok ? "Updated just now" : "Last refresh failed");
    } catch {
      setStatusText("Last refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function setCompleted(completed: boolean) {
    setIsSavingCompletion(true);

    try {
      const response = await fetch("/api/workout/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed })
      });
      const result = (await response.json()) as CompletionResponse;

      if (!response.ok || !result.workout) {
        setStatusText("Completion update failed");
        return;
      }

      setWorkout(result.workout);
      setStatusText(statusFromWorkout(result.workout));
    } catch {
      setStatusText("Completion update failed");
    } finally {
      setIsSavingCompletion(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Orangetheory</p>
          <h1>{title}</h1>
          <p className="hero-copy">Clean daily workout. Just the essentials.</p>
          <div className="hero-actions">
            <button className="primary-button" disabled={isBusy} onClick={refreshWorkout}>
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <span className="status-text" aria-live="polite">
              {statusText}
            </span>
          </div>
        </div>
        <div className="hero-image-container">
          <img src="/strong-mind.png" alt="Strong Body Strong Mind" className="hero-image" />
        </div>
      </section>

      <section className="content-wrap">
        {workout.completed ? (
          <section className="complete-card">
            <p className="complete-kicker">Completed</p>
            <h2>Great job!</h2>
            <p>You showed up and finished today&apos;s work.</p>
            <button className="secondary-button" disabled={isBusy} onClick={() => setCompleted(false)}>
              View workout again
            </button>
          </section>
        ) : (
          <>
            <WorkoutContent workout={workout} />
            <button className="done-button" disabled={isBusy} onClick={() => setCompleted(true)}>
              {isSavingCompletion ? "Saving..." : "Mark as done"}
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
