-- =============================================
-- Migration: Renombrar ejercicios al español
-- Correr en: Supabase → SQL Editor
-- =============================================

-- ─── TREN INFERIOR — CUÁDRICEPS DOMINANTE ──────────────
UPDATE exercises SET name = 'Barra Back Squat'        WHERE name = 'Barbell Back Squat';
UPDATE exercises SET name = 'Barra Front Squat'       WHERE name = 'Barbell Front Squat';
UPDATE exercises SET name = 'Sentadilla con Barra de Seguridad' WHERE name = 'Safety Bar Squat';
UPDATE exercises SET name = 'Hack Squat'              WHERE name = 'Hack Squat (machine)';
UPDATE exercises SET name = 'Prensa de Piernas'       WHERE name = 'Leg Press';
UPDATE exercises SET name = 'Sentadilla Búlgara'      WHERE name = 'Bulgarian Split Squat';
UPDATE exercises SET name = 'Zancadas (Barra/MC)'     WHERE name = 'Lunges (barbell/DB)';
UPDATE exercises SET name = 'Subidas al Cajón'        WHERE name = 'Step Ups';
UPDATE exercises SET name = 'Sentadilla Goblet'       WHERE name = 'Goblet Squat';
UPDATE exercises SET name = 'Extensión de Pierna'     WHERE name = 'Leg Extension (machine)';

-- ─── TREN INFERIOR — CADENA POSTERIOR ──────────────────
UPDATE exercises SET name = 'Peso Muerto Convencional'  WHERE name = 'Conventional Deadlift';
UPDATE exercises SET name = 'Peso Muerto Sumo'          WHERE name = 'Sumo Deadlift';
UPDATE exercises SET name = 'Peso Muerto Rumano'        WHERE name = 'Romanian Deadlift';
UPDATE exercises SET name = 'Peso Muerto Piernas Rígidas' WHERE name = 'Stiff Leg Deadlift';
UPDATE exercises SET name = 'Hip Thrust (Barra)'        WHERE name = 'Hip Thrust (barbell)';
UPDATE exercises SET name = 'Hip Thrust (Máquina)'      WHERE name = 'Hip Thrust (machine)';
UPDATE exercises SET name = 'Puente de Glúteos'         WHERE name = 'Glute Bridge';
UPDATE exercises SET name = 'Curl Femoral (Tumbado)'    WHERE name = 'Leg Curl (lying)';
UPDATE exercises SET name = 'Curl Femoral (Sentado)'    WHERE name = 'Leg Curl (seated)';
UPDATE exercises SET name = 'Nordic Curl'               WHERE name = 'Nordic Curl';
UPDATE exercises SET name = 'Buenos Días'               WHERE name = 'Good Morning';
UPDATE exercises SET name = 'Jalón de Cable por Abajo'  WHERE name = 'Cable Pull Through';

-- ─── TREN SUPERIOR — EMPUJE HORIZONTAL ─────────────────
UPDATE exercises SET name = 'Barra Press de Banca'      WHERE name = 'Barbell Bench Press';
UPDATE exercises SET name = 'Mancuerna Press de Banca'  WHERE name = 'Dumbbell Bench Press';
UPDATE exercises SET name = 'Barra Press Inclinado'     WHERE name = 'Incline Barbell Press';
UPDATE exercises SET name = 'Mancuerna Press Inclinado' WHERE name = 'Incline Dumbbell Press';
UPDATE exercises SET name = 'Press Declinado'           WHERE name = 'Decline Press';
UPDATE exercises SET name = 'Press de Pecho en Máquina' WHERE name = 'Machine Chest Press';
UPDATE exercises SET name = 'Aperturas en Cable'        WHERE name = 'Cable Fly';
UPDATE exercises SET name = 'Aperturas con Mancuerna'   WHERE name = 'Dumbbell Fly';
UPDATE exercises SET name = 'Pec Dec'                   WHERE name = 'Pec Dec (machine)';

-- ─── TREN SUPERIOR — EMPUJE VERTICAL ───────────────────
UPDATE exercises SET name = 'Barra Press Militar'       WHERE name = 'Barbell OHP';
UPDATE exercises SET name = 'Mancuerna Press Militar'   WHERE name = 'Dumbbell OHP';
UPDATE exercises SET name = 'Press Arnold'              WHERE name = 'Arnold Press';
UPDATE exercises SET name = 'Press en Máquina Sentado'  WHERE name = 'Seated Machine Press';
UPDATE exercises SET name = 'Press con Landmine'        WHERE name = 'Landmine Press';
UPDATE exercises SET name = 'Elevación Lateral (MC)'    WHERE name = 'Lateral Raise (DB)';
UPDATE exercises SET name = 'Elevación Lateral (Cable)' WHERE name = 'Lateral Raise (cable)';
UPDATE exercises SET name = 'Pájaro (MC)'               WHERE name = 'Rear Delt Fly (DB)';
UPDATE exercises SET name = 'Pájaro en Máquina'         WHERE name = 'Rear Delt Fly (machine)';
UPDATE exercises SET name = 'Jalón al Cuello Cable'     WHERE name = 'Face Pull (cable)';

