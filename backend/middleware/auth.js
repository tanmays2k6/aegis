import { supabase } from '../config/supabase.js';
import { getUserStatus } from '../models/userStatusModel.js';
import { getPermissionsForRole, hasPermission } from '../authorization/authorizationService.js';
import { ACCOUNT_STATUSES } from '../authorization/roles.js';

export async function getUserFromToken(req) {
  // Check authorization header or secure cookie
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '').trim();
  } else if (req.cookies && req.cookies.coc_access_token) {
    token = req.cookies.coc_access_token;
  }

  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile) return null;

  // Resolve canonical role
  let role = profile.role;
  if (role === 'officer') role = 'investigating_officer';
  if (role === 'forensic_lab') role = 'forensic_officer';

  // Resolve status
  const status = getUserStatus(data.user.id, profile.status || ACCOUNT_STATUSES.ACTIVE);

  // Normalized authentication context
  const userContext = {
    userId: data.user.id,
    email: data.user.email,
    role,
    status,
    department: profile.department || 'State Police',
    jurisdiction: profile.jurisdiction || 'Bengaluru',
    badgeNumber: profile.badge_number || profile.badge_id || null,
    fullName: profile.full_name || profile.name || 'Officer',
    permissions: getPermissionsForRole(role),
  };

  return {
    user: data.user,
    profile: { ...profile, role, status },
    context: userContext,
  };
}

export async function requireAuth(req, res, next) {
  try {
    const auth = await getUserFromToken(req);
    if (!auth) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }

    if (auth.context.status !== ACCOUNT_STATUSES.ACTIVE) {
      const statusMessages = {
        [ACCOUNT_STATUSES.PENDING]: 'Your access request is currently pending administrative review.',
        [ACCOUNT_STATUSES.SUSPENDED]: 'This account has been suspended. Please contact your department administrator.',
        [ACCOUNT_STATUSES.DEACTIVATED]: 'This account has been deactivated.',
      };
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          status: auth.context.status,
          message: statusMessages[auth.context.status] || 'Account is not authorized.',
        },
      });
    }

    req.auth = auth;
    req.userContext = auth.context;
    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.userContext || !hasPermission(req.userContext, permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action.',
        },
      });
    }
    next();
  };
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.userContext || !roles.includes(req.userContext.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have the required role to perform this action.',
        },
      });
    }
    next();
  };
}
