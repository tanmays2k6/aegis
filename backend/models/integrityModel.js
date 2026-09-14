import crypto from 'crypto';
import { supabase } from '../config/supabase.js';

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

export async function verifyIntegrity() {
  const [evidenceResult, versionsResult, ledgerResult, auditResult] = await Promise.all([
    supabase.from('evidence').select('id,file_content,current_hash'),
    supabase.from('evidence_versions').select('id,file_content,file_hash,previous_chain_hash,chain_hash,uploaded_by'),
    supabase.from('hash_chain').select('sequence_number,record_type,record_id,record_hash,previous_hash,chain_hash').order('sequence_number'),
    supabase.from('audit_log').select('id,chain_hash'),
  ]);
  for (const result of [evidenceResult, versionsResult, ledgerResult, auditResult]) if (result.error) throw result.error;

  const failures = [];
  for (const item of evidenceResult.data || []) {
    const actual = hash(Buffer.from(item.file_content || '', 'base64'));
    if (!item.file_content || actual !== item.current_hash) failures.push({ type: 'evidence_content', id: item.id });
  }

  const recordHashes = new Map((auditResult.data || []).map((item) => [`audit_log:${item.id}`, item.chain_hash]));
  for (const item of versionsResult.data || []) {
    const contentHash = hash(Buffer.from(item.file_content || '', 'base64'));
    const versionHash = hash(`GENESIS:${item.file_hash}:${item.uploaded_by}`);
    if (!item.file_content || contentHash !== item.file_hash || item.previous_chain_hash !== 'GENESIS' || item.chain_hash !== versionHash) failures.push({ type: 'evidence_version', id: item.id });
    recordHashes.set(`evidence_version:${item.id}`, item.chain_hash);
  }

  let previous = 'GENESIS';
  for (const item of ledgerResult.data || []) {
    const expectedRecordHash = recordHashes.get(`${item.record_type}:${item.record_id}`);
    const expectedChainHash = hash(`${previous}:${item.record_type}:${item.record_id}:${item.record_hash}`);
    if (item.previous_hash !== previous || !expectedRecordHash || item.record_hash !== expectedRecordHash || item.chain_hash !== expectedChainHash) failures.push({ type: 'ledger_link', sequence: item.sequence_number });
    previous = item.chain_hash;
  }

  return {
    verifiedAt: new Date().toISOString(),
    evidenceChecked: (evidenceResult.data || []).length,
    versionsChecked: (versionsResult.data || []).length,
    ledgerEntriesChecked: (ledgerResult.data || []).length,
    valid: failures.length === 0,
    failures,
  };
}