-- ─── TREN SUPERIOR — JALÓN HORIZONTAL ──────────────────
UPDATE exercises SET name = 'Barra Remo Inclinado'      WHERE name = 'Barbell Bent Over Row';
UPDATE exercises SET name = 'Mancuerna Remo'            WHERE name = 'Dumbbell Row';
UPDATE exercises SET name = 'Remo en Cable (Sentado)'   WHERE name = 'Cable Row (seated)';
UPDATE exercises SET name = 'Remo en Máquina'           WHERE name = 'Machine Row';
UPDATE exercises SET name = 'Remo con Pecho Apoyado'    WHERE name = 'Chest Supported Row';
UPDATE exercises SET name = 'Remo Meadows'              WHERE name = 'Meadows Row';
UPDATE exercises SET name = 'Remo Pendlay'              WHERE name = 'Pendlay Row';

-- ─── TREN SUPERIOR — JALÓN VERTICAL ────────────────────
UPDATE exercises SET name = 'Dominadas (Peso Corporal)' WHERE name = 'Pull Up (bodyweight)';
UPDATE exercises SET name = 'Dominadas con Lastre'      WHERE name = 'Weighted Pull Up';
UPDATE exercises SET name = 'Dominadas Supinación'      WHERE name = 'Chin Up';
UPDATE exercises SET name = 'Jalón al Pecho (Barra)'    WHERE name = 'Lat Pulldown (bar)';
UPDATE exercises SET name = 'Jalón al Pecho (Neutro)'   WHERE name = 'Lat Pulldown (neutral)';
UPDATE exercises SET name = 'Jalón Unilateral'          WHERE name = 'Single Arm Pulldown';
UPDATE exercises SET name = 'Jalón Brazos Rectos'       WHERE name = 'Straight Arm Pulldown';

-- ─── BRAZOS ─────────────────────────────────────────────
UPDATE exercises SET name = 'Barra Curl'                    WHERE name = 'Barbell Curl';
UPDATE exercises SET name = 'Mancuerna Curl'                WHERE name = 'Dumbbell Curl';
UPDATE exercises SET name = 'Curl Inclinado con Mancuerna'  WHERE name = 'Incline Dumbbell Curl';
UPDATE exercises SET name = 'Curl en Cable'                 WHERE name = 'Cable Curl';
UPDATE exercises SET name = 'Curl Martillo'                 WHERE name = 'Hammer Curl';
UPDATE exercises SET name = 'Curl en Predicador (Máquina)'  WHERE name = 'Preacher Curl (machine)';
UPDATE exercises SET name = 'Press Banca Agarre Cerrado'    WHERE name = 'Close Grip Bench Press';
UPDATE exercises SET name = 'Extensión Tríceps Cable'       WHERE name = 'Tricep Pushdown (cable)';
UPDATE exercises SET name = 'Extensión Tríceps sobre Cabeza' WHERE name = 'Overhead Tricep Ext (cable)';
UPDATE exercises SET name = 'Rompecráneos'                  WHERE name = 'Skull Crushers';
UPDATE exercises SET name = 'Fondos de Tríceps'             WHERE name = 'Dips (tricep)';

-- ─── CORE ───────────────────────────────────────────────
UPDATE exercises SET name = 'Plancha'                   WHERE name = 'Plank';
UPDATE exercises SET name = 'Crunch en Cable'           WHERE name = 'Cable Crunch';
UPDATE exercises SET name = 'Elevación Piernas Colgado' WHERE name = 'Hanging Leg Raise';
UPDATE exercises SET name = 'Rueda Abdominal'           WHERE name = 'Ab Wheel';
UPDATE exercises SET name = 'Press Pallof'              WHERE name = 'Pallof Press';
UPDATE exercises SET name = 'Rotación con Landmine'     WHERE name = 'Landmine Rotation';

-- ─── GEMELOS ─────────────────────────────────────────────
UPDATE exercises SET name = 'Elevación Talones de Pie'  WHERE name = 'Standing Calf Raise';
UPDATE exercises SET name = 'Elevación Talones Sentado' WHERE name = 'Seated Calf Raise';
UPDATE exercises SET name = 'Elevación Talones en Prensa' WHERE name = 'Leg Press Calf Raise';

-- ─── VERIFICACIÓN ────────────────────────────────────────
-- Ejecuta esto al final para confirmar que no quedaron nombres en inglés:
-- SELECT name FROM exercises WHERE name ~* '(barbell|dumbbell|deadlift|squat|press|curl|row|pulldown|raise|thrust|crunch|plank)' ORDER BY name;
