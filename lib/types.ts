export type RefreshStatus = "idle" | "success" | "failed";

export type WorkoutSection = {
  heading: string;
  body: string;
};

export type ParsedWorkout = {
  title: string;
  displayDate: string | null;
  rawText: string;
  sections: WorkoutSection[];
  parserMode: "structured" | "raw";
};

export type Workout = ParsedWorkout & {
  id: string;
  redditId: string | null;
  redditTitle: string | null;
  redditCreatedAt: string | null;
  fetchedAt: string | null;
  lastRefreshStatus: RefreshStatus;
  completed: boolean;
};

export type RedditPost = {
  id: string;
  title: string;
  selftext: string;
  createdUtc: number;
};
