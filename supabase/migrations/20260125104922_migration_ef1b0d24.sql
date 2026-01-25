-- Drop existing tables if they have issues (safe since new project)
DROP TABLE IF EXISTS referral_milestones CASCADE;
DROP TABLE IF EXISTS referral_earnings CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;

-- Create referrals table (tracks who invited whom)
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  inviter_reward_claimed BOOLEAN DEFAULT FALSE,
  invitee_reward_claimed BOOLEAN DEFAULT FALSE,
  UNIQUE(invitee_id),
  CHECK(inviter_id != invitee_id)
);

-- Create referral_earnings table (tracks 20% lifetime share)
CREATE TABLE referral_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  earnings_type TEXT NOT NULL CHECK (earnings_type IN ('tap', 'idle', 'boost')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  share_amount INTEGER NOT NULL CHECK (share_amount > 0),
  claimed BOOLEAN DEFAULT FALSE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  claimed_at TIMESTAMP WITH TIME ZONE
);

-- Create referral_milestones table (tracks milestone XP rewards)
CREATE TABLE referral_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone INTEGER NOT NULL CHECK (milestone IN (5, 10, 25, 50)),
  xp_reward INTEGER NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, milestone)
);

-- Create indexes for performance
CREATE INDEX idx_referrals_inviter ON referrals(inviter_id);
CREATE INDEX idx_referrals_invitee ON referrals(invitee_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_earnings_inviter ON referral_earnings(inviter_id);
CREATE INDEX idx_earnings_invitee ON referral_earnings(invitee_id);
CREATE INDEX idx_earnings_claimed ON referral_earnings(claimed);
CREATE INDEX idx_milestones_user ON referral_milestones(user_id);

-- Enable Row Level Security
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals table
CREATE POLICY "Users can view their own referrals as inviter"
  ON referrals FOR SELECT
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can view their own referrals as invitee"
  ON referrals FOR SELECT
  USING (auth.uid() = invitee_id);

CREATE POLICY "Anyone can create referrals"
  ON referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own referral rewards"
  ON referrals FOR UPDATE
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- RLS Policies for referral_earnings table
CREATE POLICY "Users can view their earnings as inviter"
  ON referral_earnings FOR SELECT
  USING (auth.uid() = inviter_id);

CREATE POLICY "Anyone can create earnings"
  ON referral_earnings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Inviters can update their earnings"
  ON referral_earnings FOR UPDATE
  USING (auth.uid() = inviter_id);

-- RLS Policies for referral_milestones table
CREATE POLICY "Users can view their own milestones"
  ON referral_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own milestones"
  ON referral_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);