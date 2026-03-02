-- Create INSERT policy using auth.jwt()
CREATE POLICY "Users can insert their own task state" 
ON user_task_state 
FOR INSERT 
TO authenticated
WITH CHECK (
  telegram_id = (auth.jwt()->>'telegram_id')::bigint
);