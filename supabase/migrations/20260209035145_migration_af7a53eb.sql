-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert their own task state" ON user_task_state;
DROP POLICY IF EXISTS "Users can update their own task state" ON user_task_state;
DROP POLICY IF EXISTS "Users can view their own task state" ON user_task_state;

-- Create new permissive policies that match our auth pattern
CREATE POLICY "Anyone can insert task state with telegram_id"
  ON user_task_state
  FOR INSERT
  WITH CHECK (telegram_id IS NOT NULL);

CREATE POLICY "Anyone can update task state by telegram_id"
  ON user_task_state
  FOR UPDATE
  USING (telegram_id IS NOT NULL);

CREATE POLICY "Anyone can view task state by telegram_id"
  ON user_task_state
  FOR SELECT
  USING (telegram_id IS NOT NULL);