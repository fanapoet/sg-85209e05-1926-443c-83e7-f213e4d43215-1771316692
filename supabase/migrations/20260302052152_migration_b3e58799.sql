-- Create UPDATE policy using auth.jwt()
CREATE POLICY "Users can update their own task state" 
ON user_task_state 
FOR UPDATE 
TO authenticated
USING (
  telegram_id = (auth.jwt()->>'telegram_id')::bigint
);