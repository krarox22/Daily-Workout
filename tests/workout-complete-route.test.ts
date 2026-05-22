import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleWorkout } from "@/lib/sample-workout";

const workoutServiceMocks = vi.hoisted(() => {
  const service = {
    getCurrentWorkout: vi.fn(),
    setCompleted: vi.fn(),
    refreshWorkout: vi.fn(),
    close: vi.fn()
  };

  return {
    service,
    createWorkoutService: vi.fn(() => service)
  };
});

vi.mock("@/lib/workouts", () => ({
  createWorkoutService: workoutServiceMocks.createWorkoutService
}));

import { POST } from "@/app/api/workout/complete/route";

describe("workout completion route", () => {
  beforeEach(() => {
    workoutServiceMocks.createWorkoutService.mockClear();
    workoutServiceMocks.service.setCompleted.mockReset();
    workoutServiceMocks.service.close.mockReset();
    workoutServiceMocks.service.setCompleted.mockReturnValue(sampleWorkout);
  });

  it("returns 400 and does not write when JSON is malformed", async () => {
    const response = await POST(new Request("http://localhost/api/workout/complete", {
      method: "POST",
      body: "not json"
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid JSON" });
    expect(workoutServiceMocks.service.setCompleted).not.toHaveBeenCalled();
    expect(workoutServiceMocks.service.close).toHaveBeenCalledOnce();
  });

  it.each([
    ["empty object", {}],
    ["missing body object", null],
    ["string completed", { completed: "true" }],
    ["missing completed", { done: true }]
  ])("returns 400 and does not write for %s", async (_label, body) => {
    const response = await POST(new Request("http://localhost/api/workout/complete", {
      method: "POST",
      body: JSON.stringify(body)
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "completed must be a boolean" });
    expect(workoutServiceMocks.service.setCompleted).not.toHaveBeenCalled();
    expect(workoutServiceMocks.service.close).toHaveBeenCalledOnce();
  });

  it("writes boolean completion values", async () => {
    const response = await POST(new Request("http://localhost/api/workout/complete", {
      method: "POST",
      body: JSON.stringify({ completed: true })
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ workout: sampleWorkout });
    expect(workoutServiceMocks.service.setCompleted).toHaveBeenCalledWith(true);
    expect(workoutServiceMocks.service.close).toHaveBeenCalledOnce();
  });
});
