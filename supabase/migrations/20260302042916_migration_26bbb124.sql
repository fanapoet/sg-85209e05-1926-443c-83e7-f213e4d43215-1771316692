-- Create UPDATE policy
CREATE POLICY "Users can update their own task state" 
ON user_task_state 
FOR UPDATE 
TO public
USING (
  telegram_id = (
    SELECT (raw_user_meta_data->>'telegram_id')::bigint 
    FROM auth.users 
    WHERE id = auth.uid()
  )
);