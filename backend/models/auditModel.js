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
