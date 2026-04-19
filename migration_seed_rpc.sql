-- =============================================
-- Función RPC: seed_band_exercises_for_user
-- =============================================
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase.
-- Crea la función que siembra los 24 ejercicios de banda/peso corporal
-- para un usuario específico. Se invoca automáticamente desde AuthContext
-- al momento del registro de un nuevo usuario.

CREATE OR REPLACE FUNCTION seed_band_exercises_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO exercises (user_id, name, category, status, notes)
  VALUES
    -- ─── TREN INFERIOR ──────────────────────────────────────────
    (p_user_id, 'Sentadilla con Banda',            'QUAD_DOMINANT'::movement_category,    'YES'::exercise_status, 'Pisar la banda con ambos pies a la anchura de hombros, pasarla por los hombros al frente y ejecutar la sentadilla.'),
    (p_user_id, 'Desplante Estático con Banda',    'QUAD_DOMINANT'::movement_category,    'YES'::exercise_status, 'Pisar la banda con el pie frontal y anclarla en las manos. Bajar de forma controlada y subir empujando el suelo.'),
    (p_user_id, 'Paso Lateral con Banda',           'QUAD_DOMINANT'::movement_category,    'YES'::exercise_status, 'Colocar una banda corta encima o debajo de las rodillas y realizar pasos laterales. Mantener la tensión alta.'),
    (p_user_id, 'Peso Muerto Rumano con Banda',     'POSTERIOR_CHAIN'::movement_category,  'YES'::exercise_status, 'Pisar la banda y sujetar ambos extremos. Mantener la espalda recta y empujar cadera hacia atrás estirando isquiotibiales.'),
    (p_user_id, 'Puente de Glúteo',                 'POSTERIOR_CHAIN'::movement_category,  'YES'::exercise_status, 'Acostado boca arriba, elevar la cadera apretando los glúteos arriba. Recomendable pausar 1-2 segundos en la cima.'),
    (p_user_id, 'Elevación de Talones con Banda',   'CALVES'::movement_category,           'YES'::exercise_status, 'Pisar la banda y sostener los extremos con las manos a nivel hombro. Elevar sobre las puntas de los pies.'),

    -- ─── CORE ───────────────────────────────────────────────────
    (p_user_id, 'Crunch Inverso con Banda',                      'CORE'::movement_category,           'YES'::exercise_status, 'Acostado, anclar la banda atrás de la cabeza sujetándola/pies dentro. Flexionar rodillas hacia el pecho levantando cadera levemente.'),
    (p_user_id, 'Plancha Lateral',                               'CORE'::movement_category,           'YES'::exercise_status, 'Sostenerse sobre el antebrazo y borde externo del pie. Abdomen contraído y cadera alineada. Manda la línea recta todo lo posible.'),
    (p_user_id, 'V-Ups Alternos',                                'CORE'::movement_category,           'YES'::exercise_status, 'Acostado, levantar el tronco y una pierna al mismo tiempo para tocar el pie, alternar pierna.'),
    (p_user_id, 'Bicicleta (Bicycle Crunches)',                   'CORE'::movement_category,           'YES'::exercise_status, 'Llevar codo derecho a rodilla izquierda y alternar fluidamente, controlando la respiración.'),
    (p_user_id, 'Leñador Inverso con Banda (Reverse Wood Chop)', 'CORE'::movement_category,           'YES'::exercise_status, 'Anclar banda abajo, jalar diagonalmente hacia arriba torciendo el tronco superior.'),

    -- ─── EMPUJE HORIZONTAL ──────────────────────────────────────
    (p_user_id, 'Lagartijas / Flexiones (Push-Ups)',   'PUSH_HORIZONTAL'::movement_category, 'YES'::exercise_status, 'Manos a lo ancho de los hombros, bajar contrayendo pecho hasta rozar el suelo, empujar de regreso bloqueando el core.'),
    (p_user_id, 'Fondos en Silla / Banco (Dips)',      'PUSH_HORIZONTAL'::movement_category, 'YES'::exercise_status, 'Manos al borde por detrás, rodillas flexionadas o rectas. Bajar controlado flexionando codos, empujar triceps.'),
    (p_user_id, 'Cristos / Fly de Pecho con Banda',   'PUSH_HORIZONTAL'::movement_category, 'YES'::exercise_status, 'Pasar banda por detrás de la espalda, sujetar un lado con cada mano, cerrar ambas manos al frente juntando pecho.'),

    -- ─── EMPUJE VERTICAL ────────────────────────────────────────
    (p_user_id, 'Pike Push Ups (Lagartijas de Hombro)', 'PUSH_VERTICAL'::movement_category,  'YES'::exercise_status, 'Cuerpo en V invertida, enfocar peso en manos. Bajar corona de la cabeza en un triángulo por delante de tus manos.'),
    (p_user_id, 'Press de Hombro con Banda',            'PUSH_VERTICAL'::movement_category,  'YES'::exercise_status, 'Pisar banda en el centro, llevar extremos a altura de hombros y empujar directamente sobre la cabeza.'),

    -- ─── BRAZOS ─────────────────────────────────────────────────
    (p_user_id, 'Extensión de Tríceps sobre Cabeza con Banda', 'ARMS'::movement_category, 'YES'::exercise_status, 'Pisar banda, anclarla por detrás y arriba de tu cabeza y extender el tríceps bloqueando el codo arriba.'),
    (p_user_id, 'Patada de Tríceps con Banda (Kickback)',      'ARMS'::movement_category, 'YES'::exercise_status, 'Inclinado, retener el codo pegado a las costillas y empujar el antebrazo y banda hacia atrás por completo.'),
    (p_user_id, 'Curl de Bíceps con Banda',                   'ARMS'::movement_category, 'YES'::exercise_status, 'Pisar banda con 1 o 2 pies y hacer curl de brazos sin columpiar el cuerpo; resistir bien en la bajada.'),

    -- ─── JALÓN HORIZONTAL ───────────────────────────────────────
    (p_user_id, 'Remo Inclinado con Banda (Bent Over Row)', 'PULL_HORIZONTAL'::movement_category, 'YES'::exercise_status, 'Pisar banda, inclinar torso a 45 grados, jalar hacia las costillas apretando la espalda.'),
    (p_user_id, 'Remo a 1 Mano con Banda (Split Row)',      'PULL_HORIZONTAL'::movement_category, 'YES'::exercise_status, 'En posición de desplante frontal corto, sujetar banda anclada bajo pie delantero e impulsar jalones a una mano.'),
    (p_user_id, 'Face Pull con Banda',                      'PULL_HORIZONTAL'::movement_category, 'YES'::exercise_status, 'Anclar banda frente al rostro, jalar manos a nivel frente/orejas forzando la rotación externa y contracción escapular media.'),
    (p_user_id, 'Band Pull Apart',                          'PULL_HORIZONTAL'::movement_category, 'YES'::exercise_status, 'Brazos al frente sosteniendo la banda, abrirlos en T apuntando a los omóplatos, ideal para calentamiento o postura.'),

    -- ─── JALÓN VERTICAL ─────────────────────────────────────────
    (p_user_id, 'Pullover Acostado con Banda', 'PULL_VERTICAL'::movement_category, 'YES'::exercise_status, 'Anclar banda a nivel suelo o puerta cerrada baja, acosterse, y con brazos casi rectos jalar hasta la altura de rodillas/cadera.')

  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

-- Permitir al rol authenticated llamar esta función
GRANT EXECUTE ON FUNCTION seed_band_exercises_for_user(uuid) TO authenticated;
