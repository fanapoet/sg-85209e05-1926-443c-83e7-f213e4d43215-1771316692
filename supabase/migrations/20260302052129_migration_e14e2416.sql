-- Create SELECT policy using auth.jwt() instead of querying auth.users
CREATE POLICY "Users can view their own task state" 
ON user_task_state 
FOR SELECT 
TO authenticated
USING (
  telegram_id = (auth.jwt()->>'telegram_id')::bigint
);