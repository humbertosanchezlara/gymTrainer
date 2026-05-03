-- =============================================
-- Migration: Agregar Dominadas con Apoyo
-- Correr en: Supabase -> SQL Editor
-- =============================================

INSERT INTO exercises (user_id, name, category, status)
SELECT p.id, 'Dominadas con Apoyo', 'PULL_VERTICAL', 'YES'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM exercises e
  WHERE e.user_id = p.id
    AND e.name = 'Dominadas con Apoyo'
);

-- Verificación
SELECT u.email, e.name, e.category, e.status
FROM exercises e
JOIN auth.users u ON u.id = e.user_id
WHERE e.name = 'Dominadas con Apoyo'
ORDER BY u.email;
