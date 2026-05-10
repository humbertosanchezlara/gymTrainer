-- =============================================
-- Migration: Persist program exercise replacements
-- Run this in Supabase SQL Editor after migration_programs.sql
-- =============================================

CREATE TABLE IF NOT EXISTS program_exercise_replacements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
  from_exercise_id UUID REFERENCES exercises(id) NOT NULL,
  to_exercise_id UUID REFERENCES exercises(id) NOT NULL,
  from_week_num INTEGER NOT NULL DEFAULT 1,
  compatible_categories TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT program_exercise_replacements_distinct_exercises
    CHECK (from_exercise_id <> to_exercise_id),
  CONSTRAINT program_exercise_replacements_unique_from
    UNIQUE (program_id, from_exercise_id)
);

CREATE INDEX IF NOT EXISTS program_exercise_replacements_program_week_idx
  ON program_exercise_replacements(program_id, from_week_num)
  WHERE is_active = true;

ALTER TABLE program_exercise_replacements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own program exercise replacements"
  ON program_exercise_replacements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM programs
      WHERE programs.id = program_exercise_replacements.program_id
        AND programs.user_id = auth.uid()
    )
  );
