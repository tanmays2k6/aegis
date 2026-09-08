import * as evidenceModel from '../models/evidenceModel.js';
import * as auditModel from '../models/auditModel.js';
import crypto from 'crypto';

export async function getEvidence(req, res, next) {
  try {
    const { status, search } = req.query;
    const items = await evidenceModel.getAllEvidence({ status, search });
    res.json({ evidence: items });
  } catch (err) { next(err); }
}

export async function getEvidenceItem(req, res, next) {
  try {
    const item = await evidenceModel.getEvidenceById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Evidence not found.' });
    res.json({ evidence: item });
  } catch (err) { next(err); }
}

export async function postEvidence(req, res, next) {
  try {
    const auth = req.auth;
    const { title, caseNumber, documentType, fileName, fileType, fileContent, currentHash } = req.body;
    if (!title || !caseNumber || !fileName || !currentHash || !fileContent) return res.status(400).json({ error: 'Title, case number, file name, file content, and hash are required.' });
    const foundCase = await evidenceModel.findCaseByNumber(caseNumber);
    if (!foundCase || foundCase.case_number !== caseNumber) return res.status(400).json({ error: 'Select an existing case number before uploading evidence.' });
    const bytes = Buffer.from(fileContent, 'base64');
    if (!bytes.length || bytes.length > 10 * 1024 * 1024) return res.status(400).json({ error: 'Evidence files must be between 1 byte and 10 MB.' });
    const actualHash = crypto.createHash('sha256').update(bytes).digest('hex');
    if (actualHash !== currentHash) return res.status(400).json({ error: 'Evidence hash does not match the uploaded file.' });
    const payload = { case_id: foundCase.id, title, document_type: documentType || 'other', file_name: fileName, file_type: fileType || 'application/octet-stream', file_size: bytes.length, file_content: fileContent, current_hash: actualHash, status: 'submitted', version_number: 1, uploaded_by: auth.user.id };
    const record = await evidenceModel.createEvidenceWithVersion(payload);
    await auditModel.createAuditEntry({ userId: auth.user.id, userName: auth.profile?.full_name || 'Unknown', userRole: auth.profile?.role || 'investigating_officer', action: 'Evidence anchored', resourceType: 'evidence', resourceId: record.id, resourceName: title, details: `SHA-256: ${currentHash.slice(0, 16)}…` });
    res.status(201).json({ evidence: record });
  } catch (err) { err.status = 400; next(err); }
}

export async function patchEvidenceStatus(req, res, next) {
  try {
    const auth = req.auth;
    const { status } = req.body;
    if (!['draft', 'submitted', 'approved', 'locked'].includes(status)) return res.status(400).json({ error: 'Invalid evidence status.' });
    if (!['admin', 'court_clerk'].includes(auth.profile.role)) return res.status(403).json({ error: 'Only administrators and court clerks can change evidence status.' });
    const existing = await evidenceModel.getEvidenceById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Evidence not found.' });
    const record = await evidenceModel.updateEvidenceStatus(req.params.id, status);
    await auditModel.createAuditEntry({ userId: auth.user.id, userName: auth.profile?.full_name || 'Unknown', userRole: auth.profile?.role || 'investigating_officer', action: 'Evidence status changed', resourceType: 'evidence', resourceId: req.params.id, resourceName: record?.title, details: `Status set to ${status}` });
    res.json({ evidence: record });
  } catch (err) { next(err); }
}
