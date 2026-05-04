-- =============================================
-- Migration: Injury-aware programming support
-- Run this in Supabase SQL Editor after base schema and program migrations
-- =============================================

CREATE TABLE IF NOT EXISTS user_injuries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  body_part TEXT NOT NULL,
  side TEXT CHECK (side IN ('left', 'right', 'bilateral', 'unspecified')) DEFAULT 'unspecified',
  pain_pattern TEXT CHECK (pain_pattern IN ('during_exercise', 'delayed_next_day', 'post_load_hours_later', 'load_threshold_only')) NOT NULL DEFAULT 'during_exercise',
  trigger_sensation TEXT,
  avoided_exercise_names TEXT[] NOT NULL DEFAULT '{}',
  tolerated_exercise_names TEXT[] NOT NULL DEFAULT '{}',
  clean_weeks_required INTEGER NOT NULL DEFAULT 2,
  progression_order TEXT[] NOT NULL DEFAULT ARRAY['range', 'reps', 'weight'],
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS injury_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  injury_id UUID REFERENCES user_injuries(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  checkin_date DATE NOT NULL,
  symptom_level TEXT CHECK (symptom_level IN ('pending', 'none', 'mild_self_resolving', 'lasting_hours')) NOT NULL DEFAULT 'pending',
  free_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(injury_id, session_id)
);

ALTER TABLE session_logs
  ADD COLUMN IF NOT EXISTS range_status TEXT CHECK (range_status IN ('partial', 'target', 'unknown')) DEFAULT 'unknown';

ALTER TABLE user_injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE injury_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own injuries" ON user_injuries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own injury checkins" ON injury_checkins FOR ALL USING (auth.uid() = user_id);
