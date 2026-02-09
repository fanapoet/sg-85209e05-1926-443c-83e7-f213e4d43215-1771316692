-- Step 1: Drop the composite unique constraint
ALTER TABLE user_task_state 
DROP CONSTRAINT IF EXISTS user_task_state_user_task_unique;

-- Step 2: Add unique constraint on user_id only (one row per user)
ALTER TABLE user_task_state 
ADD CONSTRAINT user_task_state_user_id_unique UNIQUE (user_id);

-- Step 3: Drop task progress columns from user_task_state
ALTER TABLE user_task_state 
DROP COLUMN IF EXISTS task_id,
DROP COLUMN IF EXISTS task_type,
DROP COLUMN IF EXISTS current_progress,
DROP COLUMN IF EXISTS is_completed,
DROP COLUMN IF EXISTS is_claimed,
DROP COLUMN IF EXISTS completed_at,
DROP COLUMN IF EXISTS claimed_at,
DROP COLUMN IF EXISTS reset_at,
DROP COLUMN IF EXISTS expires_at;

-- Step 4: Make reset date columns NOT NULL with defaults
ALTER TABLE user_task_state 
ALTER COLUMN last_daily_reset_date SET DEFAULT CURRENT_DATE,
ALTER COLUMN last_daily_reset_date SET NOT NULL,
ALTER COLUMN last_weekly_reset_date SET DEFAULT CURRENT_DATE,
ALTER COLUMN last_weekly_reset_date SET NOT NULL;