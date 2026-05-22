import { NextResponse } from "next/server";
import { createWorkoutService } from "@/lib/workouts";

export const runtime = "nodejs";

export async function POST() {
  const service = createWorkoutService();

  try {
    const result = await service.refreshWorkout();

    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } finally {
    service.close();
  }
}
