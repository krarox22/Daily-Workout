import type { Workout } from "@/lib/types";

type Props = {
  workout: Workout;
};

export function WorkoutContent({ workout }: Props) {
  if (workout.parserMode === "structured" && workout.sections.length > 0) {
    return (
      <div className="section-list">
        {workout.sections.map((section, index) => (
          <section className="workout-card" key={`${section.heading}-${index}`}>
            <h2>{section.heading}</h2>
            <pre>{section.body}</pre>
          </section>
        ))}
      </div>
    );
  }

  return (
    <section className="workout-card">
      <h2>Workout</h2>
      <pre>{workout.rawText}</pre>
    </section>
  );
}
