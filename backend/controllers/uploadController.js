import crypto from 'node:crypto';
import * as caseModel from '../models/caseModel.js';
import * as auditModel from '../models/auditModel.js';
import { canPerformOnCase, canAccessCase } from '../authorization/authorizationService.js';
import { supabase } from '../config/supabase.js';
import { validateUpload } from '../services/fileValidation.js';
import { scanQuarantinedUpload, sha256 } from '../services/securityScanService.js';
import { SecurityReleaseService } from '../services/securityReleaseService.js';
import { ROLES } from '../authorization/roles.js';

export async function postUpload(req, res, next) {
  try {
    const { title, caseNumber, documentType = 'other', fileName, fileType, fileContent, currentHash } = req.body;
    const bytes = Buffer.from(fileContent || '', 'base64');

    // 1. Case Authorization
    const c = await caseModel.getAllCases({ search: caseNumber });
    const found = c.find((x) => x.case_number === caseNumber);
    const grants = found ? await caseModel.getDepartmentGrants([found.id], req.userContext.department) : [];

    if (!found || !canPerformOnCase(req.userContext, found, grants, 'add_evidence')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized for this case.' },
      });
    }

    // 2. File Validation with Audit for Failures
    let meta;
    try {
      meta = validateUpload({ fileName, fileType, bytes });
    } catch (valErr) {
      await auditModel.createAuditEntry({
        userId: req.userContext.userId,
        userName: req.userContext.fullName,
        userRole: req.userContext.role,
        action: 'FILE_VALIDATION_FAILED',
        resourceType: 'upload_validation',
        resourceId: found.id,
        resourceName: fileName || 'unknown',
        details: `Validation rejected: ${valErr.message} (code: ${valErr.code})`,
      });
      throw valErr;
    }

    // 3. Cryptographic Hash Verification
    const hash = sha256(bytes);
    if (currentHash && currentHash !== hash) {
      await auditModel.createAuditEntry({
        userId: req.userContext.userId,
        userName: req.userContext.fullName,
        userRole: req.userContext.role,
        action: 'FILE_VALIDATION_FAILED',
        resourceType: 'upload_validation',
        resourceId: found.id,
        resourceName: meta.displayName,
        details: 'Cryptographic SHA-256 mismatch between client and server payload.',
      });
      throw Object.assign(new Error('Hash mismatch.'), { status: 400, code: 'HASH_MISMATCH' });
    }

    // 4. Safe Quarantine Upload
    const uploadId = crypto.randomUUID();
    const safeBaseName = meta.displayName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `quarantine/${found.id}/${uploadId}/${crypto.randomUUID()}-${safeBaseName}`;

    const put = await supabase.storage
      .from('aegis-quarantine')
      .upload(key, bytes, { contentType: meta.detectedMimeType, upsert: false });

    if (put.error) throw put.error;

    // 5. Create PENDING file_security_scans record
    const { data: scan, error } = await supabase
      .from('file_security_scans')
      .insert({
        upload_id: uploadId,
        case_id: found.id,
        uploaded_by: req.userContext.userId,
        file_hash: hash,
        file_name: meta.displayName,
        file_size: bytes.length,
        declared_mime_type: fileType,
        detected_mime_type: meta.detectedMimeType,
        extension: meta.extension,
        status: 'PENDING',
        quarantine_path: key,
      })
      .select()
      .single();

    if (error) throw error;

    // 6. Audit: FILE_UPLOADED_TO_QUARANTINE
    await auditModel.createAuditEntry({
      userId: req.userContext.userId,
      userName: req.userContext.fullName,
      userRole: req.userContext.role,
      action: 'FILE_UPLOADED_TO_QUARANTINE',
      resourceType: 'file_security_scan',
      resourceId: scan.id,
      resourceName: meta.displayName,
      details: `Upload ${uploadId} quarantined at ${key}. SHA-256: ${hash.slice(0, 16)}...`,
    });

    // 7. Security Scanning Pipeline
    const result = await scanQuarantinedUpload(scan, bytes, req.userContext);

    // 8. If CLEAN: Execute SecurityReleaseService to release to evidence storage & hash chain
    let finalStatus = result?.status || 'SCANNING';
    let documentVersionId;
    let evidenceId;

    if (result?.status === 'CLEAN') {
      try {
        const releaseResult = await SecurityReleaseService.releaseCleanUpload({
          scan: { ...scan, status: 'CLEAN' },
          userContext: req.userContext,
          uploadPayload: {
            title: title || meta.displayName,
            caseNumber,
            documentType,
            fileName: meta.displayName,
            fileType: meta.detectedMimeType,
          },
        });
        finalStatus = releaseResult.status;
        evidenceId = releaseResult.evidenceId;
        documentVersionId = releaseResult.evidenceVersionId;
      } catch (releaseErr) {
        console.error('Clean release execution error:', releaseErr.message);
        // Fail closed: Do NOT mark RELEASED if release service failed
        finalStatus = 'RELEASE_FAILED';
      }
    }

    res.status(202).json({
      success: true,
      uploadId,
      status: finalStatus,
      evidenceId,
      documentVersionId,
    });
  } catch (e) {
    next(e);
  }
}

