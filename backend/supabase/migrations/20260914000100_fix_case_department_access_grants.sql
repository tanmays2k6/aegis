-- Follow-up for projects where the department-access migration was already run.
GRANT SELECT, INSERT, UPDATE ON public.case_department_access TO service_role;
