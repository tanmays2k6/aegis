import { supabase } from '../config/supabase.js';

export async function getAllAuditLogs({ search } = {}) {
  let query = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200);
  if (search) query = query.or(`user_name.ilike.%${search}%,action.ilike.%${search}%,resource_name.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createAuditEntry({ userId, userName, userRole, action, resourceType, resourceId, resourceName, details }) {
  const { data, error } = await supabase.rpc('append_audit_entry', {
    p_user_id: userId,
    p_user_name: userName,
    p_user_role: userRole,
    p_action: action,
    p_resource_type: resourceType,
    p_resource_id: resourceId,
    p_resource_name: resourceName,
    p_details: details,
  });
  if (error) throw error;
  return data;
}

// Security telemetry must never make the protected operation fail. The event
// itself is persisted through the append-only database function when available.
export async function recordSecurityEvent(req, { actorUserId = null, actorEmail = null, eventType, outcome = 'denied', resourceType = null, resourceId = null, details = null }) {
  try {
    await supabase.rpc('append_security_event', {
      p_actor_user_id: actorUserId,
      p_actor_email: actorEmail,
      p_event_type: eventType,
      p_outcome: outcome,
      p_request_path: req.originalUrl || req.path || null,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_details: details,
      p_client_ip: req.ip || null,
      p_user_agent: req.get?.('user-agent') || null,
    });
  } catch (error) {
    console.error('Security event logging failed:', error.message);
  }
}
