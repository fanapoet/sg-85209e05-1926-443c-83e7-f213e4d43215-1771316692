-- Drop all existing policies on user_task_state
DROP POLICY IF EXISTS "Users can insert their own task state" ON user_task_state;
DROP POLICY IF EXISTS "Users can view their own task state" ON user_task_state;
DROP POLICY IF EXISTS "Users can update their own task state" ON user_task_state;

-- Create new policies based on telegram_id from auth metadata (ROBUST FIX)
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