-- Copy the exact same policy structure from user_reward_state
-- SELECT policy
CREATE POLICY "Users can view their own task state"
ON user_task_state
FOR SELECT
TO public
USING (
  user_id IN (
    SELECT id FROM profiles WHERE telegram_id = (
      SELECT COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
        (current_setting('request.jwt.claims', true)::json->>'sub')::bigint
      )
    )
  )
);