export const ROLES = Object.freeze({
  INVESTIGATING_OFFICER: 'investigating_officer',
  FORENSIC_OFFICER: 'forensic_officer',
  COURT_CLERK: 'court_clerk',
  AUDITOR: 'auditor',
  ADMIN: 'admin',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.INVESTIGATING_OFFICER]: 'Investigating Officer',
  [ROLES.FORENSIC_OFFICER]: 'Forensic Officer',
  [ROLES.COURT_CLERK]: 'Court Clerk',
  [ROLES.AUDITOR]: 'Auditor',
  [ROLES.ADMIN]: 'Administrator',
});

export const ACCOUNT_STATUSES = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DEACTIVATED: 'deactivated',
});
