import { ROLE_PERMISSIONS, PERMISSIONS } from './permissions.js';
import { ROLES, ACCOUNT_STATUSES } from './roles.js';

export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(userContext, permission) {
  if (!userContext || userContext.status !== ACCOUNT_STATUSES.ACTIVE) {
    return false;
  }
  const perms = userContext.permissions || getPermissionsForRole(userContext.role);
  return perms.includes(permission);
}

/**
 * Scoped Case Access Control:
 * - ADMIN and AUDITOR have global read access across cases.
 * - INVESTIGATING_OFFICER, FORENSIC_OFFICER, COURT_CLERK can access if:
 *     1. They created the case (created_by === userId)
 *     2. They are the assigned officer (assigned_officer === userId)
 *     3. The case is within their designated jurisdiction
 */
export function canAccessCase(userContext, caseRecord) {
  if (!userContext || userContext.status !== ACCOUNT_STATUSES.ACTIVE) return false;
  if (!caseRecord) return false;

  const role = userContext.role;
  if (role === ROLES.ADMIN || role === ROLES.AUDITOR) return true;

  const isOwner = caseRecord.created_by === userContext.userId;
  const isAssigned = caseRecord.assigned_officer === userContext.userId;
  const matchesJurisdiction = userContext.jurisdiction &&
    caseRecord.jurisdiction &&
    caseRecord.jurisdiction.toLowerCase().trim() === userContext.jurisdiction.toLowerCase().trim();

  return isOwner || isAssigned || matchesJurisdiction;
}

/**
 * Scoped Evidence Access Control:
 * An authenticated active user can view an evidence item if:
 * 1. They have EVIDENCE_VIEW permission.
 * 2. They have authorization to access the associated parent case.
 */
export function canAccessEvidence(userContext, evidenceRecord, parentCase) {
  if (!userContext || userContext.status !== ACCOUNT_STATUSES.ACTIVE) return false;
  if (!evidenceRecord) return false;
  if (!hasPermission(userContext, PERMISSIONS.EVIDENCE_VIEW)) return false;

  const role = userContext.role;
  if (role === ROLES.ADMIN || role === ROLES.AUDITOR) return true;

  if (parentCase) {
    return canAccessCase(userContext, parentCase);
  }

  // Fallback: If uploader matches caller
  if (evidenceRecord.uploaded_by === userContext.userId) return true;

  return false;
}
