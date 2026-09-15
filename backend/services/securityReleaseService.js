import crypto from 'node:crypto';
import * as auditModel from '../models/auditModel.js';
import * as evidenceModel from '../models/evidenceModel.js';
import { supabase } from '../config/supabase.js';

export const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

/**
 * SecurityReleaseService
 * Orchestrates atomic, verified transition of a clean scanned file from quarantine to active evidence.
 *
 * Requirements:
 * 1. Verify scan record exists, belongs to upload, and scan status is CLEAN
 * 2. Verify quarantine object exists and download bytes
 * 3. Re-verify SHA-256 hash of quarantine bytes against recorded file_hash
 * 4. Upload bytes to private 'aegis-evidence' bucket
 * 5. Verify released object exists in destination and calculate SHA-256 of released bytes
 * 6. Verify released SHA-256 == scanned SHA-256 (Fail closed on mismatch)
 * 7. Atomically create evidence record, evidence version, and blockchain ledger entry
 *    via existing create_evidence_with_chain RPC
 * 8. Atomically update file_security_scans:
 *    evidence_id, evidence_version_id, released_path, status = 'RELEASED', quarantine_path = null
 * 9. Delete object from quarantine bucket
 * 10. Emit required audit events: FILE_RELEASE_ATTEMPTED, FILE_RELEASED, DOCUMENT_VERSION_ACTIVATED
 */
