-- Create INSERT policy
CREATE POLICY "Users can insert their own task state" 
ON user_task_state 
FOR INSERT 
TO authenticated
WITH CHECK (
  telegram_id = (
    SELECT (raw_user_meta_data->>'telegram_id')::bigint 
    FROM auth.users 
    WHERE id = auth.uid()
  )
);