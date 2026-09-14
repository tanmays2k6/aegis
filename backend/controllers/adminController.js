import { supabase } from '../config/supabase.js';
import * as accessRequestModel from '../models/accessRequestModel.js';
import { setUserStatus, getUserStatus } from '../models/userStatusModel.js';
import * as auditModel from '../models/auditModel.js';
import { ROLES, ACCOUNT_STATUSES } from '../authorization/roles.js';

export async function getAccessRequests(req, res, next) {
  try {
    const requests = accessRequestModel.getAllRequests();
    res.json({ success: true, requests });
  } catch (err) {
    next(err);
  }
}

export async function approveAccessRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { assignedRole, reviewNotes } = req.body;
    const ctx = req.userContext;

    const requestRecord = accessRequestModel.getAllRequests().find((r) => r.id === id);
    if (!requestRecord) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Access request not found.' } });
    }

    if (requestRecord.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_REVIEWED', message: `Request is already ${requestRecord.status}.` },
      });
    }

    const finalRole = Object.values(ROLES).includes(assignedRole) ? assignedRole : requestRecord.requested_role;

    // Check if user already exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', requestRecord.official_email)
      .maybeSingle();

    if (existingProfile) {
      await supabase
        .from('profiles')
        .update({
          role: finalRole,
          department: requestRecord.department,
          jurisdiction: requestRecord.jurisdiction,
          badge_number: requestRecord.badge_number,
          full_name: requestRecord.full_name,
        })
        .eq('id', existingProfile.id);

      setUserStatus(existingProfile.id, ACCOUNT_STATUSES.ACTIVE);
    }

    const updated = accessRequestModel.updateRequest(id, {
      status: 'approved',
      assigned_role: finalRole,
      reviewed_by: ctx.userId,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || 'Approved by system administrator.',
    });

    await auditModel.createAuditEntry({
      userId: ctx.userId,
      userName: ctx.fullName,
      userRole: ctx.role,
      action: 'ACCESS_REQUEST_APPROVED',
      resourceType: 'user',
      resourceId: existingProfile?.id || null,
      resourceName: requestRecord.official_email,
      details: `Approved role: ${finalRole} for ${requestRecord.full_name} (${requestRecord.department})`,
    });

    res.json({ success: true, request: updated });
  } catch (err) {
    next(err);
  }
}

export async function rejectAccessRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;
    const ctx = req.userContext;

    const requestRecord = accessRequestModel.getAllRequests().find((r) => r.id === id);
    if (!requestRecord) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Access request not found.' } });
    }

    const updated = accessRequestModel.updateRequest(id, {
      status: 'rejected',
      reviewed_by: ctx.userId,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || 'Rejected by system administrator.',
    });

    await auditModel.createAuditEntry({
      userId: ctx.userId,
      userName: ctx.fullName,
      userRole: ctx.role,
      action: 'ACCESS_REQUEST_REJECTED',
      resourceType: 'user',
      resourceId: null,
      resourceName: requestRecord.official_email,
      details: `Reason / Notes: ${reviewNotes || 'Unspecified'}`,
    });

    res.json({ success: true, request: updated });
  } catch (err) {
    next(err);
  }
}

export async function getUsers(req, res, next) {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const enriched = (profiles || []).map((p) => ({
      ...p,
      status: getUserStatus(p.id, p.status || ACCOUNT_STATUSES.ACTIVE),
    }));

    res.json({ success: true, users: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getAdministrationOverview(_req, res, next) {
  try {
    const [{ data: profiles, error: profileError }, { data: activity, error: activityError }] = await Promise.all([
      supabase.from('profiles').select('*').order('department', { ascending: true }),
      supabase.from('audit_log').select('id,user_id,user_name,user_role,action,resource_name,details,created_at').order('created_at', { ascending: false }).limit(500),
    ]);
    if (profileError) throw profileError;
    if (activityError) throw activityError;

    const latestByUser = new Map();
    for (const entry of activity || []) {
      if (entry.user_id && !latestByUser.has(entry.user_id)) latestByUser.set(entry.user_id, entry);
    }
    const users = (profiles || []).map((profile) => {
      const latest = latestByUser.get(profile.id);
      return {
        ...profile,
        status: getUserStatus(profile.id, profile.status || ACCOUNT_STATUSES.ACTIVE),
        last_activity_at: latest?.created_at || profile.last_activity_at || null,
        last_activity: latest ? { action: latest.action, details: latest.details } : null,
      };
    });
    const departments = Object.values(users.reduce((groups, user) => {
      const name = user.department?.trim() || 'Unassigned';
      const group = groups[name] || { name, user_count: 0, active_count: 0, admin_count: 0, latest_activity_at: null };
      group.user_count += 1;
      if (user.status === ACCOUNT_STATUSES.ACTIVE) group.active_count += 1;
      if (user.role === ROLES.ADMIN) group.admin_count += 1;
      if (user.last_activity_at && (!group.latest_activity_at || new Date(user.last_activity_at) > new Date(group.latest_activity_at))) group.latest_activity_at = user.last_activity_at;
      groups[name] = group;
      return groups;
    }, {})).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      success: true,
      summary: {
        total_users: users.length,
        active_users: users.filter((user) => user.status === ACCOUNT_STATUSES.ACTIVE).length,
        administrators: users.filter((user) => user.role === ROLES.ADMIN).length,
        departments: departments.length,
      },
      departments,
      users,
      recent_activity: (activity || []).slice(0, 12),
    });
  } catch (err) { next(err); }
}

export async function patchUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const ctx = req.userContext;

    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid role specified.' },
      });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!profile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });
    }

    await auditModel.createAuditEntry({
      userId: ctx.userId,
      userName: ctx.fullName,
      userRole: ctx.role,
      action: role === ROLES.ADMIN ? 'ADMIN_ROLE_GRANTED' : 'ROLE_CHANGED',
      resourceType: 'user',
      resourceId: id,
      resourceName: profile.full_name || profile.email,
      details: `Role updated to ${role}`,
    });

    res.json({ success: true, user: { ...profile, status: getUserStatus(id) } });
  } catch (err) {
    next(err);
  }
}

export async function patchUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const ctx = req.userContext;

    if (!Object.values(ACCOUNT_STATUSES).includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid status specified.' },
      });
    }

    // Prevent administrator from deactivating themselves
    if (id === ctx.userId && status !== ACCOUNT_STATUSES.ACTIVE) {
      return res.status(400).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Administrators cannot deactivate or suspend their own account.' },
      });
    }

    setUserStatus(id, status);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const actionName =
      status === ACCOUNT_STATUSES.SUSPENDED
        ? 'ACCOUNT_SUSPENDED'
        : status === ACCOUNT_STATUSES.DEACTIVATED
        ? 'ACCOUNT_DEACTIVATED'
        : 'ACCOUNT_REACTIVATED';

    await auditModel.createAuditEntry({
      userId: ctx.userId,
      userName: ctx.fullName,
      userRole: ctx.role,
      action: actionName,
      resourceType: 'user',
      resourceId: id,
      resourceName: profile?.full_name || profile?.email || id,
      details: `Account status updated to ${status}`,
    });

    res.json({ success: true, user: { ...profile, status } });
  } catch (err) {
    next(err);
  }
}
