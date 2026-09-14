-- ONE-TIME RESET FOR A FRESH DEMO PROJECT.
-- Preserves auth.users, public.profiles, roles, account statuses, and administrators.
BEGIN;

DELETE FROM public.case_department_access;
DELETE FROM public.hash_chain;
DELETE FROM public.audit_log;
DELETE FROM public.evidence; -- cascades to evidence_versions
DELETE FROM public.cases;

DO $$
BEGIN
  IF to_regclass('public.security_events') IS NOT NULL THEN
    DELETE FROM public.security_events;
  END IF;
END $$;

COMMIT;
