// ─── Gym-specific progression notes per block/week ───────────
// Each key maps a DayFocus string to 4 notes, one per training block:
//   [0] Volumen (wks 1-4)  [1] Intensidad (5-8)  [2] Pico (9-11)  [3] Descarga (12)

const GYM_PROGRESSION_NOTES: Record<string, string[]> = {
  push: [
    'Técnica primero — excéntrico 2s, empuje explosivo. Calibra el peso.',
    '+2.5 kg en press de banca si completaste el tope de reps al RPE objetivo 2 sesiones seguidas.',
    '+1 serie en el primer ejercicio del día; mantén accesorios igual.',
    'Reduce descanso 15s en accesorios; mantén carga en compuestos para el deload.',
  ],
  pull: [
    'Retracción escapular al inicio de cada rep — no uses impulso de espalda baja.',
    '+2.5 kg en remos si completaste el tope de reps 2 sesiones seguidas.',
    '+1 serie en dominadas/jalón si el RPE se sintió bajo la meta.',
    'Pausa 1s en contracción del curl; no subas carga en deload.',
  ],
  legs: [
    'Profundidad antes que carga — paralelo o más abajo en sentadilla.',
    '+5 kg en sentadilla y peso muerto si completaste todas las reps al RPE.',
    '+1 serie en compuesto principal; accesorios igual.',
    'Pausa 2s en el fondo de sentadilla — tensión sin carga adicional.',
  ],
  upper: [
    'Aprende el ritmo de los supersets: A+B sin descanso, luego descansa.',
    'Reduce descanso entre supersets a 75s si te sentiste cómodo.',
    '+2.5 kg en press y remo si RPE ≤ objetivo en ambas series.',
    '+1 serie en todos los supersets.',
  ],
  full_body: [
    'Aprende el orden del día — ejecución limpia antes que carga.',
    'Sube el peso en 1-2 ejercicios donde el RPE fue ≤ 7.',
    '+1 serie en el compound primario de cada grupo muscular.',
    'Reduce descanso 15s en accesorios; mantén compuestos.',
  ],
};

/** Detect the day focus from a day name (Spanish or English) */
function detectFocus(dayName: string): string {
  const n = dayName.toLowerCase();
  if (n.includes('push') || n.includes('empuje')) return 'push';
  if (n.includes('pull') || n.includes('jalón') || n.includes('jalon')) return 'pull';
  if (n.includes('pierna') || n.includes('leg')) return 'legs';
  if (n.includes('superior') || n.includes('upper')) return 'upper';
  return 'full_body';
}

/** Returns the appropriate progression note for a given day name and current week (1-12). */
export function getGymProgressionNote(dayName: string, weekNumber: number): string {
  const focus = detectFocus(dayName);
  const notes = GYM_PROGRESSION_NOTES[focus] ?? GYM_PROGRESSION_NOTES['full_body'];
  // Map week → block index
  const blockIdx =
    weekNumber <= 4  ? 0 :
    weekNumber <= 8  ? 1 :
    weekNumber <= 11 ? 2 : 3;
  return notes[blockIdx];
}
