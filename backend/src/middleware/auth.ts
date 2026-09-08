import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AuthenticatedUser, UserRole, Permission, ROLE_PERMISSIONS } from '../types/index.js';
import { logger } from '../utils/logger.js';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Authentication required. Missing or malformed authorization header.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !userData.user) {
      logger.warn('Token validation failed', { error: authError?.message });
      res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Invalid or expired session token.',
      });
      return;
    }

    // Fetch user profile from Supabase public.profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      logger.error('Error querying user profile', { error: profileError.message });
    }

    const assignedRole = (profile?.role as UserRole) || UserRole.OFFICER;

    req.user = {
      id: userData.user.id,
      email: userData.user.email || '',
      role: assignedRole,
      profile: profile || undefined,
    };

    next();
  } catch (error) {
    logger.error('Unexpected error in auth middleware', { error });
    res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Authentication verification failed.',
    });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: 'Access forbidden. Insufficient role permissions.',
      });
      return;
    }

    next();
  };
};

export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Authentication required.',
      });
      return;
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    if (!userPermissions.includes(permission)) {
      res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: `Access forbidden. Missing permission: ${permission}`,
      });
      return;
    }

    next();
  };
};
