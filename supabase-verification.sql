-- ============================================
-- BUNERGY SUPABASE SCHEMA VERIFICATION
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- READ-ONLY - Safe to run anytime
-- ============================================

-- ===================================
-- SECTION 1: TABLE EXISTENCE CHECK
-- ===================================
SELECT 
  'profiles' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) as exists
UNION ALL
SELECT 
  'user_build_parts',
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_build_parts'
  )
UNION ALL
SELECT 
  'conversion_history',
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversion_history'
  )
UNION ALL
SELECT 
  'user_nfts',
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_nfts'
  )
UNION ALL
SELECT 
  'daily_rewards',
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'daily_rewards'
  )
UNION ALL
SELECT 
  'referrals',
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'referrals'
  )
UNION ALL
SELECT 
  'tasks',
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tasks'
  );

-- ===================================
-- SECTION 2: PROFILES TABLE STRUCTURE
-- ===================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ===================================
-- SECTION 3: CRITICAL COLUMNS CHECK
-- ===================================
SELECT 
  'total_taps column exists' as check_name,
  EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'total_taps'
  ) as exists
UNION ALL
SELECT 
  'bz_balance column exists',
  EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'bz_balance'
  )
UNION ALL
SELECT 
  'bb_balance column exists',
  EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'bb_balance'
  )
UNION ALL
SELECT 
  'xp column exists',
  EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'xp'
  )
UNION ALL
SELECT 
  'booster_income_per_tap exists',
  EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'booster_income_per_tap'
  )
UNION ALL
SELECT 
  'quickcharge_uses_remaining exists',
  EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'quickcharge_uses_remaining'
  );

-- ===================================
-- SECTION 4: RLS POLICIES
-- ===================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ===================================
-- SECTION 5: FOREIGN KEY CONSTRAINTS
-- ===================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ===================================
-- SECTION 6: INDEXES
-- ===================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ===================================
-- SECTION 7: RLS ENABLED CHECK
-- ===================================
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ===================================
-- SECTION 8: DATA COUNTS
-- ===================================
SELECT 
  'profiles' as table_name,
  COUNT(*) as row_count
FROM profiles
UNION ALL
SELECT 
  'user_build_parts',
  COUNT(*)
FROM user_build_parts
UNION ALL
SELECT 
  'conversion_history',
  COUNT(*)
FROM conversion_history
UNION ALL
SELECT 
  'user_nfts',
  COUNT(*)
FROM user_nfts
UNION ALL
SELECT 
  'daily_rewards',
  COUNT(*)
FROM daily_rewards
UNION ALL
SELECT 
  'referrals',
  COUNT(*)
FROM referrals
UNION ALL
SELECT 
  'tasks',
  COUNT(*)
FROM tasks;

-- ===================================
-- SECTION 9: NULL VALUE CHECKS
-- ===================================
SELECT 
  'profiles with NULL telegram_id' as check_name,
  COUNT(*) as null_count
FROM profiles
WHERE telegram_id IS NULL
UNION ALL
SELECT 
  'profiles with NULL bz_balance',
  COUNT(*)
FROM profiles
WHERE bz_balance IS NULL
UNION ALL
SELECT 
  'profiles with NULL bb_balance',
  COUNT(*)
FROM profiles
WHERE bb_balance IS NULL
UNION ALL
SELECT 
  'profiles with NULL xp',
  COUNT(*)
FROM profiles
WHERE xp IS NULL
UNION ALL
SELECT 
  'profiles with NULL total_taps',
  COUNT(*)
FROM profiles
WHERE total_taps IS NULL;

-- ===================================
-- SECTION 10: USER_BUILD_PARTS STRUCTURE
-- ===================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_build_parts'
ORDER BY ordinal_position;

-- ===================================
-- SECTION 11: SAMPLE DATA CHECK (First 5 rows)
-- ===================================
SELECT 
  id,
  telegram_id,
  username,
  bz_balance,
  bb_balance,
  xp,
  tier,
  total_taps,
  current_energy,
  max_energy
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- ===================================
-- END OF VERIFICATION SCRIPT
-- ===================================
-- If all checks pass, your database is ready for sync!
-- If any check fails, copy the failed section and report it.