import * as authModel from '../models/authModel.js';
import * as accessRequestModel from '../models/accessRequestModel.js';
import { setUserStatus, getUserStatus } from '../models/userStatusModel.js';
import { ROLES, ACCOUNT_STATUSES } from '../authorization/roles.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function postRequestAccess(req, res, next) {
  try {
    const { fullName, officialEmail, badgeNumber, department, designation, jurisdiction, requestedRole, reason } = req.body;
    if (!fullName || !officialEmail || !department || !designation || !jurisdiction || !reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'All required access request fields must be provided.' },
      });
    }

    // Role cannot be admin
    const allowedRequested = [ROLES.INVESTIGATING_OFFICER, ROLES.FORENSIC_OFFICER, ROLES.COURT_CLERK, ROLES.AUDITOR];
    const targetRole = allowedRequested.includes(requestedRole) ? requestedRole : ROLES.INVESTIGATING_OFFICER;

    // Check duplicate pending
    const existing = accessRequestModel.findPendingByEmail(officialEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_REQUEST', message: 'A pending access request already exists for this email.' },
      });
    }

    const requestRecord = accessRequestModel.createRequest({
      fullName,
      officialEmail,
      badgeNumber,
      department,
      designation,
      jurisdiction,
      requestedRole: targetRole,
      reason,
    });

    res.status(201).json({
      success: true,
      data: {
        id: requestRecord.id,
        message: 'Access request submitted successfully for administrative review.',
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function postSignUp(req, res, next) {
  try {
    const { email, password, fullName, badgeNumber, jurisdiction, department } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' },
      });
    }

    // CRITICAL SECURITY HARDENING: Never allow public client to specify role!
    // Default all public signups strictly to investigating_officer with pending status
    const data = await authModel.signUp({
      email,
      password,
      fullName: fullName || 'Officer',
      role: ROLES.INVESTIGATING_OFFICER,
      badgeNumber,
      jurisdiction: jurisdiction || 'Bengaluru',
      department: department || 'Bengaluru City Police',
    });

    // Mark as pending until vetted by an administrator
    if (data.user) {
      setUserStatus(data.user.id, ACCOUNT_STATUSES.PENDING);
    }

    res.status(201).json({
      success: true,
      data: {
        user: data.user,
        message: 'Account created and submitted for administrative approval.',
      },
    });
  } catch (err) {
    err.status = 400;
    next(err);
  }
}

export async function postSignIn(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' },
      });
    }

    const data = await authModel.signIn({ email, password });
    const profile = await authModel.getProfile(data.user.id);

    // Resolve status and role
    let role = profile?.role || ROLES.INVESTIGATING_OFFICER;
    if (role === 'officer') role = ROLES.INVESTIGATING_OFFICER;
    if (role === 'forensic_lab') role = ROLES.FORENSIC_OFFICER;

    const status = getUserStatus(data.user.id, profile?.status || ACCOUNT_STATUSES.ACTIVE);

    // Set secure HttpOnly cookies
    if (data.session) {
      res.cookie('coc_access_token', data.session.access_token, COOKIE_OPTIONS);
      if (data.session.refresh_token) {
        res.cookie('coc_refresh_token', data.session.refresh_token, COOKIE_OPTIONS);
      }
    }

    res.json({
      success: true,
      session: data.session,
      user: data.user,
      profile: { ...profile, role, status },
    });
  } catch (err) {
    err.status = 401;
    next(err);
  }
}

export async function postRefreshToken(req, res, next) {
  try {
    const refreshToken = req.cookies?.coc_refresh_token || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No refresh token available.' },
      });
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
      res.clearCookie('coc_access_token');
      res.clearCookie('coc_refresh_token');
      return res.status(401).json({
        success: false,
        error: { code: 'SESSION_EXPIRED', message: 'Session has expired. Please sign in again.' },
      });
    }

    res.cookie('coc_access_token', data.session.access_token, COOKIE_OPTIONS);
    if (data.session.refresh_token) {
      res.cookie('coc_refresh_token', data.session.refresh_token, COOKIE_OPTIONS);
    }

    res.json({ success: true, session: data.session });
  } catch (err) {
    next(err);
  }
}

export async function postSignOut(req, res, next) {
  try {
    res.clearCookie('coc_access_token');
    res.clearCookie('coc_refresh_token');
    res.json({ success: true, message: 'Signed out successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req, res, next) {
  try {
    res.json({
      success: true,
      profile: req.auth.profile,
      userContext: req.userContext,
    });
  } catch (err) {
    next(err);
  }
}
