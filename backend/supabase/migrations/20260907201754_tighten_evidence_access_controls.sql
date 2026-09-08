/*
# Tighten evidence access controls

## Plain-English summary
Prevents browser clients from changing privilege-bearing profile fields or forging
who uploaded an evidence item, audit event, or hash-chain record. Existing evidence
remains readable to signed-in workspace members because the product is designed for
cross-department case collaboration.

## Security changes
1. Profiles: signed-in users may edit only their own contact and department details;
   role and identity fields are no longer client-writable.
2. Evidence and evidence versions: inserts must identify the current signed-in user
   as uploader; updates remain limited to the uploader or approved administrative roles.
3. Audit log and hash chain: inserts must be attributed to the current signed-in user.
4. RLS remains enabled and all write rules stay scoped to authenticated users.

## Important notes
1. The database continues to provide the uploader identity by default via auth.uid().
2. No existing rows are deleted or modified.
3. This migration is safe to re-run because policies are replaced idempotently.
*/

-- Profiles: prevent users from changing their role or identity.
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name, badge_number, jurisdiction, department) ON profiles TO authenticated;

DROP POLICY IF EXISTS "insert_evidence" ON evidence;
CREATE POLICY "insert_evidence" ON evidence FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "insert_evidence_versions" ON evidence_versions;
CREATE POLICY "insert_evidence_versions" ON evidence_versions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "insert_audit_log" ON audit_log;
CREATE POLICY "insert_audit_log" ON audit_log FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_hash_chain" ON hash_chain;
CREATE POLICY "insert_hash_chain" ON hash_chain FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);
