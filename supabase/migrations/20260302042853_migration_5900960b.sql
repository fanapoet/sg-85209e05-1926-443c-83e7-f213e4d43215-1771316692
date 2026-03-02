-- Create new policies based on telegram_id from auth metadata
CREATE POLICY "Users can view their own task state" 
ON user_task_state 
FOR SELECT 
TO public
USING (
  telegram_id = (
    SELECT (raw_user_meta_data->>'telegram_id')::bigint 
    FROM auth.users 
    WHERE id = auth.uid()
  )
);