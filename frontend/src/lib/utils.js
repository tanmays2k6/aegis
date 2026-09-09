export function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function formatSize(bytes) {
  return bytes > 1000000 ? `${(bytes / 1000000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`;
}

export function shortHash(value) {
  return value && value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value || '';
}

export function titleCase(value) {
  return value ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '';
}

export async function sha256(value) {
  const input = value instanceof ArrayBuffer ? value : new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const roleLabels = {
  investigating_officer: 'Investigating Officer',
  forensic_officer: 'Forensic Officer',
  court_clerk: 'Court Clerk',
  auditor: 'Compliance Auditor',
  admin: 'System Administrator',
  officer: 'Investigating Officer',
  forensic_lab: 'Forensic Officer',
};

export const statusLabels = {
  active: 'Active',
  pending: 'Under Review',
  suspended: 'Suspended',
  deactivated: 'Deactivated',
};
