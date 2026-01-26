-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code TEXT;
  telegram_id_value BIGINT;
BEGIN
  -- Extract telegram_id from user metadata
  telegram_id_value := (NEW.raw_user_meta_data->>'telegram_id')::BIGINT;
  
  -- Generate referral code from user ID
  ref_code := 'REF' || LPAD(
    UPPER(
      TO_HEX(
        ('x' || MD5(NEW.id::TEXT))::BIT(32)::INT
      )
    ),
    8,
    '0'
  );
  
  -- Insert profile with referral code and telegram_id
  INSERT INTO public.profiles (id, referral_code, telegram_id)
  VALUES (NEW.id, ref_code, telegram_id_value);
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;