-- DROP STRICT POLICIES (They fail because we don't use Supabase Auth)
DROP POLICY IF EXISTS "Users can view their own task progress" ON user_task_progress;
DROP POLICY IF EXISTS "Users can insert their own task progress" ON user_task_progress;
DROP POLICY IF EXISTS "Users can update their own task progress" ON user_task_progress;
DROP POLICY IF EXISTS "Users can delete their own task progress" ON user_task_progress;

-- ENABLE PUBLIC ACCESS (Matches "No Supabase Auth" architecture)
-- Note: Security relies on the client/logic in this architecture
ALTER TABLE user_task_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for task progress" 
ON user_task_progress 
FOR ALL 
USING (true) 
WITH CHECK (true);