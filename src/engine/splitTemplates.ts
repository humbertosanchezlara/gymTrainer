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
  label: 'Cuerpo Completo — 3 Días',
  days: [
    {
      name: 'Cuerpo Completo A',
      slots: [
        { category: 'QUAD_DOMINANT', role: 'primary', preferredExercise: 'Barra Back Squat' },
        { category: 'PUSH_HORIZONTAL', role: 'primary', preferredExercise: 'Barra Press de Banca' },
        { category: 'PULL_HORIZONTAL', role: 'primary', preferredExercise: 'Barra Remo Inclinado' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Elevación Lateral (MC)' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Barra Curl' },
        { category: 'CORE', role: 'accessory', preferredExercise: 'Crunch en Cable' },
      ],
    },
    {
      name: 'Cuerpo Completo B',
      slots: [
        { category: 'POSTERIOR_CHAIN', role: 'primary', preferredExercise: 'Peso Muerto Convencional' },
        { category: 'PUSH_VERTICAL', role: 'primary', preferredExercise: 'Barra Press Militar' },
        { category: 'PULL_VERTICAL', role: 'primary', preferredExercise: 'Jalón al Pecho (Barra)' },
        { category: 'QUAD_DOMINANT', role: 'secondary', preferredExercise: 'Prensa de Piernas' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Extensión Tríceps Cable' },
        { category: 'CALVES', role: 'accessory', preferredExercise: 'Elevación Talones de Pie' },
      ],
    },
    {
      name: 'Cuerpo Completo C',
      slots: [
        { category: 'QUAD_DOMINANT', role: 'primary', preferredExercise: 'Barra Front Squat' },
        { category: 'PUSH_HORIZONTAL', role: 'primary', preferredExercise: 'Barra Press Inclinado' },
        { category: 'PULL_HORIZONTAL', role: 'primary', preferredExercise: 'Remo en Cable (Sentado)' },
        { category: 'POSTERIOR_CHAIN', role: 'secondary', preferredExercise: 'Peso Muerto Rumano' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Jalón al Cuello Cable' },
        { category: 'CORE', role: 'accessory', preferredExercise: 'Elevación Piernas Colgado' },
      ],
    },
  ],
};

// ─── 4-Day Upper/Lower ────────────────────────────────────
const UPPER_LOWER_4: SplitTemplate = {
  type: 'upper_lower_4',
  label: 'Superior / Inferior — 4 Días',
  days: [
    {
      name: 'Superior — Énfasis Empuje',
      slots: [
        { category: 'PUSH_HORIZONTAL', role: 'primary', preferredExercise: 'Barra Press de Banca' },
        { category: 'PULL_HORIZONTAL', role: 'primary', preferredExercise: 'Barra Remo Inclinado' },
        { category: 'PUSH_VERTICAL', role: 'secondary', preferredExercise: 'Barra Press Militar' },
        { category: 'PUSH_HORIZONTAL', role: 'accessory', preferredExercise: 'Aperturas en Cable' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Elevación Lateral (MC)' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Extensión Tríceps Cable' },
      ],
    },
    {
      name: 'Inferior — Énfasis Cuádriceps',
      slots: [
        { category: 'QUAD_DOMINANT', role: 'primary', preferredExercise: 'Barra Back Squat' },
        { category: 'POSTERIOR_CHAIN', role: 'secondary', preferredExercise: 'Peso Muerto Rumano' },
        { category: 'QUAD_DOMINANT', role: 'secondary', preferredExercise: 'Prensa de Piernas' },
        { category: 'POSTERIOR_CHAIN', role: 'accessory', preferredExercise: 'Curl Femoral (Sentado)' },
        { category: 'CALVES', role: 'accessory', preferredExercise: 'Elevación Talones de Pie' },
        { category: 'CORE', role: 'accessory', preferredExercise: 'Crunch en Cable' },
      ],
    },
    {
      name: 'Superior — Énfasis Jalón',
      slots: [
        { category: 'PULL_VERTICAL', role: 'primary', preferredExercise: 'Dominadas con Lastre' },
        { category: 'PUSH_HORIZONTAL', role: 'primary', preferredExercise: 'Mancuerna Press Inclinado' },
        { category: 'PULL_HORIZONTAL', role: 'secondary', preferredExercise: 'Remo en Cable (Sentado)' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Jalón al Cuello Cable' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Pájaro (MC)' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Barra Curl' },
      ],
    },
    {
      name: 'Inferior — Énfasis Bisagra',
      slots: [
        { category: 'POSTERIOR_CHAIN', role: 'primary', preferredExercise: 'Peso Muerto Convencional' },
        { category: 'QUAD_DOMINANT', role: 'secondary', preferredExercise: 'Sentadilla Búlgara' },
        { category: 'POSTERIOR_CHAIN', role: 'secondary', preferredExercise: 'Hip Thrust (Barra)' },
        { category: 'QUAD_DOMINANT', role: 'accessory', preferredExercise: 'Extensión de Pierna' },
        { category: 'CALVES', role: 'accessory', preferredExercise: 'Elevación Talones Sentado' },
        { category: 'CORE', role: 'accessory', preferredExercise: 'Elevación Piernas Colgado' },
      ],
    },
  ],
};

// ─── 5-Day Push/Pull/Legs ─────────────────────────────────
const PPL_5: SplitTemplate = {
  type: 'ppl_5',
  label: 'Empuje / Jalón / Piernas — 5 Días',
  days: [
    {
      name: 'Empuje A',
      slots: [
        { category: 'PUSH_HORIZONTAL', role: 'primary', preferredExercise: 'Barra Press de Banca' },
        { category: 'PUSH_VERTICAL', role: 'secondary', preferredExercise: 'Barra Press Militar' },
        { category: 'PUSH_HORIZONTAL', role: 'secondary', preferredExercise: 'Mancuerna Press Inclinado' },
        { category: 'PUSH_HORIZONTAL', role: 'accessory', preferredExercise: 'Aperturas en Cable' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Elevación Lateral (MC)' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Extensión Tríceps Cable' },
      ],
    },
    {
      name: 'Jalón A',
      slots: [
        { category: 'POSTERIOR_CHAIN', role: 'primary', preferredExercise: 'Peso Muerto Convencional' },
        { category: 'PULL_HORIZONTAL', role: 'primary', preferredExercise: 'Barra Remo Inclinado' },
        { category: 'PULL_VERTICAL', role: 'secondary', preferredExercise: 'Jalón al Pecho (Barra)' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Jalón al Cuello Cable' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Pájaro (MC)' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Barra Curl' },
      ],
    },
    {
      name: 'Piernas',
      slots: [
        { category: 'QUAD_DOMINANT', role: 'primary', preferredExercise: 'Barra Back Squat' },
        { category: 'POSTERIOR_CHAIN', role: 'secondary', preferredExercise: 'Peso Muerto Rumano' },
        { category: 'QUAD_DOMINANT', role: 'secondary', preferredExercise: 'Prensa de Piernas' },
        { category: 'POSTERIOR_CHAIN', role: 'accessory', preferredExercise: 'Curl Femoral (Sentado)' },
        { category: 'QUAD_DOMINANT', role: 'accessory', preferredExercise: 'Extensión de Pierna' },
        { category: 'CALVES', role: 'accessory', preferredExercise: 'Elevación Talones de Pie' },
      ],
    },
    {
      name: 'Empuje B',
      slots: [
        { category: 'PUSH_VERTICAL', role: 'primary', preferredExercise: 'Barra Press Militar' },
        { category: 'PUSH_HORIZONTAL', role: 'secondary', preferredExercise: 'Mancuerna Press de Banca' },
        { category: 'PUSH_HORIZONTAL', role: 'secondary', preferredExercise: 'Barra Press Inclinado' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Elevación Lateral (Cable)' },
        { category: 'PUSH_HORIZONTAL', role: 'accessory', preferredExercise: 'Pec Dec' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Extensión Tríceps sobre Cabeza' },
      ],
    },
    {
      name: 'Jalón B',
      slots: [
        { category: 'PULL_VERTICAL', role: 'primary', preferredExercise: 'Dominadas con Lastre' },
        { category: 'PULL_HORIZONTAL', role: 'primary', preferredExercise: 'Remo en Cable (Sentado)' },
        { category: 'PULL_HORIZONTAL', role: 'secondary', preferredExercise: 'Mancuerna Remo' },
        { category: 'PULL_VERTICAL', role: 'accessory', preferredExercise: 'Jalón Brazos Rectos' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Pájaro en Máquina' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Curl Martillo' },
      ],
    },
  ],
};

// ─── 6-Day PPL×2 ──────────────────────────────────────────
const PPL_6: SplitTemplate = {
  type: 'ppl_6',
  label: 'Empuje / Jalón / Piernas ×2 — 6 Días',
  days: [
    ...PPL_5.days.slice(0, 3).map(d => ({ ...d })), // Empuje A, Jalón A, Piernas
    {
      name: 'Empuje B',
      slots: [
        { category: 'PUSH_VERTICAL', role: 'primary', preferredExercise: 'Barra Press Militar' },
        { category: 'PUSH_HORIZONTAL', role: 'secondary', preferredExercise: 'Mancuerna Press de Banca' },
        { category: 'PUSH_HORIZONTAL', role: 'secondary', preferredExercise: 'Barra Press Inclinado' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Elevación Lateral (Cable)' },
        { category: 'PUSH_HORIZONTAL', role: 'accessory', preferredExercise: 'Pec Dec' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Extensión Tríceps sobre Cabeza' },
      ],
    },
    {
      name: 'Jalón B',
      slots: [
        { category: 'PULL_VERTICAL', role: 'primary', preferredExercise: 'Dominadas con Lastre' },
        { category: 'PULL_HORIZONTAL', role: 'primary', preferredExercise: 'Remo en Cable (Sentado)' },
        { category: 'PULL_HORIZONTAL', role: 'secondary', preferredExercise: 'Mancuerna Remo' },
        { category: 'PULL_VERTICAL', role: 'accessory', preferredExercise: 'Jalón Brazos Rectos' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Pájaro en Máquina' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Curl Martillo' },
      ],
    },
    {
      name: 'Piernas B',
      slots: [
        { category: 'POSTERIOR_CHAIN', role: 'primary', preferredExercise: 'Peso Muerto Convencional' },
        { category: 'QUAD_DOMINANT', role: 'secondary', preferredExercise: 'Sentadilla Búlgara' },
        { category: 'POSTERIOR_CHAIN', role: 'secondary', preferredExercise: 'Hip Thrust (Barra)' },
        { category: 'QUAD_DOMINANT', role: 'accessory', preferredExercise: 'Extensión de Pierna' },
        { category: 'POSTERIOR_CHAIN', role: 'accessory', preferredExercise: 'Curl Femoral (Tumbado)' },
        { category: 'CALVES', role: 'accessory', preferredExercise: 'Elevación Talones Sentado' },
      ],
    },
  ],
};

// ─── 2-Day Full Body (minimalist) ─────────────────────────
const FULL_BODY_2: SplitTemplate = {
  type: 'full_body_2',
  label: 'Cuerpo Completo — 2 Días',
  days: [
    {
      name: 'Cuerpo Completo A',
      slots: [
        { category: 'QUAD_DOMINANT', role: 'primary', preferredExercise: 'Barra Back Squat' },
        { category: 'PUSH_HORIZONTAL', role: 'primary', preferredExercise: 'Barra Press de Banca' },
        { category: 'PULL_HORIZONTAL', role: 'primary', preferredExercise: 'Barra Remo Inclinado' },
        { category: 'PUSH_VERTICAL', role: 'accessory', preferredExercise: 'Elevación Lateral (MC)' },
        { category: 'CORE', role: 'accessory', preferredExercise: 'Elevación Piernas Colgado' },
      ],
    },
    {
      name: 'Cuerpo Completo B',
      slots: [
        { category: 'POSTERIOR_CHAIN', role: 'primary', preferredExercise: 'Peso Muerto Convencional' },
        { category: 'PUSH_VERTICAL', role: 'primary', preferredExercise: 'Barra Press Militar' },
        { category: 'PULL_VERTICAL', role: 'primary', preferredExercise: 'Jalón al Pecho (Barra)' },
        { category: 'ARMS', role: 'accessory', preferredExercise: 'Barra Curl' },
        { category: 'CALVES', role: 'accessory', preferredExercise: 'Elevación Talones de Pie' },
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
