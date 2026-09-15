import { supabase } from '../config/supabase.js';

/**
 * requireReleasedEvidence
 * Centralized guard for all normal evidence content/byte exposure endpoints.
 *
 * Rules:
 * 1. If a linked file_security_scans record exists:
 *    - Must have status === 'RELEASED'.
 *    - If status is PENDING, SCANNING, INFECTED, QUARANTINED, SCAN_FAILED, or CLEAN (not yet released), fail closed with 423.
 *    - If released_path is present, verify that the storage object actually exists in 'aegis-evidence'.
 * 2. If no file_security_scans record exists (legacy record prior to Phase 2.5):
 *    - Allow access only if evidence row contains valid legacy file_content.
 * 3. Never allow access to quarantined, scanning, failed, or infected artifacts.
 */
export async function requireReleasedEvidence(evidenceId) {
  const { data: scan, error } = await supabase
    .from('file_security_scans')
    .select('id, upload_id, status, released_path, quarantine_path, file_hash')
    .eq('evidence_id', evidenceId)
    .maybeSingle();

  if (error) throw error;

  if (scan) {
    if (scan.status !== 'RELEASED') {
      throw Object.assign(new Error('This evidence is not cleared for access.'), {
        status: 423,
        code: 'EVIDENCE_NOT_RELEASED',
        securityStatus: scan.status,
      });
    }

    // Verify storage object if path is recorded
    if (scan.released_path) {
      const { data: fileBlob, error: fileErr } = await supabase.storage
        .from('aegis-evidence')
        .download(scan.released_path);

      if (fileErr || !fileBlob) {
        throw Object.assign(new Error('Released evidence storage artifact is missing or inaccessible.'), {
          status: 404,
          code: 'RELEASED_ARTIFACT_NOT_FOUND',
        });
      }
    }

    return scan;
  }

  // Pre-existing legacy evidence records created before Phase 2.5
  const { data: ev, error: evErr } = await supabase
    .from('evidence')
    .select('id, file_content, status')
    .eq('id', evidenceId)
    .maybeSingle();

  if (evErr) throw evErr;
  if (!ev || !ev.file_content) {
    throw Object.assign(new Error('This evidence is not cleared for access.'), {
      status: 423,
      code: 'EVIDENCE_NOT_RELEASED',
    });
  }

  return { status: 'LEGACY_CLEARED' };
}
