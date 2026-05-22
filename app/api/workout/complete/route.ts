import { NextResponse } from "next/server";
import { createWorkoutService } from "@/lib/workouts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const service = createWorkoutService();
  const completed = await readCompleted(request);
  const workout = service.setCompleted(completed);

  return NextResponse.json({ workout });
}

async function readCompleted(request: Request): Promise<boolean> {
  try {
    const body = (await request.json()) as { completed?: boolean };
    return Boolean(body.completed);
  } catch {
    return false;
  }
}