export class SecurityReleaseService {
  static async releaseCleanUpload({ scan, userContext, uploadPayload }) {
    const { upload_id, case_id, file_hash, file_name, detected_mime_type, quarantine_path } = scan;

    // Audit: Release attempt
    await auditModel.createAuditEntry({
      userId: userContext.userId,
      userName: userContext.fullName,
      userRole: userContext.role,
      action: 'FILE_RELEASE_ATTEMPTED',
      resourceType: 'file_security_scan',
      resourceId: scan.id,
      resourceName: file_name,
      details: `Release initiated for upload ${upload_id} in case ${case_id}. Expected hash: ${file_hash.slice(0, 16)}...`,
    });

    let releasedPath = null;
    try {
      // 1. Verify scan status is CLEAN
      if (scan.status !== 'CLEAN') {
        throw Object.assign(new Error(`Cannot release upload with status '${scan.status}'. File must be CLEAN.`), {
          status: 400,
          code: 'INVALID_SCAN_STATUS',
        });
      }

      // 2. Verify quarantine object exists and download bytes
      if (!quarantine_path) {
        throw Object.assign(new Error('Quarantine storage path missing on scan record.'), {
          status: 404,
          code: 'QUARANTINE_PATH_MISSING',
        });
      }

      const { data: qBlob, error: qErr } = await supabase.storage
        .from('aegis-quarantine')
        .download(quarantine_path);

      if (qErr || !qBlob) {
        throw Object.assign(new Error(`Failed to retrieve quarantined file: ${qErr?.message || 'Object not found'}`), {
          status: 404,
          code: 'QUARANTINE_FILE_NOT_FOUND',
        });
      }

      const rawBytes = Buffer.from(await qBlob.arrayBuffer());

      // 3. Recalculate and verify quarantine file SHA-256
      const quarantineHash = sha256(rawBytes);
      if (quarantineHash !== file_hash) {
        throw Object.assign(new Error(`Integrity violation: quarantine hash mismatch (${quarantineHash} !== ${file_hash}).`), {
          status: 400,
          code: 'HASH_MISMATCH',
        });
      }

      // 4. Copy/upload to private aegis-evidence storage
      const destinationKey = `evidence/${case_id}/${upload_id}/${crypto.randomUUID()}-${file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: destErr } = await supabase.storage
        .from('aegis-evidence')
        .upload(destinationKey, rawBytes, {
          contentType: detected_mime_type || 'application/octet-stream',
          upsert: false,
        });

      if (destErr) {
        throw Object.assign(new Error(`Failed to copy file to evidence storage: ${destErr.message}`), {
          status: 500,
          code: 'STORAGE_RELEASE_FAILED',
        });
      }
      releasedPath = destinationKey;

      // 5. Verify released object exists in destination and verify released SHA-256
      const { data: relBlob, error: relErr } = await supabase.storage
        .from('aegis-evidence')
        .download(destinationKey);

      if (relErr || !relBlob) {
        throw Object.assign(new Error(`Failed to verify released evidence storage object: ${relErr?.message}`), {
          status: 500,
          code: 'RELEASE_VERIFICATION_FAILED',
        });
      }

      const releasedBytes = Buffer.from(await relBlob.arrayBuffer());
      const releasedHash = sha256(releasedBytes);

      // 6. Compare scanned_hash == released_file_hash
      if (releasedHash !== file_hash) {
        // Rollback destination object immediately
        await supabase.storage.from('aegis-evidence').remove([destinationKey]);
        throw Object.assign(new Error(`Cryptographic hash mismatch after release: ${releasedHash} !== ${file_hash}.`), {
          status: 400,
          code: 'RELEASED_HASH_MISMATCH',
        });
      }

      // 7. Create/activate document version via existing AEGIS integrity chain
      // Use existing createEvidenceWithVersion which invokes create_evidence_with_chain RPC
      const base64Content = releasedBytes.toString('base64');
    const validTypes = ['fir', 'charge_sheet', 'forensic_report', 'witness_statement', 'medical_report', 'photographic_evidence', 'other'];
    const safeDocType = validTypes.includes(uploadPayload?.documentType) ? uploadPayload.documentType : 'other';
    const evidencePayload = {
      case_id,
      title: uploadPayload.title || file_name,
      document_type: safeDocType,
      file_name,
      file_type: detected_mime_type || uploadPayload.fileType || 'application/octet-stream',
      file_size: releasedBytes.length,
      file_content: base64Content,
      current_hash: releasedHash,
      uploaded_by: userContext.userId,
    };

      const evidenceRecord = await evidenceModel.createEvidenceWithVersion(evidencePayload);

      // Fetch the created version row
      const { data: versionRow } = await supabase
        .from('evidence_versions')
        .select('id')
        .eq('evidence_id', evidenceRecord.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const versionId = versionRow?.id || null;

      // 8. Atomically update file_security_scans to RELEASED
      // DB constraint file_security_scans_file_location_check requires quarantine_path = null when released_path is not null
      const { error: updateScanErr } = await supabase
        .from('file_security_scans')
        .update({
          status: 'RELEASED',
          evidence_id: evidenceRecord.id,
          evidence_version_id: versionId,
          released_path: destinationKey,
          quarantine_path: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', scan.id);

      if (updateScanErr) {
        throw Object.assign(new Error(`Failed to update scan security status to RELEASED: ${updateScanErr.message}`), {
          status: 500,
          code: 'SCAN_STATUS_UPDATE_FAILED',
        });
      }

      // 9. Remove file from quarantine bucket now that destination is committed
      await supabase.storage.from('aegis-quarantine').remove([quarantine_path]).catch(() => {});

      // 10. Audit: FILE_RELEASED
      await auditModel.createAuditEntry({
        userId: userContext.userId,
        userName: userContext.fullName,
        userRole: userContext.role,
        action: 'FILE_RELEASED',
        resourceType: 'file_security_scan',
        resourceId: scan.id,
        resourceName: file_name,
        details: `Upload ${upload_id} verified and released to aegis-evidence storage at ${destinationKey}. Evidence ID: ${evidenceRecord.id}`,
      });

      // 11. Audit: DOCUMENT_VERSION_ACTIVATED
      await auditModel.createAuditEntry({
        userId: userContext.userId,
        userName: userContext.fullName,
        userRole: userContext.role,
        action: 'DOCUMENT_VERSION_ACTIVATED',
        resourceType: 'evidence',
        resourceId: evidenceRecord.id,
        resourceName: file_name,
        details: `Evidence version ${versionId || 1} activated in blockchain ledger with chain hash for case ${case_id}.`,
      });

      return {
        success: true,
        status: 'RELEASED',
        evidenceId: evidenceRecord.id,
        evidenceVersionId: versionId,
        releasedPath: destinationKey,
        fileHash: releasedHash,
      };
    } catch (err) {
      // Fail closed: If releasedPath exists but pipeline failed, clean up destination file
      if (releasedPath) {
        await supabase.storage.from('aegis-evidence').remove([releasedPath]).catch(() => {});
      }

      // Log failure audit
      await auditModel.createAuditEntry({
        userId: userContext.userId,
        userName: userContext.fullName,
        userRole: userContext.role,
        action: 'FILE_RELEASE_FAILED',
        resourceType: 'file_security_scan',
        resourceId: scan.id,
        resourceName: file_name,
        details: `Release failed: ${err.message}`,
      });

      throw err;
    }
  }
}
