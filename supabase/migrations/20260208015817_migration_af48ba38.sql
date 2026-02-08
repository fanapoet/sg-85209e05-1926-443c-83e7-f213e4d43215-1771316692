-- Create user_task_state table (matches reward_state pattern)
CREATE TABLE IF NOT EXISTS user_task_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL UNIQUE,
  last_daily_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_weekly_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_task_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own task state" 
  ON user_task_state FOR SELECT 
  USING (telegram_id = (SELECT telegram_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own task state" 
  ON user_task_state FOR INSERT 
  WITH CHECK (telegram_id = (SELECT telegram_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own task state" 
  ON user_task_state FOR UPDATE 
  USING (telegram_id = (SELECT telegram_id FROM profiles WHERE id = auth.uid()));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_task_state_telegram_id ON user_task_state(telegram_id);