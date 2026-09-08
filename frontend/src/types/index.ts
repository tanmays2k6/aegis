export enum UserRole {
  OFFICER = 'officer',
  FORENSIC = 'forensic',
  COURT_CLERK = 'court_clerk',
  ADMIN = 'admin',
  AUDITOR = 'auditor',
}

export enum Permission {
  VIEW_CASE = 'VIEW_CASE',
  CREATE_CASE = 'CREATE_CASE',
  VIEW_DOCUMENT = 'VIEW_DOCUMENT',
  UPLOAD_DOCUMENT = 'UPLOAD_DOCUMENT',
  VERIFY_DOCUMENT = 'VERIFY_DOCUMENT',
  VIEW_AUDIT = 'VIEW_AUDIT',
  MANAGE_USERS = 'MANAGE_USERS',
}

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [UserRole.OFFICER]: 'Investigating Officer',
  [UserRole.FORENSIC]: 'Forensic Examiner',
  [UserRole.COURT_CLERK]: 'Court Liaison / Clerk',
  [UserRole.ADMIN]: 'System Administrator',
  [UserRole.AUDITOR]: 'Authorized Auditor',
};

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  jurisdiction: string;
  badge_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemHealthResponse {
  status: 'ok' | 'degraded' | 'unreachable';
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  latencyMs: number;
  components: {
    api: {
      status: string;
    };
    database: {
      status: string;
      latencyMs: number | null;
    };
    authentication: {
      status: string;
      provider: string;
    };
    security: {
      status: string;
      helmet: boolean;
      rateLimiter: boolean;
      cors: boolean;
    };
  };
}
