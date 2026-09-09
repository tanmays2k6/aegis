import * as evidenceModel from '../models/evidenceModel.js';
import * as caseModel from '../models/caseModel.js';
import * as auditModel from '../models/auditModel.js';
import { canAccessEvidence, canAccessCase } from '../authorization/authorizationService.js';
import crypto from 'crypto';

export async function getEvidence(req, res, next) {
  try {
    const { status, search } = req.query;
    const items = await evidenceModel.getAllEvidence({ status, search });
    
    // Server-side Scoping: Return only evidence items where the caller can access the parent case
    const scoped = [];
    for (const item of (items || [])) {
      let parentCase = item.cases;
      if (!parentCase && item.case_id) {
        parentCase = await caseModel.getCaseById(item.case_id);
      }
      if (canAccessEvidence(req.userContext, item, parentCase)) {
        scoped.push(item);
      }
    }

    res.json({ success: true, evidence: scoped });
  } catch (err) {
    next(err);
  }
}

export async function getEvidenceItem(req, res, next) {
  try {
    const item = await evidenceModel.getEvidenceById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Evidence record not found.' } });
    }

    // Verify parent case access
    let parentCase = item.cases;
    if (!parentCase && item.case_id) {
      parentCase = await caseModel.getCaseById(item.case_id);
    }

    if (!canAccessEvidence(req.userContext, item, parentCase)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have authorization to view this evidence record.' },
      });
    }

    res.json({ success: true, evidence: item });
  } catch (err) {
    next(err);
  }
}

export async function postEvidence(req, res, next) {
  try {
    const ctx = req.userContext;
    const { title, caseNumber, documentType, fileName, fileType, fileContent, currentHash } = req.body;
    if (!title || !caseNumber || !fileName || !currentHash || !fileContent) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Title, case number, file name, file content, and hash are required.' },
      });
    }

    const foundCase = await evidenceModel.findCaseByNumber(caseNumber);
    if (!foundCase || foundCase.case_number !== caseNumber) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CASE', message: 'Select an existing registered case number before uploading evidence.' },
      });
    }

    // Check authorization on parent case
    if (!canAccessCase(ctx, foundCase)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to attach evidence to this case.' },
      });
    }

    const bytes = Buffer.from(fileContent, 'base64');
    if (!bytes.length || bytes.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_FILE_SIZE', message: 'Evidence files must be between 1 byte and 10 MB.' },
      });
    }

    const actualHash = crypto.createHash('sha256').update(bytes).digest('hex');
    if (actualHash !== currentHash) {
      return res.status(400).json({
        success: false,
        error: { code: 'HASH_MISMATCH', message: 'Evidence cryptographic hash does not match the uploaded payload.' },
      });
    }

    const payload = {
      case_id: foundCase.id,
      title,
      document_type: documentType || 'other',
      file_name: fileName,
      file_type: fileType || 'application/octet-stream',
      file_size: bytes.length,
      file_content: fileContent,
      current_hash: actualHash,
      status: 'submitted',
      version_number: 1,
      uploaded_by: ctx.userId,
    };

    const record = await evidenceModel.createEvidenceWithVersion(payload);

    await auditModel.createAuditEntry({
      userId: ctx.userId,
      userName: ctx.fullName,
      userRole: ctx.role,
      action: 'Evidence anchored',
      resourceType: 'evidence',
      resourceId: record.id,
      resourceName: title,
      details: `SHA-256: ${currentHash.slice(0, 16)}… anchored under case ${caseNumber}`,
    });

    res.status(201).json({ success: true, evidence: record });
  } catch (err) {
    err.status = 400;
    next(err);
  }
}

export async function patchEvidenceStatus(req, res, next) {
  try {
    const ctx = req.userContext;
    const { status } = req.body;
    if (!['draft', 'submitted', 'approved', 'locked'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid evidence status.' },
      });
    }

    const existing = await evidenceModel.getEvidenceById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Evidence record not found.' } });
    }

    // Verify parent case access
    let parentCase = existing.cases;
    if (!parentCase && existing.case_id) {
      parentCase = await caseModel.getCaseById(existing.case_id);
    }
    if (!canAccessEvidence(ctx, existing, parentCase)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to change evidence in this case.' },
      });
    }

    const record = await evidenceModel.updateEvidenceStatus(req.params.id, status);

    await auditModel.createAuditEntry({
      userId: ctx.userId,
      userName: ctx.fullName,
      userRole: ctx.role,
      action: 'Evidence status changed',
      resourceType: 'evidence',
      resourceId: req.params.id,
      resourceName: record?.title,
      details: `Status updated to ${status}`,
    });

    res.json({ success: true, evidence: record });
  } catch (err) {
    next(err);
  }
}
