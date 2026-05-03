// Static exercise catalog: Spanish instructions + image URLs from free-exercise-db
// Images sourced from https://github.com/yuhonas/free-exercise-db

import { BAND_EXERCISES } from './bandExercises';
import { EXERCISE_DB } from '../workout-engine/lib/exerciseDb';

const IMG = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

export interface ExerciseCatalogEntry {
  instructions: string;
  images: string[];
}

// Keyed by English name (DEFAULT_EXERCISES.name) for stable lookup
export const EXERCISE_CATALOG: Record<string, ExerciseCatalogEntry> = {
  // ─── QUAD DOMINANT ──────────────────────────────────────
  'Barbell Back Squat': {
    instructions:
      'Coloca la barra sobre los trapecios, pies a la anchura de los hombros. Desbloquea las rodillas y baja controladamente hasta que los muslos estén paralelos al suelo. Empuja el suelo con los pies para volver arriba manteniendo el pecho alto.',
    images: [`${IMG}/Barbell_Squat/0.jpg`, `${IMG}/Barbell_Squat/1.jpg`],
  },
  'Barbell Front Squat': {
    instructions:
      'Apoya la barra en los deltoides frontales con los codos altos. Baja con el torso lo más erguido posible hasta romper el paralelo. Mantén las rodillas alineadas con las puntas de los pies al subir.',
    images: [`${IMG}/Front_Barbell_Squat/0.jpg`, `${IMG}/Front_Barbell_Squat/1.jpg`],
  },
  'Safety Bar Squat': {
    instructions:
      'Coloca la barra de seguridad sobre los hombros y sujeta las asas. Baja de forma controlada manteniendo una postura neutra de espalda. Empuja con fuerza para volver a la posición inicial.',
    images: [],
  },
  'Hack Squat': {
    instructions:
      'Apoya la espalda en el respaldo de la máquina con los pies en la plataforma a la anchura de los hombros. Desbloquea los seguros y baja flexionando las rodillas hasta 90°. Empuja la plataforma para subir sin bloquear las rodillas arriba.',
    images: [`${IMG}/Barbell_Hack_Squat/0.jpg`, `${IMG}/Barbell_Hack_Squat/1.jpg`],
  },
  'Leg Press': {
    instructions:
      'Siéntate en la máquina con la espalda bien apoyada y los pies en la plataforma a la anchura de los hombros. Baja la plataforma flexionando las rodillas hasta ~90°. Empuja sin bloquear las rodillas al final del movimiento.',
    images: [`${IMG}/Leg_Press/0.jpg`, `${IMG}/Leg_Press/1.jpg`],
  },
  'Bulgarian Split Squat': {
    instructions:
      'Coloca el empeine del pie trasero sobre un banco. Con el pie delantero adelantado, baja flexionando la rodilla delantera hasta que el muslo quede paralelo al suelo. Empuja con el pie delantero para subir.',
    images: [],
  },
  'Lunges': {
    instructions:
      'Da un paso largo hacia adelante y flexiona ambas rodillas hasta que la trasera casi toque el suelo. Mantén el torso erguido y empuja con el pie delantero para volver a la posición inicial.',
    images: [`${IMG}/Barbell_Lunge/0.jpg`, `${IMG}/Barbell_Lunge/1.jpg`],
  },
  'Step Ups': {
    instructions:
      'Frente a un cajón o banco, pisa con un pie sobre la superficie elevada. Empuja con esa pierna para subir el cuerpo completo. Baja controladamente con la pierna contraria.',
    images: [`${IMG}/Barbell_Step_Ups/0.jpg`, `${IMG}/Barbell_Step_Ups/1.jpg`],
  },
  'Goblet Squat': {
    instructions:
      'Sujeta una mancuerna o kettlebell contra el pecho con ambas manos. Baja en sentadilla manteniendo los codos entre las rodillas y el torso erguido. Sube empujando el suelo con los talones.',
    images: [],
  },
  'Leg Extension': {
    instructions:
      'Siéntate en la máquina con la espalda apoyada y los tobillos bajo el rodillo. Extiende las rodillas levantando el peso hasta que las piernas estén rectas. Baja lentamente controlando el movimiento.',
    images: [],
  },

  // ─── POSTERIOR CHAIN ────────────────────────────────────
  'Conventional Deadlift': {
    instructions:
      'Con los pies a la anchura de las caderas, agarra la barra con agarre mixto o doble prono. Mantén la espalda neutra y empuja el suelo con los pies mientras extiendes las caderas y rodillas. Baja la barra de forma controlada siguiendo la misma trayectoria.',
    images: [`${IMG}/Barbell_Deadlift/0.jpg`, `${IMG}/Barbell_Deadlift/1.jpg`],
  },
  'Sumo Deadlift': {
    instructions:
      'Abre los pies más allá de los hombros con las puntas hacia afuera. Agarra la barra con los brazos entre las piernas. Empuja el suelo hacia los lados mientras extiendes caderas y rodillas simultáneamente.',
    images: [`${IMG}/Sumo_Deadlift/0.jpg`, `${IMG}/Sumo_Deadlift/1.jpg`],
  },
  'Romanian Deadlift': {
    instructions:
      'Sujeta la barra con los brazos extendidos y los pies a la anchura de las caderas. Empuja las caderas hacia atrás bajando la barra por las piernas con ligera flexión de rodillas. Regresa apretando los glúteos al frente.',
    images: [`${IMG}/Romanian_Deadlift_With_Dumbbells/0.jpg`, `${IMG}/Romanian_Deadlift_With_Dumbbells/1.jpg`],
  },
  'Stiff Leg Deadlift': {
    instructions:
      'Similar al peso muerto rumano pero con las piernas casi completamente extendidas. Baja la barra manteniendo la espalda recta hasta sentir un estiramiento en los isquiotibiales. Sube contrayendo glúteos e isquiotibiales.',
    images: [`${IMG}/Stiff-Legged_Barbell_Deadlift/0.jpg`, `${IMG}/Stiff-Legged_Barbell_Deadlift/1.jpg`],
  },
  'Hip Thrust (Barbell)': {
    instructions:
      'Siéntate en el suelo con la espalda alta apoyada en un banco y la barra sobre las caderas. Empuja las caderas hacia arriba hasta que el torso quede paralelo al suelo. Aprieta los glúteos arriba y baja controladamente.',
    images: [`${IMG}/Barbell_Hip_Thrust/0.jpg`, `${IMG}/Barbell_Hip_Thrust/1.jpg`],
  },
  'Hip Thrust (Machine)': {
    instructions:
      'Ajusta la máquina de hip thrust con la espalda apoyada y el cojín sobre las caderas. Empuja las caderas hacia arriba contrayendo los glúteos. Baja controladamente sin relajar la tensión.',
    images: [],
  },
  'Glute Bridge': {
    instructions:
      'Acuéstate boca arriba con las rodillas flexionadas y los pies apoyados en el suelo. Eleva las caderas apretando los glúteos hasta formar una línea recta desde los hombros hasta las rodillas. Baja lentamente.',
    images: [`${IMG}/Barbell_Glute_Bridge/0.jpg`, `${IMG}/Barbell_Glute_Bridge/1.jpg`],
  },
  'Leg Curl (Lying)': {
    instructions:
      'Acuéstate boca abajo en la máquina con los tobillos bajo el rodillo. Flexiona las rodillas llevando los talones hacia los glúteos. Baja controladamente resistiendo el peso.',
    images: [`${IMG}/Lying_Leg_Curls/0.jpg`, `${IMG}/Lying_Leg_Curls/1.jpg`],
  },
  'Leg Curl (Seated)': {
    instructions:
      'Siéntate en la máquina con las piernas extendidas y el rodillo sobre los tobillos. Flexiona las rodillas tirando los talones hacia abajo y atrás. Regresa lentamente a la posición inicial.',
    images: [`${IMG}/Seated_Leg_Curl/0.jpg`, `${IMG}/Seated_Leg_Curl/1.jpg`],
  },
  'Nordic Curl': {
    instructions:
      'Arrodíllate con los tobillos sujetos (compañero o máquina). Baja el torso lentamente hacia el suelo manteniendo las caderas extendidas. Usa los isquiotibiales para frenar la caída y empuja para volver arriba.',
    images: [],
  },
  'Good Morning': {
    instructions:
      'Coloca la barra sobre los trapecios como en una sentadilla. Con las rodillas ligeramente flexionadas, inclina el torso hacia adelante empujando las caderas atrás. Regresa contrayendo glúteos e isquiotibiales.',
    images: [],
  },
  'Cable Pull Through': {
    instructions:
      'De espaldas a una polea baja, pasa el cable entre las piernas y sujeta la cuerda. Inclínate hacia adelante empujando las caderas atrás. Regresa a la posición vertical apretando los glúteos.',
    images: [],
  },

  // ─── PUSH HORIZONTAL ───────────────────────────────────
  'Barbell Bench Press': {
    instructions:
      'Acuéstate en el banco con los ojos bajo la barra. Agarra la barra un poco más ancho que los hombros, baja hasta tocar el pecho y empuja explosivamente hasta extender los brazos.',
    images: [`${IMG}/Barbell_Bench_Press_-_Medium_Grip/0.jpg`, `${IMG}/Barbell_Bench_Press_-_Medium_Grip/1.jpg`],
  },
  'Dumbbell Bench Press': {
    instructions:
      'Acuéstate en el banco con una mancuerna en cada mano a la altura del pecho. Empuja las mancuernas hacia arriba hasta extender los brazos. Baja controladamente hasta que los codos queden a ~90°.',
    images: [`${IMG}/Dumbbell_Bench_Press/0.jpg`, `${IMG}/Dumbbell_Bench_Press/1.jpg`],
  },
  'Incline Barbell Press': {
    instructions:
      'Acuéstate en un banco inclinado (30-45°) y agarra la barra a la anchura de los hombros. Baja la barra hasta la parte alta del pecho. Empuja hacia arriba hasta extender los brazos.',
    images: [`${IMG}/Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg`, `${IMG}/Barbell_Incline_Bench_Press_-_Medium_Grip/1.jpg`],
  },
  'Incline Dumbbell Press': {
    instructions:
      'Acuéstate en un banco inclinado con una mancuerna en cada mano. Empuja las mancuernas hacia arriba y ligeramente hacia el centro. Baja controladamente hasta sentir un estiramiento en el pecho.',
    images: [`${IMG}/Incline_Dumbbell_Press/0.jpg`, `${IMG}/Incline_Dumbbell_Press/1.jpg`],
  },
  'Decline Press': {
    instructions:
      'Acuéstate en un banco declinado con los pies asegurados. Agarra la barra a la anchura de los hombros y baja hasta la parte baja del pecho. Empuja hasta extender los brazos.',
    images: [`${IMG}/Decline_Barbell_Bench_Press/0.jpg`, `${IMG}/Decline_Barbell_Bench_Press/1.jpg`],
  },
  'Machine Chest Press': {
    instructions:
      'Siéntate en la máquina con la espalda apoyada y las asas a la altura del pecho. Empuja las asas hacia adelante hasta extender los brazos. Regresa controladamente sin dejar que las placas toquen.',
    images: [],
  },
  'Cable Fly': {
    instructions:
      'De pie entre dos poleas altas, sujeta las asas con los brazos abiertos y codos ligeramente flexionados. Junta las manos al frente en un arco controlado. Abre los brazos lentamente hasta sentir el estiramiento.',
    images: [],
  },
  'Dumbbell Fly': {
    instructions:
      'Acuéstate en el banco con una mancuerna en cada mano y los brazos extendidos arriba. Abre los brazos en arco con los codos ligeramente flexionados. Junta las mancuernas arriba contrayendo el pecho.',
    images: [`${IMG}/Dumbbell_Flyes/0.jpg`, `${IMG}/Dumbbell_Flyes/1.jpg`],
  },
  'Pec Dec': {
    instructions:
      'Siéntate en la máquina con los antebrazos en las almohadillas. Junta los brazos al frente contrayendo el pecho. Abre controladamente hasta sentir un estiramiento cómodo.',
    images: [],
  },

  // ─── PUSH VERTICAL ─────────────────────────────────────
  'Barbell OHP': {
    instructions:
      'De pie, sujeta la barra a la altura de los hombros con agarre ligeramente más ancho. Empuja la barra verticalmente pasándola cerca de la cara. Bloquea los codos arriba y baja controladamente.',
    images: [`${IMG}/Barbell_Shoulder_Press/0.jpg`, `${IMG}/Barbell_Shoulder_Press/1.jpg`],
  },
  'Dumbbell OHP': {
    instructions:
      'Sentado o de pie, sujeta las mancuernas a la altura de los hombros con las palmas al frente. Empuja hacia arriba hasta extender los brazos. Baja controladamente hasta la posición inicial.',
    images: [`${IMG}/Dumbbell_Shoulder_Press/0.jpg`, `${IMG}/Dumbbell_Shoulder_Press/1.jpg`],
  },
  'Arnold Press': {
    instructions:
      'Sentado, comienza con las mancuernas frente al rostro y las palmas hacia ti. Mientras empujas hacia arriba, rota las muñecas hasta que las palmas miren al frente. Invierte el movimiento al bajar.',
    images: [`${IMG}/Arnold_Dumbbell_Press/0.jpg`, `${IMG}/Arnold_Dumbbell_Press/1.jpg`],
  },
  'Seated Machine Press': {
    instructions:
      'Siéntate en la máquina de press de hombro con la espalda apoyada. Empuja las asas hacia arriba hasta casi extender los brazos. Baja controladamente hasta que los codos queden a 90°.',
    images: [],
  },
  'Landmine Press': {
    instructions:
      'Sujeta el extremo de la barra anclada al suelo a la altura del hombro. Empuja la barra hacia arriba y al frente con un brazo. Baja controladamente hasta el hombro.',
    images: [],
  },
  'Lateral Raise (DB)': {
    instructions:
      'De pie con una mancuerna en cada mano a los lados. Eleva los brazos lateralmente con los codos ligeramente flexionados hasta la altura de los hombros. Baja lentamente controlando el peso.',
    images: [`${IMG}/Side_Lateral_Raise/0.jpg`, `${IMG}/Side_Lateral_Raise/1.jpg`],
  },
  'Lateral Raise (Cable)': {
    instructions:
      'De pie junto a una polea baja, sujeta el asa con la mano contraria. Eleva el brazo lateralmente hasta la altura del hombro. Baja controladamente resistiendo la tensión del cable.',
    images: [],
  },
  'Rear Delt Fly (DB)': {
    instructions:
      'Inclínate hacia adelante con una mancuerna en cada mano colgando. Eleva los brazos lateralmente apretando los omóplatos. Baja controladamente hasta la posición inicial.',
    images: [`${IMG}/Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench/0.jpg`, `${IMG}/Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench/1.jpg`],
  },
  'Rear Delt Fly (Machine)': {
    instructions:
      'Siéntate en la máquina de pec dec mirando hacia el respaldo. Sujeta las asas y abre los brazos hacia atrás apretando los omóplatos. Regresa controladamente.',
    images: [],
  },
  'Face Pull': {
    instructions:
      'Con una cuerda en una polea alta, tira hacia la cara separando los extremos. Mantén los codos altos y aprieta los omóplatos al final. Regresa controladamente.',
    images: [`${IMG}/Face_Pull/0.jpg`, `${IMG}/Face_Pull/1.jpg`],
  },

  // ─── PULL HORIZONTAL ───────────────────────────────────
  'Barbell Bent Over Row': {
    instructions:
      'Inclínate hacia adelante con la espalda recta y las rodillas ligeramente flexionadas. Tira de la barra hacia el abdomen bajo apretando los omóplatos. Baja controladamente.',
    images: [`${IMG}/Bent_Over_Barbell_Row/0.jpg`, `${IMG}/Bent_Over_Barbell_Row/1.jpg`],
  },
  'Dumbbell Row': {
    instructions:
      'Con una mano y rodilla apoyadas en un banco, sujeta la mancuerna con el brazo libre. Tira la mancuerna hacia la cadera retrayendo el omóplato. Baja controladamente estirando el dorsal.',
    images: [`${IMG}/Bent_Over_Two-Dumbbell_Row/0.jpg`, `${IMG}/Bent_Over_Two-Dumbbell_Row/1.jpg`],
  },
  'Cable Row (Seated)': {
    instructions:
      'Siéntate con los pies en las plataformas y las rodillas ligeramente flexionadas. Tira del asa hacia el abdomen manteniendo el torso erguido. Extiende los brazos controladamente.',
    images: [`${IMG}/Seated_Cable_Rows/0.jpg`, `${IMG}/Seated_Cable_Rows/1.jpg`],
  },
  'Machine Row': {
    instructions:
      'Siéntate en la máquina con el pecho apoyado en el soporte. Tira de las asas hacia atrás apretando los omóplatos. Regresa controladamente sin soltar la tensión.',
    images: [],
  },
  'Chest Supported Row': {
    instructions:
      'Acuéstate boca abajo en un banco inclinado con una mancuerna en cada mano. Tira de las mancuernas hacia las caderas apretando la espalda. Baja controladamente.',
    images: [],
  },
  'Meadows Row': {
    instructions:
      'Colócate perpendicular a una barra anclada (landmine). Agarra el extremo con una mano y tira hacia la cadera con el codo pegado al cuerpo. Baja controladamente.',
    images: [],
  },
  'Pendlay Row': {
    instructions:
      'Desde el suelo, agarra la barra con agarre prono y la espalda paralela al suelo. Tira explosivamente hacia el abdomen. Baja la barra al suelo en cada repetición.',
    images: [],
  },

  // ─── PULL VERTICAL ─────────────────────────────────────
  'Pull Up': {
    instructions:
      'Cuélgate de la barra con agarre prono (palmas al frente) ligeramente más ancho que los hombros. Tira del cuerpo hacia arriba hasta que la barbilla supere la barra. Baja controladamente hasta extender los brazos.',
    images: [`${IMG}/Pullups/0.jpg`, `${IMG}/Pullups/1.jpg`],
  },
  'Assisted Pull Up': {
    instructions:
      'Ajusta la asistencia de la máquina para que puedas completar el rango completo con control. Apoya rodillas o pies en la plataforma, cuélgate con agarre prono y tira el pecho hacia la barra. Baja lento hasta extender los brazos sin perder tensión en dorsales.',
    images: [],
  },
  'Weighted Pull Up': {
    instructions:
      'Coloca peso adicional con cinturón o mancuerna entre los pies. Realiza una dominada completa subiendo la barbilla por encima de la barra. Baja controladamente.',
    images: [],
  },
  'Chin Up': {
    instructions:
      'Cuélgate con agarre supino (palmas hacia ti) a la anchura de los hombros. Tira del cuerpo hacia arriba enfocando la contracción en bíceps y dorsales. Baja controladamente.',
    images: [`${IMG}/Chin-Up/0.jpg`, `${IMG}/Chin-Up/1.jpg`],
  },
  'Lat Pulldown (Bar)': {
    instructions:
      'Siéntate en la máquina y sujeta la barra ancha con agarre prono. Tira de la barra hacia la parte alta del pecho inclinando ligeramente el torso. Sube controladamente.',
    images: [`${IMG}/Wide-Grip_Lat_Pulldown/0.jpg`, `${IMG}/Wide-Grip_Lat_Pulldown/1.jpg`],
  },
  'Lat Pulldown (Neutral)': {
    instructions:
      'Siéntate y sujeta el asa de agarre neutro (palmas enfrentadas). Tira hacia el pecho manteniendo los codos cerca del cuerpo. Sube controladamente.',
    images: [],
  },
  'Single Arm Pulldown': {
    instructions:
      'Siéntate en la polea alta y sujeta un asa con una mano. Tira hacia abajo llevando el codo hacia la cadera. Sube controladamente sintiendo el estiramiento del dorsal.',
    images: [],
  },
  'Straight Arm Pulldown': {
    instructions:
      'De pie frente a una polea alta, sujeta la barra con los brazos extendidos. Empuja la barra hacia abajo en arco hasta los muslos. Sube controladamente manteniendo los brazos rectos.',
    images: [`${IMG}/Straight-Arm_Pulldown/0.jpg`, `${IMG}/Straight-Arm_Pulldown/1.jpg`],
  },

  // ─── ARMS ──────────────────────────────────────────────
  'Barbell Curl': {
    instructions:
      'De pie, sujeta la barra con agarre supino a la anchura de los hombros. Flexiona los codos levantando la barra sin mover los codos de su posición. Baja controladamente.',
    images: [`${IMG}/Barbell_Curl/0.jpg`, `${IMG}/Barbell_Curl/1.jpg`],
  },
  'Dumbbell Curl': {
    instructions:
      'De pie con una mancuerna en cada mano y los brazos a los lados. Flexiona un codo a la vez (o ambos) subiendo la mancuerna con control. Baja lentamente.',
    images: [`${IMG}/Dumbbell_Bicep_Curl/0.jpg`, `${IMG}/Dumbbell_Bicep_Curl/1.jpg`],
  },
  'Incline Dumbbell Curl': {
    instructions:
      'Siéntate en un banco inclinado (45°) con una mancuerna en cada mano colgando. Flexiona los codos subiendo las mancuernas. El ángulo aumenta el estiramiento del bíceps.',
    images: [`${IMG}/Alternate_Incline_Dumbbell_Curl/0.jpg`, `${IMG}/Alternate_Incline_Dumbbell_Curl/1.jpg`],
  },
  'Cable Curl': {
    instructions:
      'De pie frente a una polea baja, sujeta la barra con agarre supino. Flexiona los codos manteniendo los codos fijos a los lados. Baja controladamente.',
    images: [],
  },
  'Hammer Curl': {
    instructions:
      'De pie con las mancuernas a los lados y las palmas enfrentadas (agarre neutro). Flexiona los codos subiendo las mancuernas sin rotar las muñecas. Baja controladamente.',
    images: [`${IMG}/Hammer_Curls/0.jpg`, `${IMG}/Hammer_Curls/1.jpg`],
  },
  'Preacher Curl': {
    instructions:
      'Siéntate en el banco predicador con los brazos apoyados en la almohadilla. Flexiona los codos subiendo la barra o mancuerna. Baja controladamente sin hiperextender los codos.',
    images: [`${IMG}/Preacher_Curl_-_With_Barbell/0.jpg`, `${IMG}/Preacher_Curl_-_With_Barbell/1.jpg`],
  },
  'Close Grip Bench Press': {
    instructions:
      'Acuéstate en el banco y sujeta la barra con las manos separadas a la anchura de los hombros o menos. Baja la barra al pecho bajo manteniendo los codos cerca del cuerpo. Empuja hasta extender.',
    images: [`${IMG}/Close-Grip_Barbell_Bench_Press/0.jpg`, `${IMG}/Close-Grip_Barbell_Bench_Press/1.jpg`],
  },
  'Tricep Pushdown': {
    instructions:
      'De pie frente a una polea alta, sujeta la barra o cuerda con los codos pegados al cuerpo. Extiende los codos empujando hacia abajo. Flexiona controladamente hasta 90°.',
    images: [`${IMG}/Triceps_Pushdown/0.jpg`, `${IMG}/Triceps_Pushdown/1.jpg`],
  },
  'Overhead Tricep Extension': {
    instructions:
      'De pie o sentado, sujeta una mancuerna o cuerda de cable sobre la cabeza con los brazos extendidos. Flexiona los codos bajando el peso detrás de la cabeza. Extiende para volver arriba.',
    images: [],
  },
  'Skull Crushers': {
    instructions:
      'Acuéstate en el banco con la barra o mancuernas sobre el pecho y los brazos extendidos. Flexiona los codos bajando el peso hacia la frente. Extiende los codos para volver arriba.',
    images: [`${IMG}/EZ-Bar_Skullcrusher/0.jpg`, `${IMG}/EZ-Bar_Skullcrusher/1.jpg`],
  },
  'Dips (Tricep)': {
    instructions:
      'Sujétate en las barras paralelas con los brazos extendidos y el torso erguido. Flexiona los codos bajando el cuerpo manteniendo los codos cerca. Empuja para volver arriba.',
    images: [`${IMG}/Dips_-_Triceps_Version/0.jpg`, `${IMG}/Dips_-_Triceps_Version/1.jpg`],
  },

  // ─── CORE ──────────────────────────────────────────────
  'Plank': {
    instructions:
      'Apóyate sobre los antebrazos y las puntas de los pies formando una línea recta desde la cabeza hasta los talones. Activa el core y mantén la posición sin dejar caer las caderas. Respira de forma constante.',
    images: [`${IMG}/Plank/0.jpg`, `${IMG}/Plank/1.jpg`],
  },
  'Cable Crunch': {
    instructions:
      'Arrodíllate frente a una polea alta sujetando la cuerda detrás de la cabeza. Flexiona el torso hacia abajo contrayendo los abdominales. Sube controladamente.',
    images: [],
  },
  'Hanging Leg Raise': {
    instructions:
      'Cuélgate de una barra con los brazos extendidos. Eleva las piernas rectas (o con rodillas flexionadas) hasta que queden paralelas al suelo. Baja controladamente sin balancearte.',
    images: [`${IMG}/Hanging_Leg_Raise/0.jpg`, `${IMG}/Hanging_Leg_Raise/1.jpg`],
  },
  'Ab Wheel': {
    instructions:
      'Arrodíllate sujetando la rueda abdominal con ambas manos. Rueda hacia adelante extendiendo el cuerpo lo más posible sin tocar el suelo. Contrae el core para regresar a la posición inicial.',
    images: [`${IMG}/Ab_Roller/0.jpg`, `${IMG}/Ab_Roller/1.jpg`],
  },
  'Pallof Press': {
    instructions:
      'De pie perpendicular a una polea, sujeta el asa con ambas manos a la altura del pecho. Extiende los brazos al frente resistiendo la rotación. Regresa las manos al pecho.',
    images: [],
  },
  'Landmine Rotation': {
    instructions:
      'Sujeta el extremo de una barra anclada con ambas manos frente al pecho. Rota el torso llevando la barra de un lado al otro en arco controlado. Mantén las caderas estables.',
    images: [],
  },

  // ─── CALVES ────────────────────────────────────────────
  'Standing Calf Raise': {
    instructions:
      'De pie en la máquina o en un escalón con las almohadillas sobre los hombros. Elévate sobre las puntas de los pies apretando los gemelos. Baja lentamente estirando al máximo.',
    images: [`${IMG}/Standing_Calf_Raises/0.jpg`, `${IMG}/Standing_Calf_Raises/1.jpg`],
  },
  'Seated Calf Raise': {
    instructions:
      'Siéntate en la máquina con las rodillas bajo las almohadillas y los pies en la plataforma. Eleva los talones contrayendo los gemelos. Baja lentamente hasta el estiramiento completo.',
    images: [`${IMG}/Seated_Calf_Raise/0.jpg`, `${IMG}/Seated_Calf_Raise/1.jpg`],
  },
  'Leg Press Calf Raise': {
    instructions:
      'En la prensa de piernas, coloca solo las puntas de los pies en el borde inferior de la plataforma. Empuja extendiendo los tobillos. Baja controladamente estirando los gemelos.',
    images: [`${IMG}/Calf_Press_On_The_Leg_Press_Machine/0.jpg`, `${IMG}/Calf_Press_On_The_Leg_Press_Machine/1.jpg`],
  },

  // ─── NUEVOS — AISLAMIENTO TREN INFERIOR ────────────────
  'Patada de Glúteo': {
    instructions:
      'En la máquina o con una polea baja en cuadrupedia, extiende una pierna hacia atrás y arriba contrayendo el glúteo al final del movimiento. Mantén la cadera estable y el core activo. Baja controladamente sin rotar la pelvis.',
    images: [`${IMG}/Cable_Kick_Back/0.jpg`, `${IMG}/Cable_Kick_Back/1.jpg`],
  },
  'Abductores (Máquina)': {
    instructions:
      'Siéntate en la máquina con las almohadillas sobre la cara externa de los muslos. Abre las piernas hacia los lados venciendo la resistencia. Regresa lentamente controlando el movimiento para mantener la tensión.',
    images: [],
  },
  'Aductores (Máquina)': {
    instructions:
      'Siéntate en la máquina con las almohadillas sobre la cara interna de los muslos y las piernas abiertas. Junta las piernas apretando los aductores. Abre lentamente regresando a la posición inicial.',
    images: [],
  },
  'Prensa Horizontal (Máquina)': {
    instructions:
      'Siéntate en la máquina de prensa horizontal con la espalda completamente apoyada y los pies en la plataforma a la anchura de los hombros. Empuja la plataforma extendiendo las rodillas sin bloquearlas del todo. Regresa controladamente sin dejar que el peso descanse entre repeticiones.',
    images: [],
  },

  // ─── VIAJE & BANDAS (generado desde bandExercises.ts) ──────
  ...Object.fromEntries(
    BAND_EXERCISES.map(e => [e.name, { instructions: e.instructions, images: e.images }])
  ),
};

