import { ROLE_PERMISSIONS, PERMISSIONS } from './permissions.js';
import { ROLES, ACCOUNT_STATUSES } from './roles.js';

/**
 * The database still contains the original enum values for a few legacy roles.
 * Convert those values at the authorization boundary so every caller receives
 * the same permissions, whether the context was just created or restored from
 * an existing session.
 */
export function normalizeRole(role) {
  const legacyRoles = {
    officer: ROLES.INVESTIGATING_OFFICER,
    forensic_lab: ROLES.FORENSIC_OFFICER,
  };
  return legacyRoles[role] || role;
}

export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[normalizeRole(role)] || [];
}

export function hasPermission(userContext, permission) {
  if (!userContext || userContext.status !== ACCOUNT_STATUSES.ACTIVE) {
    return false;
  }
  // Always resolve from the present role instead of trusting a permission list
  // retained in an older browser session.
  const perms = getPermissionsForRole(userContext.role);
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
export function departmentKey(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

function isActiveGrant(grant) {
  return grant?.active && (!grant.expires_at || new Date(grant.expires_at) > new Date());
}

export function canAccessCase(userContext, caseRecord, grants = []) {
  if (!userContext || userContext.status !== ACCOUNT_STATUSES.ACTIVE) return false;
  if (!caseRecord) return false;

  // Compliance reviewers need read-only visibility across departmental
  // boundaries. Operational users remain restricted to ownership/grants.
  if ([ROLES.ADMIN, ROLES.AUDITOR].includes(normalizeRole(userContext.role))) return true;

  const department = departmentKey(userContext.department);
  const ownsCase = department && department === departmentKey(caseRecord.owner_department);
  // Legacy fallback is retained only for old records that predate ownership.
  const legacyOwner = !caseRecord.owner_department && caseRecord.created_by === userContext.userId;
  const hasViewGrant = grants.some((grant) => isActiveGrant(grant)
    && departmentKey(grant.department) === department
    && grant.permissions?.includes('view'));
  return ownsCase || legacyOwner || hasViewGrant;
}

export function canPerformOnCase(userContext, caseRecord, grants = [], permission) {
  if (!canAccessCase(userContext, caseRecord, grants)) return false;
  if (normalizeRole(userContext.role) === ROLES.ADMIN) return true;
  if (departmentKey(userContext.department) === departmentKey(caseRecord.owner_department)) return true;
  return grants.some((grant) => isActiveGrant(grant)
    && departmentKey(grant.department) === departmentKey(userContext.department)
    && grant.permissions?.includes(permission));
}

/**
 * Scoped Evidence Access Control:
 * An authenticated active user can view an evidence item if:
 * 1. They have EVIDENCE_VIEW permission.
 * 2. They have authorization to access the associated parent case.
 */
export function canAccessEvidence(userContext, evidenceRecord, parentCase, grants = []) {
  if (!userContext || userContext.status !== ACCOUNT_STATUSES.ACTIVE) return false;
  if (!evidenceRecord) return false;
  if (!hasPermission(userContext, PERMISSIONS.EVIDENCE_VIEW)) return false;

  if (parentCase) {
    return canAccessCase(userContext, parentCase, grants);
  }

  // Fallback: If uploader matches caller
  if (evidenceRecord.uploaded_by === userContext.userId) return true;

  return false;
}
