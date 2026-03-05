-- Create user_weekly_challenges table for tracking weekly challenge progress
CREATE TABLE user_weekly_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  
  -- Challenge identifiers
  challenge_key TEXT NOT NULL CHECK (challenge_key IN ('tapper', 'builder', 'converter', 'recruiter')),
  
  -- Progress tracking
  current_progress INTEGER NOT NULL DEFAULT 0,
  baseline_value BIGINT NOT NULL DEFAULT 0, -- Baseline at week start (total counter value when week started)
  target_value INTEGER NOT NULL,
  
  -- Status
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  
  -- Weekly period tracking
  week_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  week_number INTEGER NOT NULL, -- Week number in the year (1-53)
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  
  -- Timestamps
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one challenge per user per week
  CONSTRAINT user_weekly_challenges_unique UNIQUE (user_id, challenge_key, week_start_date),
  
  -- Ensure progress doesn't exceed target
  CONSTRAINT progress_valid CHECK (current_progress >= 0),
  
  -- Ensure claimed requires completed
  CONSTRAINT claimed_requires_completed CHECK (NOT claimed OR completed)
);

-- Create indexes for efficient queries
CREATE INDEX idx_weekly_challenges_user ON user_weekly_challenges(user_id);
CREATE INDEX idx_weekly_challenges_telegram ON user_weekly_challenges(telegram_id);
CREATE INDEX idx_weekly_challenges_week ON user_weekly_challenges(week_start_date);
CREATE INDEX idx_weekly_challenges_status ON user_weekly_challenges(user_id, claimed, week_start_date);
CREATE INDEX idx_weekly_challenges_key ON user_weekly_challenges(challenge_key);
CREATE INDEX idx_weekly_challenges_completed ON user_weekly_challenges(user_id, completed, claimed);

-- Enable Row Level Security
ALTER TABLE user_weekly_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own weekly challenges"
  ON user_weekly_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly challenges"
  ON user_weekly_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly challenges"
  ON user_weekly_challenges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly challenges"
  ON user_weekly_challenges FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_weekly_challenges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_weekly_challenges_updated_at
  BEFORE UPDATE ON user_weekly_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_challenges_updated_at();

-- Add helpful comments
COMMENT ON TABLE user_weekly_challenges IS 'Tracks user progress on weekly challenges with baseline values for delta calculations';
COMMENT ON COLUMN user_weekly_challenges.challenge_key IS 'Challenge type: tapper, builder, converter, recruiter';
COMMENT ON COLUMN user_weekly_challenges.baseline_value IS 'Total counter value when this weekly period started (used for delta calculation)';
COMMENT ON COLUMN user_weekly_challenges.current_progress IS 'Current progress within this week (delta from baseline)';
COMMENT ON COLUMN user_weekly_challenges.week_start_date IS 'Date when this weekly period started';
COMMENT ON COLUMN user_weekly_challenges.week_number IS 'ISO week number (1-53) for easy querying';