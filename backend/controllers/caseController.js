import * as caseModel from '../models/caseModel.js';
import * as auditModel from '../models/auditModel.js';

export async function getCases(req, res, next) {
  try {
    const { status, search } = req.query;
    const cases = await caseModel.getAllCases({ status, search });
    res.json({ cases });
  } catch (err) { next(err); }
}

export async function getCase(req, res, next) {
  try {
    const record = await caseModel.getCaseById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Case not found.' });
    res.json({ case: record });
  } catch (err) { next(err); }
}

export async function postCase(req, res, next) {
  try {
    const auth = req.auth;
    const { case_number, title, description, priority, jurisdiction } = req.body;
    if (!case_number || !title) return res.status(400).json({ error: 'Case number and title are required.' });
    const payload = { case_number, title, description, priority: priority || 'medium', jurisdiction: jurisdiction || auth.profile?.jurisdiction || 'Bengaluru', status: 'open', created_by: auth.user.id };
    const record = await caseModel.createCase(payload);
    await auditModel.createAuditEntry({ userId: auth.user.id, userName: auth.profile?.full_name || 'Unknown', userRole: auth.profile?.role || 'investigating_officer', action: 'Case registered', resourceType: 'case', resourceId: record.id, resourceName: case_number, details: `New case "${title}" registered` });
    res.status(201).json({ case: record });
  } catch (err) { err.status = 400; next(err); }
}

export async function patchCase(req, res, next) {
  try {
    const auth = req.auth;
    const existing = await caseModel.getCaseById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Case not found.' });
    const mayUpdate = existing.created_by === auth.user.id
      || existing.assigned_officer === auth.user.id
      || ['admin', 'court_clerk'].includes(auth.profile.role);
    if (!mayUpdate) return res.status(403).json({ error: 'You do not have permission to update this case.' });
    const allowedFields = ['title', 'description', 'priority', 'jurisdiction', 'status', 'assigned_officer'];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowedFields.includes(key)));
    if (!Object.keys(changes).length) return res.status(400).json({ error: 'No editable case fields were supplied.' });
    const record = await caseModel.updateCase(req.params.id, changes);
    await auditModel.createAuditEntry({ userId: auth.user.id, userName: auth.profile?.full_name || 'Unknown', userRole: auth.profile?.role || 'investigating_officer', action: 'Case updated', resourceType: 'case', resourceId: req.params.id, resourceName: record?.case_number, details: 'Case details modified' });
    res.json({ case: record });
  } catch (err) { next(err); }
}
