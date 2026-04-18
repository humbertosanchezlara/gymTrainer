// ============================================================
// lib/routineEngine.ts
// Rules-based routine generation + progression logic
// Claude API is called on top of this for personalization
// ============================================================

import { EXERCISE_DB, getExerciseById } from "./exerciseDb";
import type {
  UserProfile,
  WeeklyPlan,
  WorkoutDay,
  WorkoutSection,
  SetScheme,
  ProgressionContext,
  DayFocus,
} from "../types/workout";

// ─── Volume tables by tolerance ────────────────────────────

const VOLUME_TABLE = {
  low:       { mainSets: 3, coreSets: 2, circuitRounds: 3, restSeconds: 90 },
  medium:    { mainSets: 4, coreSets: 3, circuitRounds: 4, restSeconds: 75 },
  high:      { mainSets: 4, coreSets: 3, circuitRounds: 4, restSeconds: 60 },
  very_high: { mainSets: 5, coreSets: 3, circuitRounds: 5, restSeconds: 45 },
} as const;

// ─── Rep tables by difficulty ────────────────────────────────

const REP_TABLE = {
  beginner:     { compound: 10, isolation: 12, bodyweight: 15, isometric: 30 },
  intermediate: { compound: 12, isolation: 15, bodyweight: 20, isometric: 45 },
  advanced:     { compound: 12, isolation: 15, bodyweight: 25, isometric: 60 },
} as const;

// ─── Canonical day templates ─────────────────────────────────

type DayTemplate = {
  focus: DayFocus;
  title: string;
  subtitle: string;
  warmup: string[];
  main: string[];
  core: string[];
  estimatedMinutes: number;
};

const DAY_TEMPLATES: DayTemplate[] = [
  {
    focus: "push",
    title: "Push",
    subtitle: "Pecho · Hombros · Tríceps",
    warmup: ["band_pull_apart"],
    main: [
      "pushup_standard",
      "band_chest_press",
      "band_chest_fly",
      "pike_pushup",
      "band_lateral_raise",
      "band_overhead_press",
      "band_triceps_pushdown",
      "pushup_diamond",
    ],
    core: ["ab_rollout", "hollow_body_hold"],
    estimatedMinutes: 55,
  },
  {
    focus: "pull",
    title: "Pull",
    subtitle: "Espalda · Bíceps · Rear Delts",
    warmup: ["band_face_pull", "band_pull_apart"],
    main: [
      "band_seated_row",
      "band_single_arm_row",
      "band_pulldown",
      "band_lying_pullover",
      "band_face_pull",
      "band_reverse_fly",
      "band_bicep_curl",
      "band_hammer_curl",
    ],
    core: ["dead_bug", "reverse_crunch"],
    estimatedMinutes: 55,
  },
  {
    focus: "legs",
    title: "Legs",
    subtitle: "Cuádriceps · Glúteos · Isquios · Pantorrillas",
    warmup: ["band_lateral_walk"],
    main: [
      "bulgarian_split_squat",
      "squat_bodyweight",
      "lunge_band",
      "lateral_lunge",
      "loaded_beast",
      "wall_sit",
      "calf_raise_single",
      "rdl_band",
      "hip_thrust_band",
    ],
    core: ["dragon_flag_negative", "plank_band"],
    estimatedMinutes: 70,
  },
  {
    focus: "upper",
    title: "Upper",
    subtitle: "Push/Pull combinado — supersets antagonistas",
    warmup: ["band_pull_apart"],
    main: [
      "pushup_wide",         // A1
      "band_seated_row",     // A2
      "band_shoulder_press_seated", // B1
      "band_upright_row",    // B2
      "band_triceps_overhead",      // C1
      "band_concentration_curl",    // C2
    ],
    core: ["band_kneeling_crunch", "lsit_hold"],
    estimatedMinutes: 55,
  },
  {
    focus: "full_body",
    title: "Full Body",
    subtitle: "Circuito de potencia — acondicionamiento metabólico",
    warmup: [],
    main: [
      "squat_jump",
      "band_thruster",
      "pushup_band",
      "band_pull_through",
      "sumo_squat_pull",
      "mountain_climbers",
      "band_bent_over_row",
      "burpee",
    ],
    core: ["lying_leg_raise", "vup"],
    estimatedMinutes: 50,
  },
];

// ─── Superset pairings for upper day ─────────────────────────

