CREATE POLICY "Public can insert task state"
ON user_task_state
FOR INSERT
TO public
WITH CHECK (true);