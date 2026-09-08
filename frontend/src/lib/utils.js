export function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function formatSize(bytes) {
  return bytes > 1000000 ? `${(bytes / 1000000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`;
}

export function shortHash(value) {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}

export function titleCase(value) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function sha256(value) {
  const input = value instanceof ArrayBuffer ? value : new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const roleLabels = {
  investigating_officer: 'Investigating Officer',
  court_clerk: 'Court Clerk',
  forensic_lab: 'Forensic Lab',
  admin: 'System Admin',
  auditor: 'Compliance Auditor',
};

export const demoCases = [
  { id: 'demo-1', case_number: 'FIR/2025/00428', title: 'Kalyan Nagar digital harassment inquiry', description: 'Investigation into coordinated online harassment reported by a protected witness.', status: 'under_investigation', priority: 'critical', jurisdiction: 'East Bengaluru', created_at: '2025-09-03T09:20:00Z', updated_at: '2025-09-07T10:15:00Z' },
  { id: 'demo-2', case_number: 'FIR/2025/00412', title: 'Electronic City financial fraud', description: 'Multi-channel payment fraud involving three complainants.', status: 'in_court', priority: 'high', jurisdiction: 'South Bengaluru', created_at: '2025-08-28T08:40:00Z', updated_at: '2025-09-06T14:25:00Z' },
  { id: 'demo-3', case_number: 'FIR/2025/00397', title: 'Missing person — HSR Layout', description: 'Open missing person investigation with active forensic requests.', status: 'open', priority: 'medium', jurisdiction: 'South Bengaluru', created_at: '2025-08-22T12:10:00Z', updated_at: '2025-09-05T16:45:00Z' },
  { id: 'demo-4', case_number: 'FIR/2025/00364', title: 'Indiranagar property impersonation', description: 'Identity documents and call records under review.', status: 'closed', priority: 'low', jurisdiction: 'East Bengaluru', created_at: '2025-08-10T10:30:00Z', updated_at: '2025-09-01T11:20:00Z' },
];

export const demoEvidence = [
  { id: 'ev-1', case_id: 'demo-1', title: 'Witness chat export', document_type: 'other', file_name: 'witness-chat-export.pdf', file_type: 'application/pdf', file_size: 2480000, current_hash: '6c4b8e12a9f0d3e7c1b2a8f5e4d6c9b0a3f7e2d1c8b4a6f9e0d3c5b7a2f1e4d', status: 'approved', version_number: 3, created_at: '2025-09-07T10:15:00Z', cases: { case_number: 'FIR/2025/00428', title: 'Kalyan Nagar digital harassment inquiry' } },
  { id: 'ev-2', case_id: 'demo-1', title: 'Forensic device image report', document_type: 'forensic_report', file_name: 'device-image-report.pdf', file_type: 'application/pdf', file_size: 7120000, current_hash: 'a98f40dd7c1e3b6a9f2d5e8c4b7a1f3d6e9c0b2a5f8d3e6c1b4a7f0e2d5c8b', status: 'submitted', version_number: 1, created_at: '2025-09-06T15:40:00Z', cases: { case_number: 'FIR/2025/00428', title: 'Kalyan Nagar digital harassment inquiry' } },
  { id: 'ev-3', case_id: 'demo-2', title: 'Payment gateway statements', document_type: 'other', file_name: 'gateway-statements.xlsx', file_type: 'application/vnd.ms-excel', file_size: 840000, current_hash: 'b1d2a600e8f7c3d1b6a9e4c2f5d8a3b7e1c4f6a0d2b5e8c3a1f4d7b9e6c2a5', status: 'locked', version_number: 2, created_at: '2025-09-05T09:10:00Z', cases: { case_number: 'FIR/2025/00412', title: 'Electronic City financial fraud' } },
];

export const demoAuditLogs = [
  { id: 'a1', user_name: 'Ananya Rao', user_role: 'investigating_officer', action: 'Evidence approved', resource_type: 'evidence', resource_name: 'Witness chat export', details: 'Version 3 approved for court submission', chain_hash: '92f0d1c8a1e6b3f7a4d2e9c6b1a5f8d3e7c0b4a2f9d6e3c1b8a5f2d7e4c9b', created_at: '2025-09-07T10:15:00Z' },
  { id: 'a2', user_name: 'Vikram Shah', user_role: 'forensic_lab', action: 'Hash verified', resource_type: 'evidence', resource_name: 'Forensic device image report', details: 'Fingerprint matched source media', chain_hash: '7a84cc31de0b6f3a9c2e5d1b8a4f7e3c6d9b2a5f8e1c4d7b0a3f6e9c2d5b8', created_at: '2025-09-07T09:42:00Z' },
  { id: 'a3', user_name: 'Ananya Rao', user_role: 'investigating_officer', action: 'Case viewed', resource_type: 'case', resource_name: 'FIR/2025/00428', details: 'Opened case workspace', chain_hash: 'e1204fd02b99a5c3f8d6b1a4e7c2d9b5a3f8e1c6d4b7a2f5e0c3d6b9a1f4e', created_at: '2025-09-07T09:20:00Z' },
  { id: 'a4', user_name: 'Court Clerk', user_role: 'court_clerk', action: 'Document downloaded', resource_type: 'evidence', resource_name: 'Payment gateway statements', details: 'Downloaded for hearing bundle', chain_hash: 'bc19a420e815f3d7b2a6c9e1d4b8a5f2e7c3d6b1a9f4e8c2d5b7a3f6e1c4d', created_at: '2025-09-06T16:05:00Z' },
];
