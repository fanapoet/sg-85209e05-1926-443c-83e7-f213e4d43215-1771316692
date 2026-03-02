-- INSERT policy
CREATE POLICY "Users can insert their own task state"
ON user_task_state
FOR INSERT
TO public
WITH CHECK (
  user_id IN (
    SELECT id FROM profiles WHERE telegram_id = (
      SELECT COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
        (current_setting('request.jwt.claims', true)::json->>'sub')::bigint
      )
    )
  )
);