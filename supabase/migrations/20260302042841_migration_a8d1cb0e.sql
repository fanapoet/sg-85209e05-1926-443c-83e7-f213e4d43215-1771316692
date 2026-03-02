-- Drop all existing policies
DROP POLICY IF EXISTS "Users can insert their own task state" ON user_task_state;
DROP POLICY IF EXISTS "Users can view their own task state" ON user_task_state;
DROP POLICY IF EXISTS "Users can update their own task state" ON user_task_state;