const SUPERSET_PAIRS: Record<string, string> = {
  pushup_wide: "band_seated_row",
  band_seated_row: "pushup_wide",
  band_shoulder_press_seated: "band_upright_row",
  band_upright_row: "band_shoulder_press_seated",
  band_triceps_overhead: "band_concentration_curl",
  band_concentration_curl: "band_triceps_overhead",
};

// ─── Scheme builder ──────────────────────────────────────────

function buildScheme(
  exerciseId: string,
  profile: UserProfile,
  weekNumber: number,
  focus: DayFocus
): SetScheme {
  const ex = getExerciseById(exerciseId);
  const vol = VOLUME_TABLE[profile.volumeTolerance];
  const reps = REP_TABLE[profile.level];
  const weekMod = Math.min(weekNumber - 1, 3); // cap progression at week 4

  if (!ex) return { type: "reps", sets: 3, reps: 12 };

  // isometric exercises
  if (["wall_sit", "loaded_beast", "hollow_body_hold", "plank_band", "lsit_hold"].includes(exerciseId)) {
    const baseSecs = reps.isometric;
    return {
      type: "time",
      sets: vol.coreSets,
      seconds: baseSecs + weekMod * 10,
    };
  }

  // unilateral exercises
  if (ex.isUnilateral) {
    const baseReps = ex.category === "core" ? reps.bodyweight : reps.compound;
    return {
      type: "reps_per_side",
      sets: vol.mainSets,
      reps: baseReps + weekMod * 2,
    };
  }

  // circuit (full body day)
  if (focus === "full_body") {
    return {
      type: "reps",
      sets: 1,
      reps: reps.compound + weekMod * 2,
    };
  }

  // core exercises
  if (ex.category === "core") {
    return {
      type: "reps",
      sets: vol.coreSets + (weekMod > 0 ? 1 : 0),
      reps: reps.bodyweight,
    };
  }

  // isolation vs compound
  const baseReps = ex.tags.includes("isolation") ? reps.isolation : reps.compound;
  const baseSets = ex.tags.includes("compound") ? vol.mainSets : vol.mainSets - 1;

  return {
    type: "reps",
    sets: baseSets + Math.floor(weekMod / 2),
    reps: baseReps + weekMod * 2,
  };
}

// ─── Rest builder ────────────────────────────────────────────

function buildRest(
  exerciseId: string,
  focus: DayFocus,
  profile: UserProfile,
  weekNumber: number
): number {
  const vol = VOLUME_TABLE[profile.volumeTolerance];
  const weekReduction = Math.min((weekNumber - 1) * 10, 30);

  if (focus === "full_body") return 0; // circuit, rest between rounds
  if (SUPERSET_PAIRS[exerciseId]) return vol.restSeconds - weekReduction; // between superset pairs
  return vol.restSeconds - weekReduction + 15; // standard rest
}

// ─── Day builder ─────────────────────────────────────────────

function buildDay(
  template: DayTemplate,
  dayNumber: number,
  profile: UserProfile,
  weekNumber: number
): WorkoutDay {
  const vol = VOLUME_TABLE[profile.volumeTolerance];

  // Filter out exercises that require unavailable equipment
  const availableEquipment = profile.equipment;
  const filterExercises = (ids: string[]) =>
    ids.filter(id => {
      const ex = getExerciseById(id);
      if (!ex) return false;
      // Check restrictions (e.g. no_pullup_bar)
      if (profile.restrictions.includes("no_pullup_bar") && ex.tags.includes("pullup")) return false;
      return ex.equipment.some(eq => availableEquipment.includes(eq) || eq === "bodyweight");
    });

  const warmupIds = filterExercises(template.warmup);
  const mainIds = filterExercises(template.main);
  const coreIds = filterExercises(template.core);

  const sections: WorkoutSection[] = [];

  // Warmup section
  if (warmupIds.length > 0) {
    sections.push({
      label: "Calentamiento — 5 min",
      exercises: warmupIds.map(id => ({
        exercise: EXERCISE_DB[id],
        scheme: { type: "reps", sets: 2, reps: 15 },
        restSeconds: 0,
        notes: "Activación — no es trabajo principal",
      })),
    });
  }

  // Main section (or circuit for full_body)
  const mainLabel =
    template.focus === "full_body"
      ? `Circuito — ${vol.circuitRounds} rondas · ${vol.restSeconds}s descanso entre rondas`
      : template.focus === "upper"
      ? "Supersets antagonistas — A+B sin descanso"
      : "Bloque principal";

  sections.push({
    label: mainLabel,
    exercises: mainIds.map(id => {
      const ex = EXERCISE_DB[id];
      const paired = SUPERSET_PAIRS[id];
      return {
        exercise: ex,
        scheme: buildScheme(id, profile, weekNumber, template.focus),
        restSeconds: buildRest(id, template.focus, profile, weekNumber),
        pairedWith: paired || undefined,
        isNew: weekNumber > 1 && ex?.tags.includes("new"),
      };
    }),
  });

  // Core section
  if (coreIds.length > 0) {
    sections.push({
      label: "Core crusher",
      exercises: coreIds.map(id => ({
        exercise: EXERCISE_DB[id],
        scheme: buildScheme(id, profile, weekNumber, "core" as DayFocus),
        restSeconds: 45,
      })),
    });
  }

  return {
    dayNumber,
    focus: template.focus,
    title: template.title,
    subtitle: template.subtitle,
    sections,
    progressionNotes: buildProgressionNotes(template.focus, weekNumber),
    estimatedMinutes: template.estimatedMinutes + (weekNumber - 1) * 5,
  };
}

