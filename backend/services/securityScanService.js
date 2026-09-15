import crypto from 'node:crypto';
import { supabase } from '../config/supabase.js';
import { ClamAVScanner } from './clamavScanner.js';
import * as auditModel from '../models/auditModel.js';

export const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

export async function scanQuarantinedUpload(scan, bytes, userContext = null) {
  const claimed = await supabase
    .from('file_security_scans')
    .update({ status: 'SCANNING', updated_at: new Date().toISOString() })
    .eq('id', scan.id)
    .eq('status', 'PENDING')
    .select()
    .maybeSingle();

  if (claimed.error) throw claimed.error;
  if (!claimed.data) return null;

  const actorUserId = userContext?.userId || scan.uploaded_by;
  const actorName = userContext?.fullName || 'System';
  const actorRole = userContext?.role || 'system';

  // Audit: MALWARE_SCAN_STARTED
  await auditModel.createAuditEntry({
    userId: actorUserId,
    userName: actorName,
    userRole: actorRole,
    action: 'MALWARE_SCAN_STARTED',
    resourceType: 'file_security_scan',
    resourceId: scan.id,
    resourceName: scan.file_name,
    details: `ClamAV scan initiated for upload ${scan.upload_id}. Hash: ${scan.file_hash.slice(0, 16)}...`,
  });

  const started = Date.now();
  const scanner = new ClamAVScanner();
  let result;

  try {
    result = await scanner.scan(bytes);
  } catch (error) {
    const isTimeout = error.code === 'SCAN_TIMEOUT';
    const status = 'SCAN_FAILED';

    await supabase
      .from('file_security_scans')
      .update({
        status,
        error_message: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scan.id)
      .eq('status', 'SCANNING');

    await supabase.from('file_security_scan_attempts').insert({
      upload_id: scan.upload_id,
      file_security_scan_id: scan.id,
      scanner: 'ClamAV',
      status: 'SCAN_FAILED',
      threat_name: null,
      error_message: error.message,
      started_at: new Date(started).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
    });

    const action = isTimeout ? 'MALWARE_SCAN_TIMEOUT' : 'MALWARE_SCAN_FAILED';
    await auditModel.createAuditEntry({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action,
      resourceType: 'file_security_scan',
      resourceId: scan.id,
      resourceName: scan.file_name,
      details: `Scan failed for upload ${scan.upload_id}: ${error.message}`,
    });

    return { status, timeout: isTimeout, error: error.message };
  }

  // Record scan attempt
  await supabase.from('file_security_scan_attempts').insert({
    upload_id: scan.upload_id,
    file_security_scan_id: scan.id,
    scanner: 'ClamAV',
    status: result.status,
    threat_name: result.threatName || null,
    started_at: new Date(started).toISOString(),
    completed_at: new Date().toISOString(),
    duration_ms: Date.now() - started,
  });

  // Update file_security_scans record with scan verdict
  await supabase
    .from('file_security_scans')
    .update({
      status: result.status,
      threat_name: result.threatName || null,
      scanned_at: new Date().toISOString(),
      scan_duration_ms: Date.now() - started,
      scanner: 'ClamAV',
      updated_at: new Date().toISOString(),
    })
    .eq('id', scan.id)
    .eq('status', 'SCANNING');

  if (result.status === 'CLEAN') {
    await auditModel.createAuditEntry({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'MALWARE_SCAN_CLEAN',
      resourceType: 'file_security_scan',
      resourceId: scan.id,
      resourceName: scan.file_name,
      details: `ClamAV scan completed CLEAN in ${Date.now() - started}ms for upload ${scan.upload_id}.`,
    });
  } else if (result.status === 'INFECTED') {
    await auditModel.createAuditEntry({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'MALWARE_DETECTED',
      resourceType: 'file_security_scan',
      resourceId: scan.id,
      resourceName: scan.file_name,
      details: `Malware detected by ClamAV: ${result.threatName} in upload ${scan.upload_id}.`,
    });

    // Mark QUARANTINED in database
    await supabase
      .from('file_security_scans')
      .update({ status: 'QUARANTINED', updated_at: new Date().toISOString() })
      .eq('id', scan.id);

    await auditModel.createAuditEntry({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'FILE_QUARANTINED',
      resourceType: 'file_security_scan',
      resourceId: scan.id,
      resourceName: scan.file_name,
      details: `Infected file quarantined. Upload ${scan.upload_id} permanently blocked from active evidence. Threat: ${result.threatName}`,
    });

    result.status = 'QUARANTINED';
  }

  return result;
}
