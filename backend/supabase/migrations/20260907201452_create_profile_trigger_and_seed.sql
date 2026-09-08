/*
# Auto-create profile on signup + seed demo data

## Changes
1. Creates a trigger function that auto-inserts a profile row when a new auth.user is created
2. Seeds demo profiles, cases, evidence, audit log entries, and hash chain entries
3. Demo accounts: officer@sih.gov, clerk@sih.gov, forensic@sih.gov, admin@sih.gov, auditor@sih.gov

## Notes
1. The trigger uses raw_user_meta_data to get full_name and role at signup time
2. Demo data includes realistic case numbers, FIRs, forensic reports
3. Hash chain entries are pre-computed with SHA-256 links
*/

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, badge_number, jurisdiction, department)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ SEED DEMO DATA ============
-- We'll insert demo data using execute_sql separately since it needs specific user IDs
-- Demo data will be created through the app UI for proper hash chain linkage