import OpenAI from 'openai';
import type { MovementCategory } from '../types';

export interface ExerciseSearchResult {
  standardized_name: string | null;
  category: MovementCategory;
  instructions: string;
  bw_multiplier: number;
  alternative_names: string[];
}

export async function searchExercise(query: string): Promise<ExerciseSearchResult> {
  const client = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const resp = await client.chat.completions.create({
    model: 'gpt-5.4-mini',
    max_completion_tokens: 512,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'developer',
      content: 'Eres experto en fitness. Respondes SOLO con JSON válido, sin texto adicional.',
    }, {
      role: 'user',
      content: `El usuario quiere añadir este ejercicio a su app de gym: "${query}"

Devuelve un JSON con esta estructura exacta:
{
  "standardized_name": "nombre en español natural (ej: 'Máquina Press de Piernas'), o null si no es un ejercicio real de gimnasio",
  "category": "una de: QUAD_DOMINANT, POSTERIOR_CHAIN, PUSH_HORIZONTAL, PUSH_VERTICAL, PULL_HORIZONTAL, PULL_VERTICAL, ARMS, CORE, CALVES",
  "instructions": "2-3 oraciones en español sobre ejecución correcta",
  "bw_multiplier": 0.3,
  "alternative_names": ["nombre alternativo 1"]
}

Categorías: QUAD_DOMINANT=piernas/cuádriceps, POSTERIOR_CHAIN=isquios/glúteos/cadena posterior, PUSH_HORIZONTAL=press horizontal/pecho, PUSH_VERTICAL=press vertical/hombros, PULL_HORIZONTAL=remo/jalón horizontal, PULL_VERTICAL=dominadas/jalón vertical, ARMS=bíceps/tríceps, CORE=abdomen/core, CALVES=pantorrillas.
bw_multiplier: peso típico de un intermedio dividido entre su peso corporal (0.05–1.5).`,
    }],
  });

  const text = resp.choices[0]?.message?.content ?? '{}';
  return JSON.parse(text) as ExerciseSearchResult;
}
