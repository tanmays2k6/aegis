import * as caseModel from '../models/caseModel.js';
import * as auditModel from '../models/auditModel.js';
import { canAccessCase, canPerformOnCase, departmentKey } from '../authorization/authorizationService.js';
import { PERMISSIONS } from '../authorization/permissions.js';

export async function getCases(req, res, next) {
  try {
    const { status, search } = req.query;
    const allCases = await caseModel.getAllCases({ status, search });
    
    // Server-side IDOR / Scope Enforcement:
    // Filter cases based on user's authorized scope (role, assignment, or jurisdiction)
    const grants = await caseModel.getDepartmentGrants((allCases || []).map((c) => c.id), req.userContext.department);
    const grantsByCase = new Map();
    grants.forEach((grant) => grantsByCase.set(grant.case_id, [...(grantsByCase.get(grant.case_id) || []), grant]));
    const scopedCases = (allCases || []).filter((c) => canAccessCase(req.userContext, c, grantsByCase.get(c.id) || []));
    
    res.json({ success: true, cases: scopedCases });
  } catch (err) {
    next(err);
  }
}

export async function getCase(req, res, next) {
  try {
    const record = await caseModel.getCaseById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found.' } });
    }

    // IDOR check: Verify caller is authorized to view this specific case
    const grants = await caseModel.getDepartmentGrants([record.id], req.userContext.department);
    if (!canAccessCase(req.userContext, record, grants)) {
      await auditModel.recordSecurityEvent(req, { actorUserId: req.userContext.userId, actorEmail: req.userContext.email, eventType: 'CASE_ACCESS_DENIED', resourceType: 'case', resourceId: record.id, details: 'Case access blocked by department ownership policy.' });
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have authorization to access this case matter.' },
      });
    }

    res.json({ success: true, case: record });
  } catch (err) {
    next(err);
  }
}

export async function postCase(req, res, next) {
  try {
    const ctx = req.userContext;
    const { case_number, title, description, priority, jurisdiction } = req.body;
    if (!case_number || !title) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Case number and title are required.' },
      });
    }

    const payload = {
      case_number,
      title,
      description,
      priority: priority || 'medium',
      jurisdiction: jurisdiction || ctx.jurisdiction || 'Bengaluru',
      owner_department: departmentKey(ctx.department),
      status: 'open',
      created_by: ctx.userId,
    };

    const record = await caseModel.createCase(payload);

    await auditModel.createAuditEntry({
      userId: ctx.userId,
      userName: ctx.fullName,
      userRole: ctx.role,
      action: 'Case registered',
      resourceType: 'case',
      resourceId: record.id,
      resourceName: case_number,
      details: `New case "${title}" registered under ${payload.jurisdiction}`,
    });

    res.status(201).json({ success: true, case: record });
  } catch (err) {
    err.status = 400;
    next(err);
  }
}

export async function patchCase(req, res, next) {
  try {
    const ctx = req.userContext;
    const existing = await caseModel.getCaseById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found.' } });
    }

    // Check if user is authorized to update this case matter
    const grants = await caseModel.getDepartmentGrants([existing.id], ctx.department);
    if (!canPerformOnCase(ctx, existing, grants, 'update_case')) {
      await auditModel.recordSecurityEvent(req, { actorUserId: ctx.userId, actorEmail: ctx.email, eventType: 'CASE_UPDATE_DENIED', resourceType: 'case', resourceId: existing.id, details: 'Case modification blocked by department ownership policy.' });
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to update this case.' },
      });
    }

    const allowedFields = ['title', 'description', 'priority', 'jurisdiction', 'status', 'assigned_officer'];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowedFields.includes(key)));
    if (!Object.keys(changes).length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No editable case fields were supplied.' },
      });
    }

    const record = await caseModel.updateCase(req.params.id, changes);

    await auditModel.createAuditEntry({
      userId: ctx.userId,
      userName: ctx.fullName,
      userRole: ctx.role,
      action: 'Case updated',
      resourceType: 'case',
      resourceId: req.params.id,
      resourceName: record?.case_number,
      details: 'Case details modified',
    });

    res.json({ success: true, case: record });
  } catch (err) {
    next(err);
  }
}

export async function getCaseDepartments(req, res, next) {
  try {
    const callerDepartment = departmentKey(req.userContext.department);
    const departments = await caseModel.getRegisteredDepartments();
    // Sharing to the owner's own department is meaningless and can obscure
    // which department actually received access.
    res.json({
      success: true,
      departments: departments.filter((department) => departmentKey(department) !== callerDepartment),
    });
  } catch (err) {
    next(err);
  }
}

export async function postCaseDepartmentAccess(req, res, next) {
  try {
    const ctx = req.userContext;
    const record = await caseModel.getCaseById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found.' } });
    if (departmentKey(record.owner_department) !== departmentKey(ctx.department)) {
      await auditModel.recordSecurityEvent(req, { actorUserId: ctx.userId, actorEmail: ctx.email, eventType: 'CASE_SHARE_DENIED', resourceType: 'case', resourceId: record.id, details: 'Only the owning department can share a case.' });
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the owning department can grant case access.' } });
    }
    const { department, permissions = ['view'], reason, expiresAt = null } = req.body;
    const allowed = ['view', 'add_evidence', 'update_case'];
    const validPermissions = [...new Set(permissions.filter((item) => allowed.includes(item)))];
    if (!department || !reason || !validPermissions.includes('view')) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Department, reason, and view permission are required.' } });
    const grant = await caseModel.grantDepartmentAccess({ case_id: record.id, department: departmentKey(department), permissions: validPermissions, grant_reason: reason, granted_by: ctx.userId, active: true, expires_at: expiresAt });
    await auditModel.createAuditEntry({ userId: ctx.userId, userName: ctx.fullName, userRole: ctx.role, action: 'CASE_DEPARTMENT_ACCESS_GRANTED', resourceType: 'case', resourceId: record.id, resourceName: record.case_number, details: `Granted ${departmentKey(department)}: ${validPermissions.join(', ')}. Reason: ${reason}` });
    res.status(201).json({ success: true, grant });
  } catch (err) { next(err); }
}
