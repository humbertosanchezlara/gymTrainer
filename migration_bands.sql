-- =============================================
-- Migración: Ejercicios con Banda y Peso Corporal
-- =============================================
-- Ejecuta este script en el SQL Editor de tu Dashboard en Supabase.
-- Insertará de manera automática este nuevo catálogo de ejercicios 
-- para todos los perfiles de tu gimnasio.

INSERT INTO exercises (user_id, name, category, status, notes)
SELECT 
    p.id as user_id, 
    v.name, 
    v.category::movement_category, 
    'YES'::exercise_status, 
    v.notes
FROM public.profiles p
CROSS JOIN (
    VALUES 
    -- LOWER BODY 
    ('Sentadilla con Banda', 'QUAD_DOMINANT', 'Pisar la banda con ambos pies a la anchura de hombros, pasarla por los hombros al frente y ejecutar la sentadilla.'),
    ('Desplante Estático con Banda', 'QUAD_DOMINANT', 'Pisar la banda con el pie frontal y anclarla en las manos. Bajar de forma controlada y subir empujando el suelo.'),
    ('Paso Lateral con Banda', 'QUAD_DOMINANT', 'Colocar una banda corta encima o debajo de las rodillas y realizar pasos laterales. Mantener la tensión alta.'),
    ('Peso Muerto Rumano con Banda', 'POSTERIOR_CHAIN', 'Pisar la banda y sujetar ambos extremos. Mantener la espalda recta y empujar cadera hacia atrás estirando isquiotibiales.'),
    ('Puente de Glúteo', 'POSTERIOR_CHAIN', 'Acostado boca arriba, elevar la cadera apretando los glúteos arriba. Recomendable pausar 1-2 segundos en la cima.'),
    ('Elevación de Talones con Banda', 'CALVES', 'Pisar la banda y sostener los extremos con las manos a nivel hombro. Elevar sobre las puntas de los pies.'),
    
    -- CORE
    ('Crunch Inverso con Banda', 'CORE', 'Acostado, anclar la banda atrás de la cabeza sujetándola/pies dentro. Flexionar rodillas hacia el pecho levantando cadera levemente.'),
    ('Plancha Lateral', 'CORE', 'Sostenerse sobre el antebrazo y borde externo del pie. Abdomen contraído y cadera alineada. Manda la línea recta todo lo posible.'),
    ('V-Ups Alternos', 'CORE', 'Acostado, levantar el tronco y una pierna al mismo tiempo para tocar el pie, alternar pierna.'),
    ('Bicicleta (Bicycle Crunches)', 'CORE', 'Llevar codo derecho a rodilla izquierda y alternar fluidamente, controlando la respiración.'),
    ('Leñador Inverso con Banda (Reverse Wood Chop)', 'CORE', 'Anclar banda abajo, jalar diagonalmente hacia arriba torciendo el tronco superior.'),
    
    -- UPPER BODY / PUSH
    ('Lagartijas / Flexiones (Push-Ups)', 'PUSH_HORIZONTAL', 'Manos a lo ancho de los hombros, bajar contrayendo pecho hasta rozar el suelo, empujar de regreso bloqueando el core.'),
    ('Pike Push Ups (Lagartijas de Hombro)', 'PUSH_VERTICAL', 'Cuerpo en V invertida, enfocar peso en manos. Bajar corona de la cabeza en un triángulo por delante de tus manos.'),
    ('Fondos en Silla / Banco (Dips)', 'PUSH_HORIZONTAL', 'Manos al borde por detrás, rodillas flexionadas o rectas. Bajar controlado flexionando codos, empujar triceps.'),
    ('Press de Hombro con Banda', 'PUSH_VERTICAL', 'Pisar banda en el centro, llevar extremos a altura de hombros y empujar directamente sobre la cabeza.'),
    ('Cristos / Fly de Pecho con Banda', 'PUSH_HORIZONTAL', 'Pasar banda por detrás de la espalda, sujetar un lado con cada mano, cerrar ambas manos al frente juntando pecho.'),
    ('Extensión de Tríceps sobre Cabeza con Banda', 'ARMS', 'Pisar banda, anclarla por detrás y arriba de tu cabeza y extender el tríceps bloqueando el codo arriba.'),
    ('Patada de Tríceps con Banda (Kickback)', 'ARMS', 'Inclinado, retener el codo pegado a las costillas y empujar el antebrazo y banda hacia atrás por completo.'),
    
    -- UPPER BODY / PULL
    ('Remo Inclinado con Banda (Bent Over Row)', 'PULL_HORIZONTAL', 'Pisar banda, inclinar torso a 45 grados, jalar hacia las costillas apretando la espalda.'),
    ('Remo a 1 Mano con Banda (Split Row)', 'PULL_HORIZONTAL', 'En posición de desplante frontal corto, sujetar banda anclada bajo pie delantero e impulsar jalones a una mano.'),
    ('Pullover Acostado con Banda', 'PULL_VERTICAL', 'Anclar banda a nivel suelo o puerta cerrada baja, acostarse, y con brazos casi rectos jalar hasta la altura de rodillas/cadera.'),
    ('Face Pull con Banda', 'PULL_HORIZONTAL', 'Anclar banda frente al rostro, jalar manos a nivel frente/orejas forzando la rotación externa y contracción escapular media.'),
    ('Curl de Bíceps con Banda', 'ARMS', 'Pisar banda con 1 o 2 pies y hacer curl de brazos sin columpiar el cuerpo; resistir bien en la bajada.'),
    ('Band Pull Apart', 'PULL_HORIZONTAL', 'Brazos al frente sosteniendo la banda, abrirlos en T apuntando a los omóplatos, ideal para calentamiento o postura.')
) as v(name, category, notes)
ON CONFLICT (user_id, name) DO NOTHING;
