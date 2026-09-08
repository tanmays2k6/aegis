-- ==============================================================================
-- AEGIS — Authenticated Evidence & Government Investigation System
-- Database Schema — Phase 1: Profiles & Role Foundation
-- ==============================================================================

-- 1. Create User Role Enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'officer',
        'forensic',
        'court_clerk',
        'admin',
        'auditor'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'officer',
    department TEXT NOT NULL DEFAULT 'Special Investigation Unit',
    jurisdiction TEXT NOT NULL DEFAULT 'Central Division',
    badge_id TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Create Index on Role and Email
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies
-- Policy A: Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Policy B: Users can update their own profile (limited fields)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy C: Administrators can view all profiles for auditing/administrative tasks
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy D: Service role (backend server) has full access
-- Supabase service_role key automatically bypasses RLS, but for explicit clarity:
DROP POLICY IF EXISTS "Service role maintains profiles" ON public.profiles;
CREATE POLICY "Service role maintains profiles"
    ON public.profiles
    FOR ALL
    USING (auth.role() = 'service_role');

-- 6. Trigger for Automatic Profile Creation on User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role user_role;
    raw_role TEXT;
BEGIN
    raw_role := NEW.raw_user_meta_data->>'role';
    
    -- Safely map role or default to officer
    IF raw_role IN ('officer', 'forensic', 'court_clerk', 'admin', 'auditor') THEN
        assigned_role := raw_role::user_role;
    ELSE
        assigned_role := 'officer'::user_role;
    END IF;

    INSERT INTO public.profiles (
        id,
        name,
        email,
        role,
        department,
        jurisdiction,
        badge_id
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        assigned_role,
        COALESCE(NEW.raw_user_meta_data->>'department', 'Special Investigation Unit'),
        COALESCE(NEW.raw_user_meta_data->>'jurisdiction', 'Central Division'),
        NEW.raw_user_meta_data->>'badge_id'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        updated_at = TIMEZONE('utc', NOW());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Trigger for Updated At Timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
