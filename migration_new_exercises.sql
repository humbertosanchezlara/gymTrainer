-- =============================================
-- Migration: Agregar 4 nuevos ejercicios de
--            aislamiento tren inferior
-- Correr en: Supabase → SQL Editor
-- =============================================

-- Inserta los ejercicios para todos los usuarios existentes
-- (omite si ya existen gracias al WHERE NOT EXISTS)

INSERT INTO exercises (user_id, name, category, status)
SELECT p.id, 'Patada de Glúteo', 'POSTERIOR_CHAIN', 'YES'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e WHERE e.user_id = p.id AND e.name = 'Patada de Glúteo'
);

INSERT INTO exercises (user_id, name, category, status)
SELECT p.id, 'Abductores (Máquina)', 'POSTERIOR_CHAIN', 'YES'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e WHERE e.user_id = p.id AND e.name = 'Abductores (Máquina)'
);

INSERT INTO exercises (user_id, name, category, status)
SELECT p.id, 'Aductores (Máquina)', 'QUAD_DOMINANT', 'YES'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e WHERE e.user_id = p.id AND e.name = 'Aductores (Máquina)'
);

INSERT INTO exercises (user_id, name, category, status)
SELECT p.id, 'Prensa Horizontal (Máquina)', 'QUAD_DOMINANT', 'YES'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e WHERE e.user_id = p.id AND e.name = 'Prensa Horizontal (Máquina)'
);

-- Verificación: confirma que se insertaron correctamente
SELECT u.email, e.name, e.category, e.status
FROM exercises e
JOIN auth.users u ON u.id = e.user_id
WHERE e.name IN (
  'Patada de Glúteo',
  'Abductores (Máquina)',
  'Aductores (Máquina)',
  'Prensa Horizontal (Máquina)'
)
ORDER BY u.email, e.name;
