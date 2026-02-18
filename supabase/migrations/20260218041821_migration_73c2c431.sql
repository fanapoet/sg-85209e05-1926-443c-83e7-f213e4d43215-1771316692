-- Update tasks table constraint to include 'progressive'
ALTER TABLE tasks 
DROP CONSTRAINT tasks_task_type_check;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_task_type_check 
CHECK (task_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'milestone'::text, 'progressive'::text]));