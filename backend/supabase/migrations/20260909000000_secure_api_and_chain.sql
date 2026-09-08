-- Security and integrity repair for the Express API.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.is_privileged_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = ANY(allowed_roles)
  );
$$;

DROP POLICY IF EXISTS "select_profiles" ON public.profiles;
CREATE POLICY "select_profiles" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_privileged_role(ARRAY['admin', 'auditor']));

DROP POLICY IF EXISTS "insert_cases" ON public.cases;
CREATE POLICY "insert_cases" ON public.cases FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by OR public.is_privileged_role(ARRAY['admin', 'investigating_officer', 'forensic_lab']));

DROP POLICY IF EXISTS "update_cases" ON public.cases;
CREATE POLICY "update_cases" ON public.cases FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = assigned_officer OR public.is_privileged_role(ARRAY['admin', 'court_clerk']))
  WITH CHECK (auth.uid() = created_by OR auth.uid() = assigned_officer OR public.is_privileged_role(ARRAY['admin', 'court_clerk']));

DROP POLICY IF EXISTS "update_evidence" ON public.evidence;
CREATE POLICY "update_evidence" ON public.evidence FOR UPDATE TO authenticated
  USING (auth.uid() = uploaded_by OR public.is_privileged_role(ARRAY['admin', 'court_clerk']))
  WITH CHECK (auth.uid() = uploaded_by OR public.is_privileged_role(ARRAY['admin', 'court_clerk']));

DROP POLICY IF EXISTS "delete_evidence" ON public.evidence;
CREATE POLICY "delete_evidence" ON public.evidence FOR DELETE TO authenticated
  USING (auth.uid() = uploaded_by OR public.is_privileged_role(ARRAY['admin']));

DROP POLICY IF EXISTS "select_audit_log" ON public.audit_log;
CREATE POLICY "select_audit_log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_privileged_role(ARRAY['admin', 'auditor']));

CREATE OR REPLACE FUNCTION public.append_audit_entry(
  p_user_id uuid, p_user_name text, p_user_role text, p_action text,
  p_resource_type text, p_resource_id uuid, p_resource_name text, p_details text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous text;
  v_chain_hash text;
  v_entry public.audit_log;
  v_sequence bigint;
  v_ledger_previous text;
  v_ledger_hash text;
  v_created_at timestamptz;
  v_created_at_hash text;
BEGIN
  PERFORM pg_advisory_xact_lock(90226001);
  SELECT chain_hash INTO v_previous FROM public.audit_log ORDER BY created_at DESC, id DESC LIMIT 1;
  v_previous := COALESCE(v_previous, 'GENESIS');
  v_created_at := clock_timestamp();
  v_created_at_hash := to_char(v_created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || '+00';
  v_chain_hash := encode(extensions.digest(
    v_previous || ':' || p_user_id::text || ':' || p_user_name || ':' || p_user_role || ':'
    || p_action || ':' || p_resource_type || ':' || COALESCE(p_resource_id::text, '') || ':'
    || COALESCE(p_resource_name, '') || ':' || COALESCE(p_details, '') || ':' || v_created_at_hash,
    'sha256'
  ), 'hex');
  INSERT INTO public.audit_log (user_id, user_name, user_role, action, resource_type, resource_id, resource_name, details, previous_chain_hash, chain_hash, created_at)
  VALUES (p_user_id, p_user_name, p_user_role, p_action, p_resource_type, p_resource_id, p_resource_name, p_details, v_previous, v_chain_hash, v_created_at)
  RETURNING * INTO v_entry;

  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO v_sequence FROM public.hash_chain;
  SELECT chain_hash INTO v_ledger_previous FROM public.hash_chain ORDER BY sequence_number DESC LIMIT 1;
  v_ledger_previous := COALESCE(v_ledger_previous, 'GENESIS');
  v_ledger_hash := encode(extensions.digest(v_ledger_previous || ':audit_log:' || v_entry.id::text || ':' || v_chain_hash, 'sha256'), 'hex');
  INSERT INTO public.hash_chain (sequence_number, record_type, record_id, record_hash, previous_hash, chain_hash, created_by)
  VALUES (v_sequence, 'audit_log', v_entry.id, v_chain_hash, v_ledger_previous, v_ledger_hash, p_user_id);
  RETURN to_jsonb(v_entry);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_evidence_with_chain(
  p_case_id uuid, p_title text, p_document_type text, p_file_name text, p_file_type text,
  p_file_size bigint, p_file_content text, p_current_hash text, p_uploaded_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evidence public.evidence;
  v_version public.evidence_versions;
  v_version_hash text;
  v_sequence bigint;
  v_previous text;
  v_ledger_hash text;
BEGIN
  PERFORM pg_advisory_xact_lock(90226001);
  INSERT INTO public.evidence (case_id, title, document_type, file_name, file_type, file_size, file_content, current_hash, status, version_number, uploaded_by)
  VALUES (p_case_id, p_title, p_document_type, p_file_name, p_file_type, p_file_size, p_file_content, p_current_hash, 'submitted', 1, p_uploaded_by)
  RETURNING * INTO v_evidence;
  v_version_hash := encode(extensions.digest('GENESIS:' || p_current_hash || ':' || p_uploaded_by::text, 'sha256'), 'hex');
  INSERT INTO public.evidence_versions (evidence_id, version_number, file_name, file_type, file_size, file_content, file_hash, previous_chain_hash, chain_hash, uploaded_by)
  VALUES (v_evidence.id, 1, p_file_name, p_file_type, p_file_size, p_file_content, p_current_hash, 'GENESIS', v_version_hash, p_uploaded_by)
  RETURNING * INTO v_version;
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO v_sequence FROM public.hash_chain;
  SELECT chain_hash INTO v_previous FROM public.hash_chain ORDER BY sequence_number DESC LIMIT 1;
  v_previous := COALESCE(v_previous, 'GENESIS');
  v_ledger_hash := encode(extensions.digest(v_previous || ':evidence_version:' || v_version.id::text || ':' || v_version_hash, 'sha256'), 'hex');
  INSERT INTO public.hash_chain (sequence_number, record_type, record_id, record_hash, previous_hash, chain_hash, created_by)
  VALUES (v_sequence, 'evidence_version', v_version.id, v_version_hash, v_previous, v_ledger_hash, p_uploaded_by);
  RETURN to_jsonb(v_evidence);
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_audit_entry(uuid, text, text, text, text, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_evidence_with_chain(uuid, text, text, text, text, bigint, text, text, uuid) TO service_role;
