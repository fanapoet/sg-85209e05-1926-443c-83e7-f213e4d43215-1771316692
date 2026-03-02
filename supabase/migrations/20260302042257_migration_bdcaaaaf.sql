-- Create a proper INSERT policy with WITH CHECK clause
CREATE POLICY "Users can insert their own task state" 
ON user_task_state 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);