export async function getUploadStatus(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('file_security_scans')
      .select('upload_id, status, evidence_id, evidence_version_id, case_id, uploaded_by, threat_name, error_message')
      .eq('upload_id', req.params.uploadId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Upload not found.' } });
    }

    // Authorization check: User must be uploader or have case access
    const c = await caseModel.getCaseById(data.case_id);
    const g = await caseModel.getDepartmentGrants([data.case_id], req.userContext.department);

    if (data.uploaded_by !== req.userContext.userId && !canAccessCase(req.userContext, c, g)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized.' } });
    }

    res.json({
      success: true,
      uploadId: data.upload_id,
      status: data.status,
      evidenceId: data.status === 'RELEASED' ? data.evidence_id : undefined,
      documentVersionId: data.status === 'RELEASED' ? data.evidence_version_id : undefined,
      message:
        data.status === 'QUARANTINED'
          ? 'The file failed security scanning and has been quarantined.'
          : data.status === 'SCAN_FAILED'
          ? 'Security scanning could not be completed.'
          : undefined,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * Rescan endpoint: Allows administrators and auditors to request a re-scan of a quarantined or failed upload.
 */
export async function postRescan(req, res, next) {
  try {
    const { uploadId } = req.params;
    const { data: scan, error } = await supabase
      .from('file_security_scans')
      .select('*')
      .eq('upload_id', uploadId)
      .maybeSingle();

    if (error) throw error;
    if (!scan) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Upload not found.' } });
    }

    // Role check: Only ADMIN and AUDITOR may rescan
    if (req.userContext.role !== ROLES.ADMIN && req.userContext.role !== ROLES.AUDITOR) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only administrators and auditors may rescan uploads.' },
      });
    }

    if (!scan.quarantine_path) {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_IN_QUARANTINE', message: 'File is not in quarantine.' },
      });
    }

    // Audit: FILE_RESCAN_REQUESTED
    await auditModel.createAuditEntry({
      userId: req.userContext.userId,
      userName: req.userContext.fullName,
      userRole: req.userContext.role,
      action: 'FILE_RESCAN_REQUESTED',
      resourceType: 'file_security_scan',
      resourceId: scan.id,
      resourceName: scan.file_name,
      details: `Rescan requested by ${req.userContext.role} ${req.userContext.fullName} for upload ${uploadId}.`,
    });

    // Download from quarantine to rescan
    const { data: qBlob, error: qErr } = await supabase.storage
      .from('aegis-quarantine')
      .download(scan.quarantine_path);

    if (qErr || !qBlob) {
      return res.status(404).json({
        success: false,
        error: { code: 'QUARANTINE_FILE_MISSING', message: 'Quarantined file could not be retrieved from storage.' },
      });
    }

    const rawBytes = Buffer.from(await qBlob.arrayBuffer());

    // Reset status to PENDING
    await supabase.from('file_security_scans').update({ status: 'PENDING' }).eq('id', scan.id);
    scan.status = 'PENDING';

    const scanResult = await scanQuarantinedUpload(scan, rawBytes, req.userContext);

    // Audit: FILE_RESCAN_COMPLETED
    await auditModel.createAuditEntry({
      userId: req.userContext.userId,
      userName: req.userContext.fullName,
      userRole: req.userContext.role,
      action: 'FILE_RESCAN_COMPLETED',
      resourceType: 'file_security_scan',
      resourceId: scan.id,
      resourceName: scan.file_name,
      details: `Rescan completed with status: ${scanResult?.status}.`,
    });

    let finalStatus = scanResult?.status;
    if (scanResult?.status === 'CLEAN') {
      const releaseResult = await SecurityReleaseService.releaseCleanUpload({
        scan,
        userContext: req.userContext,
        uploadPayload: {
          title: scan.file_name,
          documentType: 'other',
          fileName: scan.file_name,
          fileType: scan.detected_mime_type,
        },
      });
      finalStatus = releaseResult.status;
    }

    res.json({ success: true, uploadId, status: finalStatus });
  } catch (err) {
    next(err);
  }
}
