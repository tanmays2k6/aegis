import { supabase } from '../config/supabase.js';

export async function getAllEvidence({ status, search } = {}) {
  let query = supabase.from('evidence').select('id, case_id, title, document_type, description, file_name, file_type, file_size, current_hash, status, version_number, uploaded_by, created_at, updated_at, cases(case_number,title)').order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  if (search) query = query.or(`title.ilike.%${search}%,file_name.ilike.%${search}%,current_hash.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getEvidenceById(id) {
  const { data, error } = await supabase.from('evidence').select('id, case_id, title, document_type, description, file_name, file_type, file_size, current_hash, status, version_number, uploaded_by, created_at, updated_at, cases(case_number,title)').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createEvidenceWithVersion(payload) {
  const { data, error } = await supabase.rpc('create_evidence_with_chain', {
    p_case_id: payload.case_id,
    p_title: payload.title,
    p_document_type: payload.document_type,
    p_file_name: payload.file_name,
    p_file_type: payload.file_type,
    p_file_size: payload.file_size,
    p_file_content: payload.file_content,
    p_current_hash: payload.current_hash,
    p_uploaded_by: payload.uploaded_by,
  });
  if (error) throw error;
  return getEvidenceById(data.id);
}

export async function updateEvidenceStatus(id, status) {
  const { data, error } = await supabase.from('evidence').update({ status }).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function findCaseByNumber(caseNumber) {
  const { data, error } = await supabase.from('cases').select('id, case_number, title').eq('case_number', caseNumber).maybeSingle();
  if (error) throw error;
  return data;
}
