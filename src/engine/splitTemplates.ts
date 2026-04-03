import type { MovementCategory } from '../types';

/**
 * A slot in a training day template.
 * The engine picks an exercise from the user's library matching the category.
 */
export interface ExerciseSlot {
  category: MovementCategory;
  role: 'primary' | 'secondary' | 'accessory';
  /** If set, prefer this specific exercise name */
  preferredExercise?: string;
}

export interface DayTemplate {
  name: string;
  slots: ExerciseSlot[];
}

export interface SplitTemplate {
  type: string;
  label: string;
  days: DayTemplate[];
}

// ─── 3-Day Full Body ──────────────────────────────────────
const FULL_BODY_3: SplitTemplate = {
  type: 'full_body_3',
  label: 'Full Body — 3 Days',
  days: [
    {
      name: 'Full Body A',
      slots: [
        { category: 'QUAD_DOMINANT', role: 'primary', preferredExercise: 'Barbell Back Squat' },
        { category: 'PUSH_HORIZONTAL', role: 'primary', preferredExercise: 'Barbell Bench Press' },
        { category: 'PULL_HORIZONTAL', role: 'primary', preferredExercise: 'Barbell Bent Over Row' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Lateral Raise (DB)' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Barbell Curl' },
        { category: 'CORE', role: 'accessory', preferredExercise: 'Cable Crunch' },
      ],
    },
    {
      name: 'Full Body B',
      slots: [
        { category: 'POSTERIOR_CHAIN', role: 'primary', preferredExercise: 'Conventional Deadlift' },
        { category: 'PUSH_VERTICAL', role: 'primary', preferredExercise: 'Barbell OHP' },
        { category: 'PULL_VERTICAL', role: 'primary', preferredExercise: 'Lat Pulldown (Bar)' },
        { category: 'QUAD_DOMINANT', role: 'secondary', preferredExercise: 'Leg Press' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Tricep Pushdown' },
        { category: 'CALVES', role: 'accessory', preferredExercise: 'Standing Calf Raise' },
      ],
    },
    {
      name: 'Full Body C',
      slots: [
        { category: 'QUAD_DOMINANT', role: 'primary', preferredExercise: 'Barbell Front Squat' },
        { category: 'PUSH_HORIZONTAL', role: 'primary', preferredExercise: 'Incline Barbell Press' },
        { category: 'PULL_HORIZONTAL', role: 'primary', preferredExercise: 'Cable Row (Seated)' },
        { category: 'POSTERIOR_CHAIN', role: 'secondary', preferredExercise: 'Romanian Deadlift' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Face Pull' },
        { category: 'CORE', role: 'accessory', preferredExercise: 'Hanging Leg Raise' },
      ],
    },
  ],
};

// ─── 4-Day Upper/Lower ────────────────────────────────────
const UPPER_LOWER_4: SplitTemplate = {
  type: 'upper_lower_4',
  label: 'Upper / Lower — 4 Days',
  days: [
    {
      name: 'Upper — Push Focus',
      slots: [
        { category: 'PUSH_HORIZONTAL', role: 'primary', preferredExercise: 'Barbell Bench Press' },
        { category: 'PULL_HORIZONTAL', role: 'primary', preferredExercise: 'Barbell Bent Over Row' },
        { category: 'PUSH_VERTICAL', role: 'secondary', preferredExercise: 'Barbell OHP' },
        { category: 'PUSH_HORIZONTAL', role: 'accessory', preferredExercise: 'Cable Fly' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Lateral Raise (DB)' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Tricep Pushdown' },
      ],
    },
    {
      name: 'Lower — Quad Focus',
      slots: [
        { category: 'QUAD_DOMINANT', role: 'primary', preferredExercise: 'Barbell Back Squat' },
        { category: 'POSTERIOR_CHAIN', role: 'secondary', preferredExercise: 'Romanian Deadlift' },
        { category: 'QUAD_DOMINANT', role: 'secondary', preferredExercise: 'Leg Press' },
        { category: 'POSTERIOR_CHAIN', role: 'accessory', preferredExercise: 'Leg Curl (Seated)' },
        { category: 'CALVES', role: 'accessory', preferredExercise: 'Standing Calf Raise' },
        { category: 'CORE', role: 'accessory', preferredExercise: 'Cable Crunch' },
      ],
    },
    {
      name: 'Upper — Pull Focus',
      slots: [
        { category: 'PULL_VERTICAL', role: 'primary', preferredExercise: 'Weighted Pull Up' },
        { category: 'PUSH_HORIZONTAL', role: 'primary', preferredExercise: 'Incline Dumbbell Press' },
        { category: 'PULL_HORIZONTAL', role: 'secondary', preferredExercise: 'Cable Row (Seated)' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Face Pull' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Rear Delt Fly (DB)' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Barbell Curl' },
      ],
    },
    {
      name: 'Lower — Hinge Focus',
      slots: [
        { category: 'POSTERIOR_CHAIN', role: 'primary', preferredExercise: 'Conventional Deadlift' },
        { category: 'QUAD_DOMINANT', role: 'secondary', preferredExercise: 'Bulgarian Split Squat' },
        { category: 'POSTERIOR_CHAIN', role: 'secondary', preferredExercise: 'Hip Thrust (Barbell)' },
        { category: 'QUAD_DOMINANT', role: 'accessory', preferredExercise: 'Leg Extension' },
        { category: 'CALVES', role: 'accessory', preferredExercise: 'Seated Calf Raise' },
        { category: 'CORE', role: 'accessory', preferredExercise: 'Hanging Leg Raise' },
      ],
    },
  ],
};

// ─── 5-Day Push/Pull/Legs ─────────────────────────────────
const PPL_5: SplitTemplate = {
  type: 'ppl_5',
  label: 'Push / Pull / Legs — 5 Days',
  days: [
    {
      name: 'Push A',
      slots: [
        { category: 'PUSH_HORIZONTAL', role: 'primary', preferredExercise: 'Barbell Bench Press' },
        { category: 'PUSH_VERTICAL', role: 'secondary', preferredExercise: 'Barbell OHP' },
        { category: 'PUSH_HORIZONTAL', role: 'secondary', preferredExercise: 'Incline Dumbbell Press' },
        { category: 'PUSH_HORIZONTAL', role: 'accessory', preferredExercise: 'Cable Fly' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Lateral Raise (DB)' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Tricep Pushdown' },
      ],
    },
    {
      name: 'Pull A',
      slots: [
        { category: 'POSTERIOR_CHAIN', role: 'primary', preferredExercise: 'Conventional Deadlift' },
        { category: 'PULL_HORIZONTAL', role: 'primary', preferredExercise: 'Barbell Bent Over Row' },
        { category: 'PULL_VERTICAL', role: 'secondary', preferredExercise: 'Lat Pulldown (Bar)' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Face Pull' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Rear Delt Fly (DB)' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Barbell Curl' },
      ],
    },
    {
      name: 'Legs',
      slots: [
        { category: 'QUAD_DOMINANT', role: 'primary', preferredExercise: 'Barbell Back Squat' },
        { category: 'POSTERIOR_CHAIN', role: 'secondary', preferredExercise: 'Romanian Deadlift' },
        { category: 'QUAD_DOMINANT', role: 'secondary', preferredExercise: 'Leg Press' },
        { category: 'POSTERIOR_CHAIN', role: 'accessory', preferredExercise: 'Leg Curl (Seated)' },
        { category: 'QUAD_DOMINANT', role: 'accessory', preferredExercise: 'Leg Extension' },
        { category: 'CALVES', role: 'accessory', preferredExercise: 'Standing Calf Raise' },
      ],
    },
    {
      name: 'Push B',
      slots: [
        { category: 'PUSH_VERTICAL', role: 'primary', preferredExercise: 'Barbell OHP' },
        { category: 'PUSH_HORIZONTAL', role: 'secondary', preferredExercise: 'Dumbbell Bench Press' },
        { category: 'PUSH_HORIZONTAL', role: 'secondary', preferredExercise: 'Incline Barbell Press' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Lateral Raise (Cable)' },
        { category: 'PUSH_HORIZONTAL', role: 'accessory', preferredExercise: 'Pec Dec' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Overhead Tricep Extension' },
      ],
    },
    {
      name: 'Pull B',
      slots: [
        { category: 'PULL_VERTICAL', role: 'primary', preferredExercise: 'Weighted Pull Up' },
        { category: 'PULL_HORIZONTAL', role: 'primary', preferredExercise: 'Cable Row (Seated)' },
        { category: 'PULL_HORIZONTAL', role: 'secondary', preferredExercise: 'Dumbbell Row' },
        { category: 'PULL_VERTICAL', role: 'accessory', preferredExercise: 'Straight Arm Pulldown' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Rear Delt Fly (Machine)' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Hammer Curl' },
      ],
    },
  ],
};

// ─── 6-Day PPL×2 ──────────────────────────────────────────
const PPL_6: SplitTemplate = {
  type: 'ppl_6',
  label: 'Push / Pull / Legs ×2 — 6 Days',
  days: [
    ...PPL_5.days.slice(0, 3).map(d => ({ ...d })), // Push A, Pull A, Legs
    {
      name: 'Push B',
      slots: [
        { category: 'PUSH_VERTICAL', role: 'primary', preferredExercise: 'Barbell OHP' },
        { category: 'PUSH_HORIZONTAL', role: 'secondary', preferredExercise: 'Dumbbell Bench Press' },
        { category: 'PUSH_HORIZONTAL', role: 'secondary', preferredExercise: 'Incline Barbell Press' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Lateral Raise (Cable)' },
        { category: 'PUSH_HORIZONTAL', role: 'accessory', preferredExercise: 'Pec Dec' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Overhead Tricep Extension' },
      ],
    },
    {
      name: 'Pull B',
      slots: [
        { category: 'PULL_VERTICAL', role: 'primary', preferredExercise: 'Weighted Pull Up' },
        { category: 'PULL_HORIZONTAL', role: 'primary', preferredExercise: 'Cable Row (Seated)' },
        { category: 'PULL_HORIZONTAL', role: 'secondary', preferredExercise: 'Dumbbell Row' },
        { category: 'PULL_VERTICAL', role: 'accessory', preferredExercise: 'Straight Arm Pulldown' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Rear Delt Fly (Machine)' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Hammer Curl' },
      ],
    },
    {
      name: 'Legs B',
      slots: [
        { category: 'POSTERIOR_CHAIN', role: 'primary', preferredExercise: 'Conventional Deadlift' },
        { category: 'QUAD_DOMINANT', role: 'secondary', preferredExercise: 'Bulgarian Split Squat' },
        { category: 'POSTERIOR_CHAIN', role: 'secondary', preferredExercise: 'Hip Thrust (Barbell)' },
        { category: 'QUAD_DOMINANT', role: 'accessory', preferredExercise: 'Leg Extension' },
        { category: 'POSTERIOR_CHAIN', role: 'accessory', preferredExercise: 'Leg Curl (Lying)' },
        { category: 'CALVES', role: 'accessory', preferredExercise: 'Seated Calf Raise' },
      ],
    },
  ],
};

// ─── 2-Day Full Body (minimalist) ─────────────────────────
const FULL_BODY_2: SplitTemplate = {
  type: 'full_body_2',
  label: 'Full Body — 2 Days',
  days: [
    {
      name: 'Full Body A',
      slots: [
        { category: 'QUAD_DOMINANT', role: 'primary', preferredExercise: 'Barbell Back Squat' },
        { category: 'PUSH_HORIZONTAL', role: 'primary', preferredExercise: 'Barbell Bench Press' },
        { category: 'PULL_HORIZONTAL', role: 'primary', preferredExercise: 'Barbell Bent Over Row' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Lateral Raise (DB)' },
        { category: 'CORE', role: 'accessory', preferredExercise: 'Hanging Leg Raise' },
      ],
    },
    {
      name: 'Full Body B',
      slots: [
        { category: 'POSTERIOR_CHAIN', role: 'primary', preferredExercise: 'Conventional Deadlift' },
        { category: 'PUSH_VERTICAL', role: 'primary', preferredExercise: 'Barbell OHP' },
        { category: 'PULL_VERTICAL', role: 'primary', preferredExercise: 'Lat Pulldown (Bar)' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Barbell Curl' },
        { category: 'CALVES', role: 'accessory', preferredExercise: 'Standing Calf Raise' },
      ],
    },
  ],
};

/**
 * Returns the appropriate split template based on the number of training days.
 */
export function getSplitTemplate(days: number): SplitTemplate {
  switch (days) {
    case 2: return FULL_BODY_2;
    case 3: return FULL_BODY_3;
    case 4: return UPPER_LOWER_4;
    case 5: return PPL_5;
    case 6: return PPL_6;
    default: return UPPER_LOWER_4;
  }
}

export { FULL_BODY_2, FULL_BODY_3, UPPER_LOWER_4, PPL_5, PPL_6 };
