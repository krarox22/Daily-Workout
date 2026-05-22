import { NextResponse } from "next/server";
import { createWorkoutService } from "@/lib/workouts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const service = createWorkoutService();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body || typeof body !== "object" || typeof (body as { completed?: unknown }).completed !== "boolean") {
      return NextResponse.json({ error: "completed must be a boolean" }, { status: 400 });
    }

    const workout = service.setCompleted((body as { completed: boolean }).completed);

    return NextResponse.json({ workout });
  } finally {
    service.close();
  }
}