// ─── Progression notes generator ─────────────────────────────

function buildProgressionNotes(focus: DayFocus, week: number): string {
  const notes: Record<DayFocus, string[]> = {
    push: [
      "Consolida el volumen — enfoca la forma",
      "Agrega 1 rep por serie en empujes principales",
      "Agrega 1 serie en el ejercicio más fácil del día",
      "Añade pausa de 2s en el pecho en push-up",
    ],
    pull: [
      "Consolida — retracción escápular en cada rep",
      "Sube 10 lbs en row y pulldown",
      "Agrega pausa de 1s en contracción de curl",
      "Agrega 1 serie en row principal",
    ],
    legs: [
      "Consolida el volumen — enfoca la profundidad",
      "BSS: añade pausa de 2s abajo; squat: añade banda",
      "BSS pausa 3s; wall sit +15s; calf raise añade banda",
      "Añade 5ª serie en todo el bloque A",
    ],
    upper: [
      "Consolida los supersets — mantén la forma en series finales",
      "Reduce el descanso entre supersets a 75s",
      "Agrega 1 serie en todos los supersets",
      "Reduce descanso a 60s y considera aumentar la carga en banda",
    ],
    full_body: [
      "Aprende la secuencia del circuito — ritmo constante",
      "Reduce descanso entre rondas 15s",
      "Añade 1 ronda al circuito",
      "Añade 2 reps en cada ejercicio del circuito",
    ],
  };

  const weekIndex = Math.min(week - 1, 3);
  return notes[focus][weekIndex] ?? notes[focus][3];
}

// ─── Weekly plan builder (rules only) ────────────────────────

export function buildWeeklyPlan(
  profile: UserProfile,
  weekNumber: number = 1
): WeeklyPlan {
  const days = DAY_TEMPLATES.slice(0, profile.daysPerWeek).map((template, i) =>
    buildDay(template, i + 1, profile, weekNumber)
  );

  return {
    weekNumber,
    days,
    generatedBy: "rules",
    userProfile: profile,
    createdAt: new Date().toISOString(),
  };
}

// ─── Progression builder ─────────────────────────────────────
// Takes previous week + feedback and returns a new week

export function buildProgressedPlan(ctx: ProgressionContext): WeeklyPlan {
  const { weekNumber, previousPlan, userFeedback } = ctx;

  // Adjust volume tolerance based on feedback
  let effectiveProfile = { ...previousPlan.userProfile };

  if (userFeedback.volumeFeeling === "easy") {
    const levels: UserProfile["volumeTolerance"][] = ["low", "medium", "high", "very_high"];
    const currentIdx = levels.indexOf(effectiveProfile.volumeTolerance);
    if (currentIdx < levels.length - 1) {
      effectiveProfile.volumeTolerance = levels[currentIdx + 1];
    }
  } else if (userFeedback.volumeFeeling === "too_hard") {
    const levels: UserProfile["volumeTolerance"][] = ["low", "medium", "high", "very_high"];
    const currentIdx = levels.indexOf(effectiveProfile.volumeTolerance);
    if (currentIdx > 0) {
      effectiveProfile.volumeTolerance = levels[currentIdx - 1];
    }
  }

  effectiveProfile.previousWeekCompleted = userFeedback.completedAllDays;
  effectiveProfile.previousWeekPerformance = userFeedback.volumeFeeling;

  const plan = buildWeeklyPlan(effectiveProfile, weekNumber);

  return {
    ...plan,
    generatedBy: "rules",
  };
}

