-- Create PUBLIC policies (exact copy from user_reward_state)
CREATE POLICY "Public can view task state"
ON user_task_state
FOR SELECT
TO public
USING (true);