import { NextResponse } from "next/server";
import { createWorkoutService } from "@/lib/workouts";

export const runtime = "nodejs";

export async function GET() {
  const service = createWorkoutService();

  return NextResponse.json({ workout: service.getCurrentWorkout() });
}
