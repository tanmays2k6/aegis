ALTER TABLE public.file_security_scans ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL;
ALTER TABLE public.file_security_scans ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_file_security_scans_case_id ON public.file_security_scans(case_id);
CREATE INDEX IF NOT EXISTS idx_file_security_scans_uploaded_by ON public.file_security_scans(uploaded_by);
INSERT INTO storage.buckets (id, name, public) VALUES ('aegis-evidence', 'aegis-evidence', false) ON CONFLICT (id) DO UPDATE SET public = false;
