// ============================================================
// hooks/useWorkoutPlan.ts
// React hook — hybrid: rules engine + Claude API refinement
// Usage: const { plan, loading, error, generate } = useWorkoutPlan()
// ============================================================

"use client";

import { useState, useCallback } from "react";
import {
  buildWeeklyPlan,
  buildProgressedPlan,
  buildClaudePrompt,
} from "../lib/routineEngine";
import { EXERCISE_DB } from "../lib/exerciseDb";
import type {
  WeeklyPlan,
  UserProfile,
  ProgressionContext,
  ClaudeRoutineResponse,
  ExerciseSlot,
} from "../types/workout";

// ─── Types ───────────────────────────────────────────────────

interface UseWorkoutPlanOptions {
  /** Use Claude API for personalization on top of rules engine. Default: true */
  useClaudeRefinement?: boolean;
  /** Claude model. Default: claude-sonnet-4-20250514 */
  model?: string;
}

interface UseWorkoutPlanReturn {
  plan: WeeklyPlan | null;
  loading: boolean;
  error: string | null;
  /** Generate week 1 from scratch */
  generate: (profile: UserProfile) => Promise<void>;
  /** Progress from previous week using feedback */
  progress: (ctx: ProgressionContext) => Promise<void>;
  /** Clear current plan */
  reset: () => void;
}

// ─── Hook ────────────────────────────────────────────────────

export function useWorkoutPlan(
  options: UseWorkoutPlanOptions = {}
): UseWorkoutPlanReturn {
  const {
    useClaudeRefinement = true,
    model = "claude-sonnet-4-20250514",
  } = options;

  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Shared: call Claude and merge result into plan ──────────

  const refineWithClaude = useCallback(
    async (rulesPlan: WeeklyPlan, feedback?: ProgressionContext["userFeedback"]): Promise<WeeklyPlan> => {
      const { system, user } = buildClaudePrompt(rulesPlan, feedback);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Claude API error ${response.status}: ${err?.error?.message ?? "unknown"}`);
      }

      const data = await response.json();
      const rawText: string = data.content
        .filter((b: { type: string }) => b.type === "text")
        .map((b: { text: string }) => b.text)
        .join("");

      // Strip potential markdown fences
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const claudeResult: ClaudeRoutineResponse = JSON.parse(cleaned);

      // Hydrate exerciseId references back to full Exercise objects
      const hydratedDays = claudeResult.days.map(day => ({
        ...day,
        sections: day.sections.map(section => ({
          ...section,
          exercises: section.exercises.map((slot: ExerciseSlot & { exerciseId?: string }) => {
            // Claude returns exerciseId string — resolve to full object
            const id = (slot as { exerciseId?: string }).exerciseId ?? slot.exercise?.id;
            const exercise = id ? (EXERCISE_DB[id] ?? slot.exercise) : slot.exercise;
            return { ...slot, exercise };
          }),
        })),
      }));

      return {
        ...rulesPlan,
        days: hydratedDays as WeeklyPlan["days"],
        generatedBy: "hybrid",
      };
    },
    [model]
  );

  // ── generate: week 1 from scratch ──────────────────────────

  const generate = useCallback(
    async (profile: UserProfile) => {
      setLoading(true);
      setError(null);

      try {
        // Step 1: rules engine builds the base plan
        const rulesPlan = buildWeeklyPlan(profile, 1);

        if (!useClaudeRefinement) {
          setPlan(rulesPlan);
          return;
        }

        // Step 2: Claude refines it
        const refined = await refineWithClaude(rulesPlan);
        setPlan(refined);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);

        // Fallback: use rules-only plan
        try {
          const fallback = buildWeeklyPlan(profile, 1);
          setPlan(fallback);
        } catch {
          // nothing to do
        }
      } finally {
        setLoading(false);
      }
    },
    [useClaudeRefinement, refineWithClaude]
  );

  // ── progress: generate next week based on feedback ─────────

  const progress = useCallback(
    async (ctx: ProgressionContext) => {
      setLoading(true);
      setError(null);

      try {
        // Step 1: rules engine applies base progressions
        const rulesPlan = buildProgressedPlan(ctx);

        if (!useClaudeRefinement) {
          setPlan(rulesPlan);
          return;
        }

        // Step 2: Claude refines with full context
        const refined = await refineWithClaude(rulesPlan, ctx.userFeedback);
        setPlan(refined);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);

        // Fallback: use rules-progressed plan
        try {
          const fallback = buildProgressedPlan(ctx);
          setPlan(fallback);
        } catch {
          // nothing to do
        }
      } finally {
        setLoading(false);
      }
    },
    [useClaudeRefinement, refineWithClaude]
  );

  const reset = useCallback(() => {
    setPlan(null);
    setError(null);
  }, []);

  return { plan, loading, error, generate, progress, reset };
}

// ─── Standalone fetch (for server components / API routes) ───

export async function fetchWorkoutPlan(
  profile: UserProfile,
  weekNumber: number = 1,
  feedback?: ProgressionContext["userFeedback"],
  previousPlan?: WeeklyPlan,
  model = "claude-sonnet-4-20250514"
): Promise<WeeklyPlan> {
  // Build base plan
  const rulesPlan =
    weekNumber > 1 && feedback && previousPlan
      ? buildProgressedPlan({ weekNumber, previousPlan, userFeedback: feedback })
      : buildWeeklyPlan(profile, weekNumber);

  // Refine with Claude
  const { system, user } = buildClaudePrompt(rulesPlan, feedback);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    console.error("Claude API failed, returning rules-only plan");
    return rulesPlan;
  }

  const data = await response.json();
  const rawText: string = data.content
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");

  try {
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const claudeResult: ClaudeRoutineResponse = JSON.parse(cleaned);

    const hydratedDays = claudeResult.days.map(day => ({
      ...day,
      sections: day.sections.map(section => ({
        ...section,
        exercises: section.exercises.map((slot: ExerciseSlot & { exerciseId?: string }) => {
          const id = (slot as { exerciseId?: string }).exerciseId ?? slot.exercise?.id;
          const exercise = id ? (EXERCISE_DB[id] ?? slot.exercise) : slot.exercise;
          return { ...slot, exercise };
        }),
      })),
    }));

    return {
      ...rulesPlan,
      days: hydratedDays as WeeklyPlan["days"],
      generatedBy: "hybrid",
    };
  } catch {
    console.error("Failed to parse Claude response, returning rules-only plan");
    return rulesPlan;
  }
}
