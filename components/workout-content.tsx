"use client";

import { useState } from "react";
import type { Workout } from "@/lib/types";

type Props = {
  workout: Workout;
};

export function WorkoutContent({ workout }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  function parseWorkoutLine(line: string) {
    const cleanedLine = line.replace(/&amp;/g, "&");
    const trimmed = cleanedLine.trim();
    if (!trimmed) return null;

    // Goal instruction lines
    if (trimmed.toLowerCase().startsWith("goal:")) {
      return <p className="workout-line goal">{cleanedLine}</p>;
    }

    // Header/round lines
    const isRound = /^(round\s*\d+|block\s*\d+)/i.test(trimmed);
    if (isRound) {
      return <p className="workout-line round-header">{cleanedLine}</p>;
    }

    // Regex to match pace/metric keywords and inclines
    const metricRegex = /\b(AO|PW|WR|push|base|all\s+out|walking\s+recovery|incline|min|sec)\b|(\d+%\+?)/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    const regex = new RegExp(metricRegex);
    while ((match = regex.exec(cleanedLine)) !== null) {
      const matchIndex = match.index;
      const matchText = match[0];

      if (matchIndex > lastIndex) {
        parts.push(cleanedLine.substring(lastIndex, matchIndex));
      }

      let badgeClass = "badge-generic";
      const lowerText = matchText.toLowerCase();
      if (lowerText === "ao" || lowerText.includes("all out")) {
        badgeClass = "badge-ao";
      } else if (lowerText === "pw" || lowerText.includes("power walker")) {
        badgeClass = "badge-pw";
      } else if (lowerText === "wr" || lowerText.includes("walking recovery")) {
        badgeClass = "badge-wr";
      } else if (lowerText === "push") {
        badgeClass = "badge-push";
      } else if (lowerText === "base") {
        badgeClass = "badge-base";
      } else if (/\d+%/.test(matchText)) {
        badgeClass = "badge-incline";
      }

      parts.push(
        <span key={`${matchText}-${matchIndex}`} className={`badge ${badgeClass}`}>
          {matchText}
        </span>
      );

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < cleanedLine.length) {
      parts.push(cleanedLine.substring(lastIndex));
    }

    return <p className="workout-line">{parts.length > 0 ? parts : cleanedLine}</p>;
  }

  function renderBody(body: string) {
    const lines = body.split("\n");
    return (
      <div className="card-body">
        {lines.map((line, lineIndex) => {
          const isRoundHeader = /^(round\s*\d+)/i.test(line.trim());
          const parsedLine = parseWorkoutLine(line);
          if (!parsedLine) return null;

          return (
            <div key={lineIndex}>
              {isRoundHeader && lineIndex > 0 && <hr className="round-divider" />}
              {parsedLine}
            </div>
          );
        })}
      </div>
    );
  }

  if (workout.parserMode === "structured" && workout.sections.length > 0) {
    return (
      <div className="section-list">
        {workout.sections.map((section, index) => {
          const isActive = activeIndex === index;
          const cardClass = `workout-card ${isActive ? "active" : "inactive"}`;
          return (
            <section
              className={cardClass}
              key={`${section.heading}-${index}`}
              onClick={() => setActiveIndex(index)}
              style={{ cursor: "pointer" }}
            >
              <h2>{section.heading}</h2>
              {renderBody(section.body)}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <section className="workout-card active">
      <h2>Workout</h2>
      {renderBody(workout.rawText)}
    </section>
  );
}
