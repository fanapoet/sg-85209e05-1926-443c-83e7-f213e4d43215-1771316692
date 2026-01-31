-- ============================================
-- BUNERGY DATABASE SCHEMA VERIFICATION SCRIPT
-- ============================================
-- Run this script to verify all tables and columns exist
-- This is a READ-ONLY script - it only checks, doesn't modify

-- 1. CHECK IF TABLES EXIST
SELECT 
  'profiles' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) as exists;

SELECT 
  'user_build_parts' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_build_parts'
  ) as exists;

SELECT 
  'conversion_history' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversion_history'
  ) as exists;

SELECT 
  'user_nfts' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_nfts'
  ) as exists;

SELECT 
  'daily_rewards' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'daily_rewards'
  ) as exists;

SELECT 
  'referrals' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'referrals'
  ) as exists;

SELECT 
  'tasks' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tasks'
  ) as exists;

-- 2. CHECK PROFILES TABLE COLUMNS
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. CHECK IF total_taps COLUMN EXISTS (newly added)
SELECT 
  'total_taps column exists' as check_name,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'total_taps'
  ) as exists;

-- 4. CHECK RLS POLICIES ON PROFILES
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 5. CHECK USER_BUILD_PARTS STRUCTURE
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_build_parts'
ORDER BY ordinal_position;

-- 6. CHECK CONVERSION_HISTORY STRUCTURE
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'conversion_history'
ORDER BY ordinal_position;

-- 7. CHECK USER_NFTS STRUCTURE
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_nfts'
ORDER BY ordinal_position;

-- 8. VERIFY FOREIGN KEY CONSTRAINTS
SELECT
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('user_build_parts', 'conversion_history', 'user_nfts', 'daily_rewards', 'referrals', 'tasks');

-- 9. CHECK INDEXES FOR PERFORMANCE
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'user_build_parts', 'conversion_history', 'user_nfts', 'referrals')
ORDER BY tablename, indexname;

-- 10. VERIFY RLS IS ENABLED
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'user_build_parts', 'conversion_history', 'user_nfts', 'daily_rewards', 'referrals', 'tasks');

-- 11. COUNT EXISTING DATA (OPTIONAL - to verify migration didn't lose data)
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL
SELECT 'user_build_parts', COUNT(*) FROM user_build_parts
UNION ALL
SELECT 'conversion_history', COUNT(*) FROM conversion_history
UNION ALL
SELECT 'user_nfts', COUNT(*) FROM user_nfts
UNION ALL
SELECT 'daily_rewards', COUNT(*) FROM daily_rewards
UNION ALL
SELECT 'referrals', COUNT(*) FROM referrals
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks;

-- 12. CHECK FOR NULL VALUES IN CRITICAL COLUMNS
SELECT 
  'profiles.bz_balance has nulls' as check_name,
  COUNT(*) as null_count
FROM profiles
WHERE bz_balance IS NULL;

SELECT 
  'profiles.bb_balance has nulls' as check_name,
  COUNT(*) as null_count
FROM profiles
WHERE bb_balance IS NULL;

SELECT 
  'profiles.xp has nulls' as check_name,
  COUNT(*) as null_count
FROM profiles
WHERE xp IS NULL;

SELECT 
  'profiles.total_taps has nulls' as check_name,
  COUNT(*) as null_count
FROM profiles
WHERE total_taps IS NULL;

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- 1. All tables should exist (exists = true)
-- 2. profiles table should have ~30+ columns including total_taps
-- 3. total_taps column should exist (exists = true)
-- 4. RLS policies should be present for all tables
-- 5. Foreign keys should reference auth.users(id) or profiles(id)
-- 6. Indexes should exist on user_id columns
-- 7. RLS should be enabled (rowsecurity = true)
-- 8. Row counts should match your data
-- 9. No NULL values in critical columns (or 0 null_count)

-- ============================================
-- IF ANY CHECK FAILS:
-- ============================================
-- Report which check failed and I'll provide a fix script