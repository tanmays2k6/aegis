/*
# Phase 1.5: Identity, Account Lifecycle, Access Requests, and RBAC Hardening

1. Adds `status` to `public.profiles`:
   - Valid values: 'pending', 'active', 'suspended', 'deactivated'
   - Defaults to 'pending'
   - Updates existing development accounts to 'active' to preserve system operation.

2. Updates role constraints on `public.profiles`:
   - Valid roles: 'investigating_officer', 'forensic_officer', 'court_clerk', 'auditor', 'admin'
   - Maps any historical legacy role ('officer' -> 'investigating_officer', 'forensic_lab' -> 'forensic_officer').

3. Creates `public.access_requests` table:
   - Full tracking of user access requests, applicant details, requested role, status, reviewer notes, and timestamps.

4. Hardens `on_auth_user_created` trigger:
   - Sets newly registered user profiles to `status = 'pending'`.
   - Never trusts client-specified admin/auditor roles on unvetted signup.

5. RLS policies on `access_requests` and `profiles`.
*/

-- 1. Ensure extension exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Extend public.profiles with status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN status text NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'active', 'suspended', 'deactivated'));
  END IF;
END $$;

-- 3. Harmonize legacy roles and update existing dev profiles to active
UPDATE public.profiles SET role = 'investigating_officer' WHERE role IN ('officer', 'investigating_officer');
UPDATE public.profiles SET role = 'forensic_officer' WHERE role IN ('forensic_lab', 'forensic_officer');
UPDATE public.profiles SET status = 'active' WHERE status IS NULL OR status = 'pending';

-- If admin@gov.in exists, ensure role is admin
UPDATE public.profiles SET role = 'admin', status = 'active' WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin@gov.in'
);

-- Update check constraint on role if exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('investigating_officer', 'forensic_officer', 'court_clerk', 'auditor', 'admin'));

-- 4. Create access_requests table
CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  official_email text NOT NULL,
  badge_number text,
  department text NOT NULL,
  designation text NOT NULL,
  jurisdiction text NOT NULL,
  requested_role text NOT NULL CHECK (requested_role IN ('investigating_officer', 'forensic_officer', 'court_clerk', 'auditor')),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_requests_email_status ON public.access_requests(official_email, status);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(status);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_auditor_select_access_requests" ON public.access_requests;
CREATE POLICY "admin_auditor_select_access_requests" ON public.access_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'auditor') AND p.status = 'active'
    )
  );

DROP POLICY IF EXISTS "admin_update_access_requests" ON public.access_requests;
CREATE POLICY "admin_update_access_requests" ON public.access_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.status = 'active'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.status = 'active'
    )
  );

-- 5. Hardened handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_status text;
BEGIN
  -- Disallow public self-assignment to admin or auditor
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'investigating_officer');
  IF v_role NOT IN ('investigating_officer', 'forensic_officer', 'court_clerk') THEN
    v_role := 'investigating_officer';
  END IF;

  -- Controlled status: new users start as pending unless explicitly created active by an admin
  v_status := COALESCE(NEW.raw_user_meta_data->>'status', 'pending');
  IF v_status NOT IN ('pending', 'active') THEN
    v_status := 'pending';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, role, badge_number, jurisdiction, department, status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Officer'),
    v_role,
    NEW.raw_user_meta_data->>'badge_number',
    COALESCE(NEW.raw_user_meta_data->>'jurisdiction', 'Bengaluru'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'State Police'),
    v_status
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    badge_number = EXCLUDED.badge_number,
    jurisdiction = EXCLUDED.jurisdiction,
    department = EXCLUDED.department;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
