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
