-- =============================================
-- Fix program_days uniqueness to support multiple weeks
-- Run this in Supabase SQL Editor
-- =============================================

ALTER TABLE program_days
  ADD COLUMN IF NOT EXISTS week_num INTEGER NOT NULL DEFAULT 1;

ALTER TABLE program_days
  DROP CONSTRAINT IF EXISTS program_days_program_id_day_number_key;

ALTER TABLE program_days
  ADD CONSTRAINT program_days_program_id_week_num_day_number_key
  UNIQUE (program_id, week_num, day_number);
