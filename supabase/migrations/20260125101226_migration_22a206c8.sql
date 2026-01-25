-- Create referrals table to track who invited whom
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id TEXT NOT NULL,
  invitee_id TEXT NOT NULL UNIQUE,
  referral_code TEXT NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  inviter_reward_claimed BOOLEAN DEFAULT FALSE,
  invitee_reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_invitee UNIQUE (invitee_id),
  CONSTRAINT no_self_referral CHECK (inviter_id != invitee_id)
);

-- Create referral_earnings table to track 20% lifetime share
CREATE TABLE IF NOT EXISTS referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id TEXT NOT NULL,
  invitee_id TEXT NOT NULL,
  earnings_type TEXT NOT NULL CHECK (earnings_type IN ('tap', 'idle', 'boost')),
  amount BIGINT NOT NULL,
  share_amount BIGINT NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  claimed_at TIMESTAMP WITH TIME ZONE
);

-- Create referral_milestones table to track milestone claims
CREATE TABLE IF NOT EXISTS referral_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  milestone INTEGER NOT NULL CHECK (milestone IN (5, 10, 25, 50)),
  xp_reward INTEGER NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_milestone UNIQUE (user_id, milestone)
);

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view referrals they're part of" ON referrals
  FOR SELECT USING (
    inviter_id = current_setting('app.current_user_id', true) OR 
    invitee_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY "Users can insert referrals as invitees" ON referrals
  FOR INSERT WITH CHECK (
    invitee_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY "Users can update their own referral rewards" ON referrals
  FOR UPDATE USING (
    inviter_id = current_setting('app.current_user_id', true) OR 
    invitee_id = current_setting('app.current_user_id', true)
  );

-- RLS Policies for referral_earnings
CREATE POLICY "Users can view their own earnings" ON referral_earnings
  FOR SELECT USING (inviter_id = current_setting('app.current_user_id', true));

CREATE POLICY "Anyone can insert earnings" ON referral_earnings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own earnings" ON referral_earnings
  FOR UPDATE USING (inviter_id = current_setting('app.current_user_id', true));

-- RLS Policies for referral_milestones
CREATE POLICY "Users can view their own milestones" ON referral_milestones
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert their own milestones" ON referral_milestones
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_id);
CREATE INDEX IF NOT EXISTS idx_referrals_invitee ON referrals(invitee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_earnings_inviter ON referral_earnings(inviter_id);
CREATE INDEX IF NOT EXISTS idx_earnings_invitee ON referral_earnings(invitee_id);
CREATE INDEX IF NOT EXISTS idx_earnings_claimed ON referral_earnings(claimed);
CREATE INDEX IF NOT EXISTS idx_milestones_user ON referral_milestones(user_id);