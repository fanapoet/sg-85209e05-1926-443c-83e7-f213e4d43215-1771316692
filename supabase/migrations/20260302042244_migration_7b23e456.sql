-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Users can insert their own task state" ON user_task_state;