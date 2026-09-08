-- ==============================================================================
-- AEGIS — Phase 1 Seed / Verification Instructions
-- ==============================================================================

-- Test user creation is typically done via Supabase Dashboard Auth or Auth API.
-- When creating a user in Supabase Auth, you can provide User Metadata:
-- {
--   "name": "Inspector Tanmay Shankar",
--   "role": "admin",
--   "department": "National Crime Investigation Division",
--   "jurisdiction": "National HQ - New Delhi",
--   "badge_id": "NCID-7809"
-- }
--
-- The trigger `on_auth_user_created` will automatically populate `public.profiles`.

-- Manual verification query to check profiles:
-- SELECT id, name, email, role, department, jurisdiction, badge_id, created_at FROM public.profiles;
