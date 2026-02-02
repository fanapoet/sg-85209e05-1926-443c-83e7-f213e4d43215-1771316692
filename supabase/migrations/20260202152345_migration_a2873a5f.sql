-- Create user_reward_state table
CREATE TABLE user_reward_state (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id bigint UNIQUE,
  daily_streak integer DEFAULT 0,
  current_reward_week integer DEFAULT 1,
  last_daily_claim_date date,
  current_weekly_period_start timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_reward_state ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (same pattern as other tables)
CREATE POLICY "Users can view their own reward state"
  ON user_reward_state
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reward state"
  ON user_reward_state
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reward state"
  ON user_reward_state
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reward state"
  ON user_reward_state
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_reward_state_user ON user_reward_state(user_id);
CREATE INDEX idx_user_reward_state_telegram ON user_reward_state(telegram_id);

-- Add comment
COMMENT ON TABLE user_reward_state IS 'Stores user reward progression state for daily streaks and weekly challenges';