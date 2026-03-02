CREATE POLICY "Public can delete task state"
ON user_task_state
FOR DELETE
TO public
USING (true);