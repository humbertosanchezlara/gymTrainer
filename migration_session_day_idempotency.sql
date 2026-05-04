-- Track the scheduled program day for saved gym sessions and prevent
-- retry/refresh duplicates from advancing program progress.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS day_num INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS sessions_user_program_week_day_unique_idx
  ON sessions (user_id, program_id, week_num, day_num)
  WHERE block_num IS NOT NULL
    AND program_id IS NOT NULL
    AND week_num IS NOT NULL
    AND day_num IS NOT NULL;
