CREATE POLICY "Public can update task state"
ON user_task_state
FOR UPDATE
TO public
USING (true);