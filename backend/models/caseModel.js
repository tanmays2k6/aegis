import { supabase } from '../config/supabase.js';

export async function getAllCases({ status, search } = {}) {
  let query = supabase.from('cases').select('*').order('updated_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  if (search) query = query.or(`title.ilike.%${search}%,case_number.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getCaseById(id) {
  const { data, error } = await supabase.from('cases').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRegisteredDepartments() {
  const { data, error } = await supabase.from('profiles').select('department');
  if (error) throw error;
  return [...new Set((data || [])
    .map((profile) => String(profile.department || '').trim())
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

export async function createCase(payload) {
  const { data, error } = await supabase.from('cases').insert(payload).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCase(id, payload) {
  const { data, error } = await supabase.from('cases').update(payload).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDepartmentGrants(caseIds, department) {
  const validCaseIds = caseIds.filter(Boolean);
  if (!validCaseIds.length || !department) return [];
  const { data, error } = await supabase.from('case_department_access')
    .select('*').in('case_id', validCaseIds).ilike('department', department).eq('active', true);
  if (error) throw error;
  return (data || []).filter((grant) => !grant.expires_at || new Date(grant.expires_at) > new Date());
}

export async function grantDepartmentAccess(payload) {
  const { data, error } = await supabase.from('case_department_access').upsert(payload, { onConflict: 'case_id,department' }).select().maybeSingle();
  if (error) throw error;
  return data;
}
