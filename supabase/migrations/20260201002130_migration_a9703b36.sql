-- Step 1: Drop all existing RLS policies on profiles table
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON profiles;
DROP POLICY IF EXISTS "Allow profile reads" ON profiles;

-- Step 2: Create new permissive policies that don't rely on auth.uid()
-- These allow Telegram Mini App to work without Supabase Auth

CREATE POLICY "Public can insert profiles" ON profiles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update profiles" ON profiles
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can read profiles" ON profiles
FOR SELECT
USING (true);

CREATE POLICY "Public can delete profiles" ON profiles
FOR DELETE
USING (true);