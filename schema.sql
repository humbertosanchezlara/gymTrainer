-- =============================================
-- FitApp Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create Enums
CREATE TYPE exercise_status AS ENUM ('YES', 'SUB', 'NO');
CREATE TYPE movement_category AS ENUM (
  'QUAD_DOMINANT', 'POSTERIOR_CHAIN', 
  'PUSH_HORIZONTAL', 'PUSH_VERTICAL', 
  'PULL_HORIZONTAL', 'PULL_VERTICAL', 
  'ARMS', 'CORE', 'CALVES'
);

-- 2. Profiles Table (from IDENTITY.md)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  training_experience TEXT,
  goal TEXT,
  schedule_days INTEGER,
  equipment_access TEXT,
  limitations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Exercises Table (from exercise_library.md)
CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  category movement_category NOT NULL,
  status exercise_status DEFAULT 'YES',
  notes TEXT,
  CONSTRAINT unique_exercise_per_user UNIQUE(user_id, name)
);

-- 4. Working Weights (from IDENTITY.md / lift_log.md)
CREATE TABLE working_weights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  weight NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_weight_per_exercise UNIQUE(user_id, exercise_id)
);

-- 5. Sessions (from lift_log.md)
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  name TEXT NOT NULL,
  week_num INTEGER,
  block_num INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Session Logs (individual set entries)
CREATE TABLE session_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  sets INTEGER NOT NULL,
  reps_per_set INTEGER NOT NULL,
  weight NUMERIC NOT NULL,
  rpe NUMERIC,
  notes TEXT
);

-- 7. Block Metrics (from programme_template.md)
CREATE TABLE block_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  block_num INTEGER NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  start_weight NUMERIC,
  end_wk4_weight NUMERIC,
  end_wk8_weight NUMERIC,
  end_wk11_weight NUMERIC,
  UNIQUE(user_id, block_num, exercise_id)
);

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_metrics ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Exercises policies
CREATE POLICY "Users manage own exercises" ON exercises FOR ALL USING (auth.uid() = user_id);

-- Working weights policies
CREATE POLICY "Users manage own weights" ON working_weights FOR ALL USING (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY "Users manage own sessions" ON sessions FOR ALL USING (auth.uid() = user_id);

-- Session logs policies (ownership via session join)
CREATE POLICY "Users manage own logs" ON session_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_logs.session_id AND sessions.user_id = auth.uid()));

-- Block metrics policies
CREATE POLICY "Users manage own block metrics" ON block_metrics FOR ALL USING (auth.uid() = user_id);
