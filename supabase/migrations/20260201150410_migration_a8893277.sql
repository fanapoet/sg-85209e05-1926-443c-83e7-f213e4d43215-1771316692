-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own build parts" ON user_build_parts;
DROP POLICY IF EXISTS "Users can update own build parts" ON user_build_parts;
DROP POLICY IF EXISTS "Users can view own build parts" ON user_build_parts;
DROP POLICY IF EXISTS "Users can delete own build parts" ON user_build_parts;

-- Create new simplified policies
-- Since we're using Telegram auth (not Supabase auth), and we control user_id in the app,
-- we just need to ensure user_id exists in profiles table

CREATE POLICY "Allow insert for valid profile users"
ON user_build_parts
FOR INSERT
WITH CHECK (
  user_id IN (SELECT id FROM profiles)
);

CREATE POLICY "Allow update for valid profile users"
ON user_build_parts
FOR UPDATE
USING (
  user_id IN (SELECT id FROM profiles)
);

CREATE POLICY "Allow select for valid profile users"
ON user_build_parts
FOR SELECT
USING (
  user_id IN (SELECT id FROM profiles)
);

CREATE POLICY "Allow delete for valid profile users"
ON user_build_parts
FOR DELETE
USING (
  user_id IN (SELECT id FROM profiles)
);