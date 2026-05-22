import { NextResponse } from "next/server";
import { createWorkoutService } from "@/lib/workouts";

export const runtime = "nodejs";

export async function POST() {
  const service = createWorkoutService();
  const result = await service.refreshWorkout();

  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
