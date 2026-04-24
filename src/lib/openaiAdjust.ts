import OpenAI from 'openai';

export interface SessionAdjustment {
  type: 'deload' | 'reduce_time' | 'swap_exercise' | 'swap_specific' | 'general';
  weightScale?: number;
  rpeDelta?: number;
  maxExercises?: number;
  targetExerciseName?: string;
  reason: string;
  details: string;
}

const SYSTEM_PROMPT = `Eres un entrenador personal experto. El usuario te describe su estado antes de entrenar y tú decides cómo ajustar la sesión.

Responde SOLO con un array JSON de ajustes. Cada ajuste tiene esta forma:
{
  "type": "deload" | "reduce_time" | "swap_exercise" | "swap_specific" | "general",
  "weightScale": 0.80,     // solo para deload/general: factor multiplicador de peso (0.5–1.0)
  "rpeDelta": -1.5,        // solo para deload/general: delta de RPE (-3 a 0)
  "maxExercises": 4,       // solo para reduce_time: número máximo de ejercicios
  "targetExerciseName": "Sentadilla con barra",  // solo para swap_specific: nombre exacto del ejercicio a sustituir
  "reason": "Fatiga detectada",  // título corto
  "details": "Peso reducido 20%, RPE -1.5 por descanso insuficiente."  // explicación para el usuario
}

Reglas:
- Si hay fatiga severa (≤4h sueño, "muy cansado", "agotado"): weightScale=0.75, rpeDelta=-1.5
- Si hay fatiga moderada (5h sueño, "poco descansado"): weightScale=0.80, rpeDelta=-1
- Si hay dolor o lesión: weightScale=0.70, rpeDelta=-2
- Si hay poco tiempo: reduce_time con maxExercises según los minutos disponibles (minutos-5)/7 redondeado, mínimo 3
- Si piden cambiar un ejercicio específico: swap_specific con targetExerciseName
- Si falta equipamiento genérico: swap_exercise
- Si el mensaje no encaja en nada claro: general con weightScale=0.90, rpeDelta=-1
- Devuelve SOLO el array JSON, sin texto adicional.`;

export async function parseAdjustmentWithAI(
  userMessage: string,
  exerciseNames: string[],
): Promise<SessionAdjustment[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('VITE_OPENAI_API_KEY no configurada');

  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const contextLine = exerciseNames.length > 0
    ? `\nEjercicios de la sesión de hoy: ${exerciseNames.join(', ')}`
    : '';

  const resp = await client.chat.completions.create({
    model: 'gpt-5.4-mini',
    max_tokens: 512,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `${userMessage}${contextLine}\n\nDevuelve: { "adjustments": [...] }`,
      },
    ],
  });

  const text = resp.choices[0]?.message?.content ?? '{"adjustments":[]}';
  const parsed = JSON.parse(text) as { adjustments: SessionAdjustment[] };
  const adjustments = parsed.adjustments;

  if (!Array.isArray(adjustments) || adjustments.length === 0) {
    return [{
      type: 'general',
      weightScale: 0.90,
      rpeDelta: -1,
      reason: 'Ajuste general',
      details: 'Se aplicó una reducción moderada: peso -10%, RPE -1.',
    }];
  }

  return adjustments;
}