// ─── Prompt builder (for Claude hybrid mode) ─────────────────
// Returns the system + user prompts to send to the Claude API

export function buildClaudePrompt(
  rulesPlan: WeeklyPlan,
  userFeedback?: {
    completedAllDays: boolean;
    volumeFeeling: "easy" | "correct" | "too_hard";
    exerciseNotes?: Record<string, string>;
    adjustments?: Array<{ exerciseId: string; skipped?: boolean; actualReps?: number; reason?: string }>;
  }
): { system: string; user: string } {
  const profile = rulesPlan.userProfile;

  const system = `You are an expert personal trainer specializing in resistance band and bodyweight training programs.
You will receive a rules-based workout plan and user feedback, then output a refined JSON plan.

OUTPUT FORMAT: Respond ONLY with a valid JSON object matching this schema — no preamble, no markdown, no explanation:
{
  "days": [ ...WorkoutDay array ],
  "rationale": "string — 2-3 sentences explaining key changes",
  "progressionHighlights": ["string", "string", "string"]
}

Each day in "days" must match this structure exactly:
{
  "dayNumber": number,
  "focus": "push" | "pull" | "legs" | "upper" | "full_body",
  "title": "string",
  "subtitle": "string",
  "sections": [
    {
      "label": "string",
      "exercises": [
        {
          "exerciseId": "string (from DB)",
          "sets": number,
          "reps": number | null,
          "seconds": number | null,
          "repsPerSide": boolean,
          "restSeconds": number,
          "notes": "string | null",
          "pairedWith": "string | null",
          "isNew": boolean
        }
      ]
    }
  ],
  "progressionNotes": "string",
  "estimatedMinutes": number
}

Exercise IDs must exist in the exercise database. Do not invent new IDs.
Available exercise IDs: ${Object.keys(EXERCISE_DB).join(", ")}`;

  const planSummary = rulesPlan.days.map(day => ({
    dayNumber: day.dayNumber,
    focus: day.focus,
    exercises: day.sections.flatMap(s =>
      s.exercises.map(e => ({
        id: e.exercise.id,
        scheme: e.scheme,
        notes: e.notes,
      }))
    ),
  }));

  const user = `User profile:
- Level: ${profile.level}
- Volume tolerance: ${profile.volumeTolerance}
- Equipment: ${profile.equipment.join(", ")}
- Restrictions: ${profile.restrictions.join(", ") || "none"}
- Days per week: ${profile.daysPerWeek}
- Week number: ${rulesPlan.weekNumber}
${profile.focusPriority?.length ? `- Priority muscles: ${profile.focusPriority.join(", ")}` : ""}

${userFeedback ? `User feedback from last week:
- Completed all days: ${userFeedback.completedAllDays}
- Volume feeling: ${userFeedback.volumeFeeling}
${userFeedback.exerciseNotes ? `- Notes: ${JSON.stringify(userFeedback.exerciseNotes)}` : ""}
${userFeedback.adjustments?.length ? `- Skipped/adjusted: ${JSON.stringify(userFeedback.adjustments)}` : ""}
` : ""}

Rules-based plan generated for this week:
${JSON.stringify(planSummary, null, 2)}

Instructions:
1. Keep the same 5-day split structure (push/pull/legs/upper/full_body)
2. Respect the user's volume tolerance and level
3. Apply appropriate progression from last week if feedback shows it was easy
4. Replace or add exercises if user skipped specific ones repeatedly
5. Ensure the exercise IDs you use exist in the available IDs list above
6. For week ${rulesPlan.weekNumber}: ${rulesPlan.weekNumber > 3 ? "consider a deload if needed" : "progress volume and/or intensity"}
7. Prioritize compound movements and maintain push/pull balance
8. Return the refined JSON plan`;

  return { system, user };
}

// ─── Serialization helpers ────────────────────────────────────

export function schemeToString(scheme: SetScheme): string {
  switch (scheme.type) {
    case "reps":
      return Array.isArray(scheme.reps)
        ? `${scheme.sets} × ${scheme.reps[0]}–${scheme.reps[1]}`
        : `${scheme.sets} × ${scheme.reps}`;
    case "reps_per_side":
      return `${scheme.sets} × ${scheme.reps} c/lado`;
    case "time":
      return `${scheme.sets} × ${scheme.seconds}s`;
    case "amrap":
      return `${scheme.sets} × AMRAP`;
  }
}
