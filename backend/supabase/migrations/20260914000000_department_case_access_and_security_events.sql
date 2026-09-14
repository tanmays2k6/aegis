-- Department-owned cases with explicit, revocable cross-department access.
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS owner_department text;

UPDATE public.cases c
SET owner_department = lower(trim(COALESCE(p.department, 'unassigned')))
FROM public.profiles p
WHERE p.id = c.created_by AND c.owner_department IS NULL;

UPDATE public.cases SET owner_department = 'unassigned' WHERE owner_department IS NULL;
ALTER TABLE public.cases ALTER COLUMN owner_department SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_owner_department ON public.cases(owner_department);

CREATE TABLE IF NOT EXISTS public.case_department_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  department text NOT NULL,
  permissions text[] NOT NULL DEFAULT ARRAY['view']::text[],
  grant_reason text NOT NULL,
  granted_by uuid NOT NULL REFERENCES public.profiles(id),
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, department)
);
ALTER TABLE public.case_department_access ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_case_department_access_lookup ON public.case_department_access(case_id, department, active);
-- The Express API connects with the service role and remains responsible for
-- the explicit department checks in the application layer.
GRANT SELECT, INSERT, UPDATE ON public.case_department_access TO service_role;

-- Security events are append-only and hash-linked. They cover attempts that
-- cannot be represented in audit_log, including failed login attempts.
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES public.profiles(id),
  actor_email text,
  event_type text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('allowed', 'denied', 'failed')),
  request_path text,
  resource_type text,
  resource_id uuid,
  details text,
  client_ip text,
  user_agent text,
  previous_chain_hash text NOT NULL DEFAULT 'GENESIS',
  chain_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_security_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'security_events is append-only';
END;
$$;
DROP TRIGGER IF EXISTS security_events_immutable ON public.security_events;
CREATE TRIGGER security_events_immutable BEFORE UPDATE OR DELETE ON public.security_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_security_event_mutation();

CREATE OR REPLACE FUNCTION public.append_security_event(
  p_actor_user_id uuid, p_actor_email text, p_event_type text, p_outcome text,
  p_request_path text, p_resource_type text, p_resource_id uuid, p_details text,
  p_client_ip text, p_user_agent text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_previous text; v_hash text; v_created_at timestamptz; v_event public.security_events;
BEGIN
  PERFORM pg_advisory_xact_lock(90226002);
  SELECT chain_hash INTO v_previous FROM public.security_events ORDER BY created_at DESC, id DESC LIMIT 1;
  v_previous := COALESCE(v_previous, 'GENESIS');
  v_created_at := clock_timestamp();
  v_hash := encode(extensions.digest(v_previous || ':' || COALESCE(p_actor_user_id::text, '') || ':' || COALESCE(p_actor_email, '') || ':' || p_event_type || ':' || p_outcome || ':' || COALESCE(p_request_path, '') || ':' || COALESCE(p_resource_type, '') || ':' || COALESCE(p_resource_id::text, '') || ':' || COALESCE(p_details, '') || ':' || v_created_at::text, 'sha256'), 'hex');
  INSERT INTO public.security_events (actor_user_id, actor_email, event_type, outcome, request_path, resource_type, resource_id, details, client_ip, user_agent, previous_chain_hash, chain_hash, created_at)
  VALUES (p_actor_user_id, p_actor_email, p_event_type, p_outcome, p_request_path, p_resource_type, p_resource_id, p_details, p_client_ip, p_user_agent, v_previous, v_hash, v_created_at)
  RETURNING * INTO v_event;
  RETURN to_jsonb(v_event);
END;
$$;

REVOKE ALL ON public.security_events FROM anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.append_security_event(uuid, text, text, text, text, text, uuid, text, text, text) TO service_role;
