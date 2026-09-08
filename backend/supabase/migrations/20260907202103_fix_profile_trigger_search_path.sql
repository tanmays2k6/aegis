/*
# Fix profile creation trigger on signup

## Plain-English summary
The trigger that auto-creates a profile row when a new user signs up was failing
because it did not set a search_path. Without an explicit search_path, the SECURITY
DEFINER function could not reliably resolve the `profiles` table, causing the entire
signup transaction to roll back with a generic "database error saving new user".

## Changes
1. Recreates handle_new_user() with `SET search_path = public` so it resolves
   the profiles table correctly regardless of the caller's search_path.
2. Reattaches the on_auth_user_created trigger to the corrected function.

## Notes
1. No data is deleted or modified — only the function and trigger are replaced.
2. Safe to re-run (DROP IF EXISTS before CREATE).
*/

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, badge_number, jurisdiction, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown Officer'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'investigating_officer'),
    NEW.raw_user_meta_data->>'badge_number',
    NEW.raw_user_meta_data->>'jurisdiction',
    NEW.raw_user_meta_data->>'department'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
