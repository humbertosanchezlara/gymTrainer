import Anthropic from '@anthropic-ai/sdk';
import type { MovementCategory } from '../types';

export interface ExerciseSearchResult {
  standardized_name: string | null;
  category: MovementCategory;
  instructions: string;
  bw_multiplier: number;
  alternative_names: string[];
}

export async function searchExercise(query: string): Promise<ExerciseSearchResult> {
  const client = new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const resp = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Eres experto en fitness. El usuario quiere añadir este ejercicio a su app de gym: "${query}"

Responde SOLO con JSON válido sin markdown ni backticks:
{
  "standardized_name": "nombre en español natural (ej: 'Máquina Press de Piernas'), o null si no es un ejercicio real de gimnasio",
  "category": "una de: QUAD_DOMINANT, POSTERIOR_CHAIN, PUSH_HORIZONTAL, PUSH_VERTICAL, PULL_HORIZONTAL, PULL_VERTICAL, ARMS, CORE, CALVES",
  "instructions": "2-3 oraciones en español sobre ejecución correcta",
  "bw_multiplier": 0.3,
  "alternative_names": ["nombre alternativo 1"]
}

Categorías: QUAD_DOMINANT=piernas(quad), POSTERIOR_CHAIN=piernas(posterior/glúteo), PUSH_HORIZONTAL=empuje horizontal, PUSH_VERTICAL=empuje vertical/hombros, PULL_HORIZONTAL=jalón/remo horizontal, PULL_VERTICAL=dominadas/jalón vertical, ARMS=bíceps/tríceps, CORE=abdomen/core, CALVES=pantorrillas.
bw_multiplier: peso típico de trabajo de un intermedio dividido entre su peso corporal (0.05–1.5).`,
    }],
  });

  const text = resp.content[0].type === 'text' ? resp.content[0].text.trim() : '{}';
  return JSON.parse(text) as ExerciseSearchResult;
}
