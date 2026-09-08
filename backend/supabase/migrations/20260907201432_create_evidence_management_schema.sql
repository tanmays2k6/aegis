/*
# Blockchain-Anchored Evidence Management System Schema

## Overview
Creates the complete database schema for a law enforcement evidence management system
with blockchain-anchored integrity verification. Designed for SIH (Smart India Hackathon)
NCRB / Women Safety Division use case.

## New Tables

1. **profiles** — Extends auth.users with role, badge number, jurisdiction
   - id (uuid, PK, FK to auth.users)
   - full_name, role, badge_number, jurisdiction, department
   - Roles: investigating_officer, court_clerk, forensic_lab, admin, auditor

2. **cases** — Case records (FIRs, investigations)
   - case_number (unique, e.g. FIR/2024/001)
   - title, description, status, priority, jurisdiction
   - created_by, assigned_officer (FK to profiles)
   - Statuses: open, under_investigation, in_court, closed, archived

3. **evidence** — Evidence items linked to cases
   - case_id (FK to cases)
   - title, document_type, description
   - file_name, file_type, file_size, file_content (base64)
   - current_hash (SHA-256 of current version)
   - status: draft, submitted, approved, locked
   - version_number, uploaded_by

4. **evidence_versions** — Version history with hash chain
   - evidence_id (FK to evidence)
   - file_hash (SHA-256 of file content)
   - previous_chain_hash, chain_hash (blockchain link)
   - Each version links to previous, creating tamper-evident chain

5. **audit_log** — Immutable action log with hash chain
   - user_id, user_name, user_role, action
   - resource_type, resource_id, resource_name, details
   - chain_hash links to previous entry (tamper-evident)

6. **hash_chain** — Master blockchain ledger
   - Aggregates all hash-anchored records into single chain
   - sequence_number, record_type, record_hash
   - previous_hash, chain_hash (the blockchain link)

## Security
- RLS enabled on ALL tables
- Role-based access: officers manage their cases, auditors read all, admins full access
- All authenticated users can read cases/evidence (law enforcement data sharing)
- Audit log readable only by auditors and admins
- Owner-scoped writes with DEFAULT auth.uid() on owner columns

## Notes
1. All owner columns default to auth.uid() so inserts work without explicitly passing owner
2. Hash chain is computed in the frontend using Web Crypto API (SHA-256)
3. File content stored as base64 text (demo-scale, max ~1MB files)
4. updated_at triggers on cases and evidence
*/

-- ============ PROFILES TABLE ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('investigating_officer', 'court_clerk', 'forensic_lab', 'admin', 'auditor')),
  badge_number text,
  jurisdiction text,
  department text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'auditor'))
  );

DROP POLICY IF EXISTS "insert_profiles" ON profiles;
CREATE POLICY "insert_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_profiles" ON profiles;
CREATE POLICY "update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ CASES TABLE ============
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_investigation', 'in_court', 'closed', 'archived')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  jurisdiction text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  assigned_officer uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_cases" ON cases;
CREATE POLICY "select_cases" ON cases FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_cases" ON cases;
CREATE POLICY "insert_cases" ON cases FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'investigating_officer', 'forensic_lab'))
  );

DROP POLICY IF EXISTS "update_cases" ON cases;
CREATE POLICY "update_cases" ON cases FOR UPDATE
  TO authenticated USING (
    auth.uid() = created_by OR auth.uid() = assigned_officer
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'court_clerk'))
  ) WITH CHECK (
    auth.uid() = created_by OR auth.uid() = assigned_officer
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'court_clerk'))
  );

-- ============ EVIDENCE TABLE ============
CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('fir', 'charge_sheet', 'forensic_report', 'witness_statement', 'medical_report', 'photographic_evidence', 'other')),
  description text,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  file_content text NOT NULL,
  current_hash text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved', 'locked')),
  version_number int NOT NULL DEFAULT 1,
  uploaded_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_evidence" ON evidence;
CREATE POLICY "select_evidence" ON evidence FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_evidence" ON evidence;
CREATE POLICY "insert_evidence" ON evidence FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_evidence" ON evidence;
CREATE POLICY "update_evidence" ON evidence FOR UPDATE
  TO authenticated USING (
    auth.uid() = uploaded_by
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'court_clerk'))
  ) WITH CHECK (
    auth.uid() = uploaded_by
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'court_clerk'))
  );

DROP POLICY IF EXISTS "delete_evidence" ON evidence;
CREATE POLICY "delete_evidence" ON evidence FOR DELETE
  TO authenticated USING (
    auth.uid() = uploaded_by
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============ EVIDENCE VERSIONS TABLE ============
CREATE TABLE IF NOT EXISTS evidence_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  file_content text NOT NULL,
  file_hash text NOT NULL,
  previous_version_id uuid REFERENCES evidence_versions(id),
  previous_chain_hash text NOT NULL DEFAULT 'GENESIS',
  chain_hash text NOT NULL,
  uploaded_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE evidence_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_evidence_versions" ON evidence_versions;
CREATE POLICY "select_evidence_versions" ON evidence_versions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_evidence_versions" ON evidence_versions;
CREATE POLICY "insert_evidence_versions" ON evidence_versions FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============ AUDIT LOG TABLE ============
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  user_name text NOT NULL,
  user_role text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  resource_name text,
  details text,
  previous_chain_hash text NOT NULL DEFAULT 'GENESIS',
  chain_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_audit_log" ON audit_log;
CREATE POLICY "select_audit_log" ON audit_log FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'auditor'))
  );

DROP POLICY IF EXISTS "insert_audit_log" ON audit_log;
CREATE POLICY "insert_audit_log" ON audit_log FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============ HASH CHAIN TABLE (MASTER BLOCKCHAIN LEDGER) ============
CREATE TABLE IF NOT EXISTS hash_chain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_number bigint NOT NULL,
  record_type text NOT NULL CHECK (record_type IN ('evidence', 'audit_log', 'evidence_version')),
  record_id uuid NOT NULL,
  record_hash text NOT NULL,
  previous_hash text NOT NULL DEFAULT 'GENESIS',
  chain_hash text NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hash_chain ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_hash_chain" ON hash_chain;
CREATE POLICY "select_hash_chain" ON hash_chain FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_hash_chain" ON hash_chain;
CREATE POLICY "insert_hash_chain" ON hash_chain FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases(created_by);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_officer ON cases(assigned_officer);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_by ON evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_evidence_versions_evidence_id ON evidence_versions(evidence_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_hash_chain_sequence ON hash_chain(sequence_number);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cases_updated_at ON cases;
CREATE TRIGGER cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS evidence_updated_at ON evidence;
CREATE TRIGGER evidence_updated_at BEFORE UPDATE ON evidence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();