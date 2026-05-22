import { WorkoutApp } from "@/components/workout-app";
import { createWorkoutService } from "@/lib/workouts";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const service = createWorkoutService();

  try {
    const workout = service.getCurrentWorkout();
    return <WorkoutApp initialWorkout={workout} />;
  } finally {
    service.close();
  }
}
