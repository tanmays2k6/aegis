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
