-- CLEANUP: Remove old/conflicting columns from referral_earnings
ALTER TABLE public.referral_earnings 
DROP COLUMN IF EXISTS amount,
DROP COLUMN IF EXISTS earnings_type,
DROP COLUMN IF EXISTS share_amount,
DROP COLUMN IF EXISTS earned_at;

-- CLEANUP: Remove old/conflicting columns from referrals
ALTER TABLE public.referrals
DROP COLUMN IF EXISTS invitee_reward_claimed,
DROP COLUMN IF EXISTS inviter_reward_claimed;

-- VERIFY: Ensure new columns exist (just to be safe)
ALTER TABLE public.referral_earnings 
ADD COLUMN IF NOT EXISTS tap_earnings BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS idle_earnings BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pending BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_snapshot_tap BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_snapshot_idle BIGINT DEFAULT 0;

ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS bonus_claimed BOOLEAN DEFAULT FALSE;