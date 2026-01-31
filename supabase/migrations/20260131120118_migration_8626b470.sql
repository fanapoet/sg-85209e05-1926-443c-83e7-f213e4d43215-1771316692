-- Add missing column for total taps tracking (used for character level)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_taps BIGINT DEFAULT 0;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_total_taps ON profiles(total_taps);

-- Update comment
COMMENT ON COLUMN profiles.total_taps IS 'Total number of taps performed by user (used for character level calculation)';