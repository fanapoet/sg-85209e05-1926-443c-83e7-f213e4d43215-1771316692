-- Drop the foreign key constraint that's blocking task sync
ALTER TABLE user_task_progress 
DROP CONSTRAINT IF EXISTS user_task_progress_task_id_fkey;

-- Verify constraint is gone
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'user_task_progress' 
  AND constraint_name = 'user_task_progress_task_id_fkey';