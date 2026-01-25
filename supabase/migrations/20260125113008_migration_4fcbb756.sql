-- 1. Update PROFILES table (add referral columns)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

-- 2. Update REFERRALS table (add simple bonus tracking)
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS bonus_claimed BOOLEAN DEFAULT FALSE;

-- 3. Update REFERRAL_EARNINGS table (add detailed tracking)
ALTER TABLE public.referral_earnings 
ADD COLUMN IF NOT EXISTS tap_earnings BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS idle_earnings BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pending BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_snapshot_tap BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_snapshot_idle BIGINT DEFAULT 0;

-- 4. Create indexes for new columns (for performance)
CREATE INDEX IF NOT EXISTS idx_profiles_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_earnings_pending ON public.referral_earnings(total_pending);