import { z } from 'zod';

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

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [UserRole.OFFICER]: [
    Permission.VIEW_CASE,
    Permission.CREATE_CASE,
    Permission.VIEW_DOCUMENT,
    Permission.UPLOAD_DOCUMENT,
  ],
  [UserRole.FORENSIC]: [
    Permission.VIEW_CASE,
    Permission.VIEW_DOCUMENT,
    Permission.UPLOAD_DOCUMENT,
    Permission.VERIFY_DOCUMENT,
  ],
  [UserRole.COURT_CLERK]: [
    Permission.VIEW_CASE,
    Permission.VIEW_DOCUMENT,
  ],
  [UserRole.ADMIN]: [
    Permission.VIEW_CASE,
    Permission.CREATE_CASE,
    Permission.VIEW_DOCUMENT,
    Permission.UPLOAD_DOCUMENT,
    Permission.VERIFY_DOCUMENT,
    Permission.VIEW_AUDIT,
    Permission.MANAGE_USERS,
  ],
  [UserRole.AUDITOR]: [
    Permission.VIEW_CASE,
    Permission.VIEW_DOCUMENT,
    Permission.VIEW_AUDIT,
  ],
} as const;

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

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  profile?: UserProfile;
}

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  department: z.string().min(2).max(100).optional(),
  jurisdiction: z.string().min(2).max(100).optional(),
  badge_id: z.string().max(50).nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
