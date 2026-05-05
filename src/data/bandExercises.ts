// Fuente canónica de ejercicios con banda y peso corporal para el Modo Viaje.
// Este archivo es la fuente de verdad para migration_bands.sql y exerciseCatalog.ts.

import type { MovementCategory } from '../types';

export interface BandExerciseDefinition {
  name: string;          // nombre en español (es la PK en BD)
  category: MovementCategory;
  instructions: string;
  images: string[];
  videoUrl?: string;
}

const YT = 'https://www.youtube.com/results?search_query=';
const youtubeSearch = (query: string) => `${YT}${encodeURIComponent(query)}`;

export const BAND_EXERCISES: BandExerciseDefinition[] = [
  // ─── TREN INFERIOR ──────────────────────────────────────────
  {
    name: 'Sentadilla con Banda',
    category: 'QUAD_DOMINANT',
    instructions:
      'Pisar la banda con ambos pies a la anchura de hombros, pasarla por los hombros al frente y ejecutar la sentadilla.',
    images: [],
  },
  {
    name: 'Desplante Estático con Banda',
    category: 'QUAD_DOMINANT',
    instructions:
      'Pisar la banda con el pie frontal y anclarla en las manos. Bajar de forma controlada y subir empujando el suelo.',
    images: [],
  },
  {
    name: 'Paso Lateral con Banda',
    category: 'QUAD_DOMINANT',
    instructions:
      'Colocar una banda corta encima o debajo de las rodillas y realizar pasos laterales. Mantener la tensión alta.',
    images: [],
  },
  {
    name: 'Peso Muerto Rumano con Banda',
    category: 'POSTERIOR_CHAIN',
    instructions:
      'Pisar la banda y sujetar ambos extremos. Mantener la espalda recta y empujar cadera hacia atrás estirando isquiotibiales.',
    images: [],
  },
  {
    name: 'Puente de Glúteo',
    category: 'POSTERIOR_CHAIN',
    instructions:
      'Acostado boca arriba, elevar la cadera apretando los glúteos arriba. Recomendable pausar 1-2 segundos en la cima.',
    images: [],
  },
  {
    name: 'Elevación de Talones con Banda',
    category: 'CALVES',
    instructions:
      'Pisar la banda y sostener los extremos con las manos a nivel hombro. Elevar sobre las puntas de los pies.',
    images: [],
  },

  // ─── CORE ───────────────────────────────────────────────────
  {
    name: 'Crunch Inverso con Banda',
    category: 'CORE',
    instructions:
      'Acostado boca arriba, ancla la banda detrás de la cabeza o sostenla con las manos para crear tensión. Lleva rodillas hacia el pecho elevando ligeramente la cadera, pausa un momento y baja controlado sin arquear la espalda baja.',
    images: [],
    videoUrl: youtubeSearch('crunch inverso con banda tecnica'),
  },
  {
    name: 'Plancha Lateral',
    category: 'CORE',
    instructions:
      'Sostenerse sobre el antebrazo y borde externo del pie. Abdomen contraído, cadera elevada y hombro lejos de la oreja. Mantén una línea recta de cabeza a pies; si cuesta, apoya rodillas.',
    images: [],
    videoUrl: youtubeSearch('plancha lateral tecnica'),
  },
  {
    name: 'V-Ups Alternos',
    category: 'CORE',
    instructions:
      'Acostado, levantar el tronco y una pierna al mismo tiempo para tocar el pie, alternar pierna.',
    images: [],
  },
  {
    name: 'Bicicleta (Bicycle Crunches)',
    category: 'CORE',
    instructions:
      'Acostado boca arriba, manos detrás de la cabeza sin jalar el cuello. Lleva codo derecho hacia rodilla izquierda mientras extiendes la pierna contraria, alterna lados de forma controlada y mantén la espalda baja estable.',
    images: [],
    videoUrl: youtubeSearch('bicycle crunch tecnica'),
  },
  {
    name: 'Leñador Inverso con Banda (Reverse Wood Chop)',
    category: 'CORE',
    instructions:
      'Ancla la banda abajo y colócate de lado al punto de anclaje. Toma la banda con ambas manos y llévala en diagonal desde abajo hacia arriba, rotando el tronco con control mientras la cadera se mantiene estable. Regresa lento a la posición inicial.',
    images: [],
    videoUrl: youtubeSearch('reverse wood chop band technique'),
  },

  // ─── EMPUJE HORIZONTAL ──────────────────────────────────────
  {
    name: 'Lagartijas / Flexiones (Push-Ups)',
    category: 'PUSH_HORIZONTAL',
    instructions:
      'Manos a lo ancho de los hombros, bajar contrayendo pecho hasta rozar el suelo, empujar de regreso bloqueando el core.',
    images: [],
  },
  {
    name: 'Fondos en Silla / Banco (Dips)',
    category: 'PUSH_HORIZONTAL',
    instructions:
      'Manos al borde por detrás, rodillas flexionadas o rectas. Bajar controlado flexionando codos, empujar triceps.',
    images: [],
  },
  {
    name: 'Cristos / Fly de Pecho con Banda',
    category: 'PUSH_HORIZONTAL',
    instructions:
      'Pasar banda por detrás de la espalda, sujetar un lado con cada mano, cerrar ambas manos al frente juntando pecho.',
    images: [],
  },

  // ─── EMPUJE VERTICAL ────────────────────────────────────────
  {
    name: 'Pike Push Ups (Lagartijas de Hombro)',
    category: 'PUSH_VERTICAL',
    instructions:
      'Cuerpo en V invertida, enfocar peso en manos. Bajar corona de la cabeza en un triángulo por delante de tus manos.',
    images: [],
  },
  {
    name: 'Press de Hombro con Banda',
    category: 'PUSH_VERTICAL',
    instructions:
      'Pisar banda en el centro, llevar extremos a altura de hombros y empujar directamente sobre la cabeza.',
    images: [],
  },

  // ─── BRAZOS ─────────────────────────────────────────────────
  {
    name: 'Extensión de Tríceps sobre Cabeza con Banda',
    category: 'ARMS',
    instructions:
      'Pisar banda, anclarla por detrás y arriba de tu cabeza y extender el tríceps bloqueando el codo arriba.',
    images: [],
  },
  {
    name: 'Patada de Tríceps con Banda (Kickback)',
    category: 'ARMS',
    instructions:
      'Inclinado, retener el codo pegado a las costillas y empujar el antebrazo y banda hacia atrás por completo.',
    images: [],
  },
  {
    name: 'Curl de Bíceps con Banda',
    category: 'ARMS',
    instructions:
      'Pisar banda con 1 o 2 pies y hacer curl de brazos sin columpiar el cuerpo; resistir bien en la bajada.',
    images: [],
  },

  // ─── JALÓN HORIZONTAL ───────────────────────────────────────
  {
    name: 'Remo Inclinado con Banda (Bent Over Row)',
    category: 'PULL_HORIZONTAL',
    instructions:
      'Pisar banda, inclinar torso a 45 grados, jalar hacia las costillas apretando la espalda.',
    images: [],
  },
  {
    name: 'Remo a 1 Mano con Banda (Split Row)',
    category: 'PULL_HORIZONTAL',
    instructions:
      'En posición de desplante frontal corto, sujetar banda anclada bajo pie delantero e impulsar jalones a una mano.',
    images: [],
  },
  {
    name: 'Face Pull con Banda',
    category: 'PULL_HORIZONTAL',
    instructions:
      'Anclar banda frente al rostro, jalar manos a nivel frente/orejas forzando la rotación externa y contracción escapular media.',
    images: [],
  },
  {
    name: 'Band Pull Apart',
    category: 'PULL_HORIZONTAL',
    instructions:
      'Brazos al frente sosteniendo la banda, abrirlos en T apuntando a los omóplatos, ideal para calentamiento o postura.',
    images: [],
  },

  // ─── JALÓN VERTICAL ─────────────────────────────────────────
  {
    name: 'Pullover Acostado con Banda',
    category: 'PULL_VERTICAL',
    instructions:
      'Anclar banda a nivel suelo o puerta cerrada baja, acostarse, y con brazos casi rectos jalar hasta la altura de rodillas/cadera.',
    images: [],
  },
];
