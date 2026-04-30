-- =============================================
-- Migration: Add programs + program_days tables
-- Run this in Supabase SQL Editor AFTER schema.sql
-- =============================================

-- Add bodyweight to profiles (needed for weight estimation)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bodyweight NUMERIC;

-- Programs table
CREATE TABLE IF NOT EXISTS programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  split_type TEXT NOT NULL,
  total_days INTEGER NOT NULL,
  total_weeks INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Program days table
CREATE TABLE IF NOT EXISTS program_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
  week_num INTEGER NOT NULL DEFAULT 1,
  day_number INTEGER NOT NULL,
  day_name TEXT NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]',
  UNIQUE(program_id, week_num, day_number)
);

-- RLS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own programs" ON programs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own program days" ON program_days FOR ALL
  USING (EXISTS (SELECT 1 FROM programs WHERE programs.id = program_days.program_id AND programs.user_id = auth.uid()));