// Reverse lookup: Spanish name → English name (for DB exercises stored in Spanish)
// Auto-generado desde EXERCISE_DB (fuente de verdad para ejercicios de banda/peso corporal)
// más entradas estáticas para ejercicios de gimnasio que no están en EXERCISE_DB.
export const ES_TO_EN: Record<string, string> = {
  // ─── Generado desde EXERCISE_DB ─────────────────────────────
  ...Object.fromEntries(
    Object.values(EXERCISE_DB)
      .filter(e => e.nameEs && e.name && e.nameEs !== e.name)
      .map(e => [e.nameEs, e.name])
  ),

  // ─── Ejercicios de gimnasio (no están en EXERCISE_DB) ───────
  'Barra Back Squat': 'Barbell Back Squat',
  'Barra Front Squat': 'Barbell Front Squat',
  'Sentadilla con Barra de Seguridad': 'Safety Bar Squat',
  'Hack Squat': 'Hack Squat',
  'Prensa de Piernas': 'Leg Press',
  'Sentadilla Búlgara': 'Bulgarian Split Squat',
  'Zancadas (Barra/MC)': 'Lunges',
  'Subidas al Cajón': 'Step Ups',
  'Sentadilla Goblet': 'Goblet Squat',
  'Extensión de Pierna': 'Leg Extension',
  'Peso Muerto Convencional': 'Conventional Deadlift',
  'Peso Muerto Sumo': 'Sumo Deadlift',
  'Peso Muerto Rumano': 'Romanian Deadlift',
  'Peso Muerto Piernas Rígidas': 'Stiff Leg Deadlift',
  'Hip Thrust (Barra)': 'Hip Thrust (Barbell)',
  'Hip Thrust (Máquina)': 'Hip Thrust (Machine)',
  'Puente de Glúteos': 'Glute Bridge',
  'Curl Femoral (Tumbado)': 'Leg Curl (Lying)',
  'Curl Femoral (Sentado)': 'Leg Curl (Seated)',
  'Nordic Curl': 'Nordic Curl',
  'Buenos Días': 'Good Morning',
  'Jalón de Cable por Abajo': 'Cable Pull Through',
  'Barra Press de Banca': 'Barbell Bench Press',
  'Mancuerna Press de Banca': 'Dumbbell Bench Press',
  'Barra Press Inclinado': 'Incline Barbell Press',
  'Mancuerna Press Inclinado': 'Incline Dumbbell Press',
  'Press Declinado': 'Decline Press',
  'Press de Pecho en Máquina': 'Machine Chest Press',
  'Aperturas en Cable': 'Cable Fly',
  'Aperturas con Mancuerna': 'Dumbbell Fly',
  'Pec Dec': 'Pec Dec',
  'Barra Press Militar': 'Barbell OHP',
  'Mancuerna Press Militar': 'Dumbbell OHP',
  'Press Arnold': 'Arnold Press',
  'Press en Máquina Sentado': 'Seated Machine Press',
  'Press con Landmine': 'Landmine Press',
  'Elevación Lateral (MC)': 'Lateral Raise (DB)',
  'Elevación Lateral (Cable)': 'Lateral Raise (Cable)',
  'Pájaro (MC)': 'Rear Delt Fly (DB)',
  'Pájaro en Máquina': 'Rear Delt Fly (Machine)',
  'Jalón al Cuello Cable': 'Face Pull',
  'Barra Remo Inclinado': 'Barbell Bent Over Row',
  'Mancuerna Remo': 'Dumbbell Row',
  'Remo en Cable (Sentado)': 'Cable Row (Seated)',
  'Remo en Máquina': 'Machine Row',
  'Remo con Pecho Apoyado': 'Chest Supported Row',
  'Remo Meadows': 'Meadows Row',
  'Remo Pendlay': 'Pendlay Row',
  'Dominadas (Peso Corporal)': 'Pull Up',
  'Dominadas': 'Pull Up',
  'Dominadas con Apoyo': 'Assisted Pull Up',
  'Dominadas con Lastre': 'Weighted Pull Up',
  'Dominadas Supinación': 'Chin Up',
  'Jalón al Pecho (Barra)': 'Lat Pulldown (Bar)',
  'Jalón al Pecho (Neutro)': 'Lat Pulldown (Neutral)',
  'Jalón Unilateral': 'Single Arm Pulldown',
  'Jalón Brazos Rectos': 'Straight Arm Pulldown',
  'Barra Curl': 'Barbell Curl',
  'Mancuerna Curl': 'Dumbbell Curl',
  'Curl Inclinado con Mancuerna': 'Incline Dumbbell Curl',
  'Curl en Cable': 'Cable Curl',
  'Curl Martillo': 'Hammer Curl',
  'Curl en Predicador (Máquina)': 'Preacher Curl',
  'Press Banca Agarre Cerrado': 'Close Grip Bench Press',
  'Extensión Tríceps Cable': 'Tricep Pushdown',
  'Extensión Tríceps sobre Cabeza': 'Overhead Tricep Extension',
  'Rompecráneos': 'Skull Crushers',
  'Fondos de Tríceps': 'Dips (Tricep)',
  'Plancha': 'Plank',
  'Crunch en Cable': 'Cable Crunch',
  'Elevación Piernas Colgado': 'Hanging Leg Raise',
  'Rueda Abdominal': 'Ab Wheel',
  'Press Pallof': 'Pallof Press',
  'Rotación con Landmine': 'Landmine Rotation',
  'Elevación Talones de Pie': 'Standing Calf Raise',
  'Elevación Talones Sentado': 'Seated Calf Raise',
  'Elevación Talones en Prensa': 'Leg Press Calf Raise',
};

/** Look up catalog entry by exercise name (Spanish or English) */
export function getCatalogEntry(name: string): ExerciseCatalogEntry | null {
  // Direct match (English name)
  if (EXERCISE_CATALOG[name]) return EXERCISE_CATALOG[name];
  // Spanish → English lookup
  const en = ES_TO_EN[name];
  if (en && EXERCISE_CATALOG[en]) return EXERCISE_CATALOG[en];
  return null;
}
