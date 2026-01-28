-- ============================================
-- TABLE 1: build_parts (Master data for 50 parts)
-- ============================================
CREATE TABLE IF NOT EXISTS build_parts (
  id TEXT PRIMARY KEY,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 5),
  part_number INTEGER NOT NULL CHECK (part_number BETWEEN 1 AND 10),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  base_cost BIGINT NOT NULL,
  base_yield BIGINT NOT NULL,
  max_level INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE build_parts ENABLE ROW LEVEL SECURITY;

-- Public read access (master data)
CREATE POLICY "Anyone can view build parts" ON build_parts
  FOR SELECT USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_build_parts_stage ON build_parts(stage);

-- ============================================
-- TABLE 2: user_build_parts (User progress)
-- ============================================
CREATE TABLE IF NOT EXISTS user_build_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  part_id TEXT NOT NULL REFERENCES build_parts(id) ON DELETE CASCADE,
  current_level INTEGER NOT NULL DEFAULT 0 CHECK (current_level >= 0 AND current_level <= 20),
  is_building BOOLEAN DEFAULT false,
  build_started_at TIMESTAMP WITH TIME ZONE,
  build_ends_at TIMESTAMP WITH TIME ZONE,
  last_upgraded_at TIMESTAMP WITH TIME ZONE,
  total_yield_contributed BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, part_id)
);

-- Enable RLS
ALTER TABLE user_build_parts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own build parts
CREATE POLICY "Users can view their own build parts" ON user_build_parts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own build parts" ON user_build_parts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own build parts" ON user_build_parts
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_build_parts_user ON user_build_parts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_build_parts_building ON user_build_parts(user_id, is_building);

-- ============================================
-- TABLE 3: conversion_history (BZ ↔ BB transactions)
-- ============================================
CREATE TABLE IF NOT EXISTS conversion_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversion_type TEXT NOT NULL CHECK (conversion_type IN ('BZ_TO_BB', 'BB_TO_BZ')),
  amount_in NUMERIC NOT NULL,
  amount_out NUMERIC NOT NULL,
  burned_amount NUMERIC DEFAULT 0,
  tier_at_conversion TEXT NOT NULL,
  tier_bonus_percent INTEGER NOT NULL,
  exchange_rate NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE conversion_history ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversion history
CREATE POLICY "Users can view their own conversions" ON conversion_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversions" ON conversion_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversion_history_user ON conversion_history(user_id, created_at DESC);

-- ============================================
-- TABLE 4: daily_rewards (7-day cycle definitions)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_rewards (
  day INTEGER PRIMARY KEY CHECK (day BETWEEN 1 AND 7),
  bz_reward BIGINT DEFAULT 0,
  bb_reward NUMERIC DEFAULT 0,
  xp_reward BIGINT DEFAULT 0,
  description TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;

-- Public read access (master data)
CREATE POLICY "Anyone can view daily rewards" ON daily_rewards
  FOR SELECT USING (true);

-- ============================================
-- TABLE 5: user_daily_claims (User claim history)
-- ============================================
CREATE TABLE IF NOT EXISTS user_daily_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 7),
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  bz_claimed BIGINT DEFAULT 0,
  bb_claimed NUMERIC DEFAULT 0,
  xp_claimed BIGINT DEFAULT 0
);

-- Enable RLS
ALTER TABLE user_daily_claims ENABLE ROW LEVEL SECURITY;

-- Users can only access their own claims
CREATE POLICY "Users can view their own claims" ON user_daily_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own claims" ON user_daily_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_daily_claims_user ON user_daily_claims(user_id, claimed_at DESC);

-- ============================================
-- TABLE 6: nfts (Master list of 7 NFTs)
-- ============================================
CREATE TABLE IF NOT EXISTS nfts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_bb NUMERIC NOT NULL,
  requirement_type TEXT CHECK (requirement_type IN ('none', 'referrals', 'stage', 'taps', 'boosters', 'total_taps', 'xp')),
  requirement_value TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;

-- Public read access (master data)
CREATE POLICY "Anyone can view NFTs" ON nfts
  FOR SELECT USING (true);

-- ============================================
-- TABLE 7: user_nfts (User NFT ownership)
-- ============================================
CREATE TABLE IF NOT EXISTS user_nfts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nft_id TEXT NOT NULL REFERENCES nfts(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  price_paid_bb NUMERIC NOT NULL,
  UNIQUE(user_id, nft_id)
);

-- Enable RLS
ALTER TABLE user_nfts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own NFTs
CREATE POLICY "Users can view their own NFTs" ON user_nfts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own NFTs" ON user_nfts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_nfts_user ON user_nfts(user_id);

-- ============================================
-- TABLE 8: tasks (Daily/Weekly/Milestone definitions)
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('daily', 'weekly', 'milestone')),
  target_value INTEGER NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('BZ', 'BB', 'XP')),
  reward_amount NUMERIC NOT NULL,
  tracking_field TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Public read access (master data)
CREATE POLICY "Anyone can view active tasks" ON tasks
  FOR SELECT USING (is_active = true);

-- ============================================
-- TABLE 9: user_task_progress (User task tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS user_task_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP WITH TIME ZONE,
  reset_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_id, reset_at)
);

-- Enable RLS
ALTER TABLE user_task_progress ENABLE ROW LEVEL SECURITY;

-- Users can only access their own task progress
CREATE POLICY "Users can view their own task progress" ON user_task_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task progress" ON user_task_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task progress" ON user_task_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_task_progress_user ON user_task_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_task_progress_task ON user_task_progress(task_id);
CREATE INDEX IF NOT EXISTS idx_user_task_progress_reset ON user_task_progress(user_id, reset_at);