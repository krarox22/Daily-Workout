import { NextResponse } from "next/server";
import { createWorkoutService } from "@/lib/workouts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let postId: string | undefined;

  try {
    const { searchParams } = new URL(request.url);
    const queryPostId = searchParams.get("postId");
    if (queryPostId) {
      postId = queryPostId;
    } else {
      const body = await request.json().catch(() => null);
      if (body && typeof body === "object" && typeof body.postId === "string") {
        postId = body.postId;
      }
    }
  } catch {}

  const service = createWorkoutService();

  try {
    const result = await service.refreshWorkout(postId);

    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } finally {
    service.close();
  }
}
