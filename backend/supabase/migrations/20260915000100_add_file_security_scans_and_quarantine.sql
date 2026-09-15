/*
  Phase 2.5: malware scan state and private quarantine storage.

  `evidence` and `evidence_versions` are the existing document/version tables.
  There is no upload table in the current schema, so upload_id is a generated,
  stable correlation id for the future quarantine upload.  It deliberately has
  no foreign key: a scan must exist before an evidence row/version is released.

  Browser clients receive SELECT-only access to records tied to cases they can
  access.  Creation and state changes are service-role/backend responsibilities.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.file_security_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL DEFAULT gen_random_uuid(),
  evidence_id uuid REFERENCES public.evidence(id) ON DELETE SET NULL,
  evidence_version_id uuid REFERENCES public.evidence_versions(id) ON DELETE SET NULL,
  file_hash text NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$'),
  file_name text,
  file_size bigint CHECK (file_size IS NULL OR file_size >= 0),
  declared_mime_type text,
  detected_mime_type text,
  extension text,
  scanner text,
  scanner_version text,
  signature_database_version text,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SCANNING', 'CLEAN', 'INFECTED', 'SCAN_FAILED', 'QUARANTINED', 'RELEASED')),
  threat_name text,
  scanned_at timestamptz,
  scan_duration_ms integer CHECK (scan_duration_ms IS NULL OR scan_duration_ms >= 0),
  error_message text,
  quarantine_path text,
  released_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT file_security_scans_upload_id_key UNIQUE (upload_id),
  CONSTRAINT file_security_scans_file_location_check CHECK (
    NOT (quarantine_path IS NOT NULL AND released_path IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.file_security_scan_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL,
  file_security_scan_id uuid NOT NULL REFERENCES public.file_security_scans(id) ON DELETE CASCADE,
  scanner text NOT NULL,
  scanner_version text,
  signature_database_version text,
  status text NOT NULL CHECK (status IN ('PENDING', 'SCANNING', 'CLEAN', 'INFECTED', 'SCAN_FAILED', 'QUARANTINED', 'RELEASED')),
  threat_name text,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT file_security_scan_attempts_completed_after_started CHECK (
    completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at
  )
);

-- A version must belong to the evidence item attached to the same scan.
CREATE OR REPLACE FUNCTION public.validate_file_security_scan_evidence_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.evidence_id IS NOT NULL AND NEW.evidence_version_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.evidence_versions ev
      WHERE ev.id = NEW.evidence_version_id AND ev.evidence_id = NEW.evidence_id
    ) THEN
    RAISE EXCEPTION 'evidence_version_id must belong to evidence_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS file_security_scans_validate_evidence_version ON public.file_security_scans;
CREATE TRIGGER file_security_scans_validate_evidence_version
  BEFORE INSERT OR UPDATE OF evidence_id, evidence_version_id ON public.file_security_scans
  FOR EACH ROW EXECUTE FUNCTION public.validate_file_security_scan_evidence_version();

DROP TRIGGER IF EXISTS file_security_scans_updated_at ON public.file_security_scans;
CREATE TRIGGER file_security_scans_updated_at
  BEFORE UPDATE ON public.file_security_scans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_file_security_scans_upload_id ON public.file_security_scans(upload_id);
CREATE INDEX IF NOT EXISTS idx_file_security_scans_evidence_id ON public.file_security_scans(evidence_id);
CREATE INDEX IF NOT EXISTS idx_file_security_scans_evidence_version_id ON public.file_security_scans(evidence_version_id);
CREATE INDEX IF NOT EXISTS idx_file_security_scans_file_hash ON public.file_security_scans(file_hash);
CREATE INDEX IF NOT EXISTS idx_file_security_scans_status ON public.file_security_scans(status);
CREATE INDEX IF NOT EXISTS idx_file_security_scans_created_at ON public.file_security_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_security_scan_attempts_scan_id ON public.file_security_scan_attempts(file_security_scan_id);
CREATE INDEX IF NOT EXISTS idx_file_security_scan_attempts_upload_id ON public.file_security_scan_attempts(upload_id);

-- Mirrors the existing department/case policy, including active cross-department grants.
CREATE OR REPLACE FUNCTION public.can_read_file_security_scan(p_evidence_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.evidence e
    JOIN public.cases c ON c.id = e.case_id
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE e.id = p_evidence_id
      AND (
        p.role IN ('admin', 'auditor')
        OR lower(trim(COALESCE(p.department, ''))) = lower(trim(COALESCE(c.owner_department, '')))
        OR (
          c.owner_department IS NULL AND c.created_by = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.case_department_access cda
          WHERE cda.case_id = c.id
            AND cda.active = true
            AND (cda.expires_at IS NULL OR cda.expires_at > now())
            AND lower(trim(cda.department)) = lower(trim(COALESCE(p.department, '')))
            AND 'view' = ANY(cda.permissions)
        )
      )
  );
$$;

ALTER TABLE public.file_security_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_security_scan_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.file_security_scans FROM anon, authenticated;
REVOKE ALL ON public.file_security_scan_attempts FROM anon, authenticated;
GRANT SELECT ON public.file_security_scans, public.file_security_scan_attempts TO authenticated;
GRANT ALL ON public.file_security_scans, public.file_security_scan_attempts TO service_role;

DROP POLICY IF EXISTS "read_authorized_file_security_scans" ON public.file_security_scans;
CREATE POLICY "read_authorized_file_security_scans" ON public.file_security_scans
  FOR SELECT TO authenticated
  USING (evidence_id IS NOT NULL AND public.can_read_file_security_scan(evidence_id));

DROP POLICY IF EXISTS "read_authorized_file_security_scan_attempts" ON public.file_security_scan_attempts;
CREATE POLICY "read_authorized_file_security_scan_attempts" ON public.file_security_scan_attempts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.file_security_scans s
      WHERE s.id = file_security_scan_id
        AND s.evidence_id IS NOT NULL
        AND public.can_read_file_security_scan(s.evidence_id)
    )
  );

-- Supabase Storage has RLS on storage.objects.  This bucket is intentionally
-- private; no authenticated-browser object policy is granted.  The future
-- Express scan/release service uses the service role after application RBAC.
INSERT INTO storage.buckets (id, name, public)
VALUES ('aegis-quarantine', 'aegis-quarantine', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "aegis_quarantine_backend_only_select" ON storage.objects;
DROP POLICY IF EXISTS "aegis_quarantine_backend_only_insert" ON storage.objects;
DROP POLICY IF EXISTS "aegis_quarantine_backend_only_update" ON storage.objects;
DROP POLICY IF EXISTS "aegis_quarantine_backend_only_delete" ON storage.objects;

-- No storage.objects policies are created for aegis-quarantine.  With the
-- bucket private, anon/authenticated clients cannot list, read, upload, move,
-- or delete quarantine objects. service_role bypasses RLS on the backend only.
