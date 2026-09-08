import { supabase } from '../config/supabase.js';

export async function getComplianceSummary() {
  const [evidenceResult, auditResult] = await Promise.all([
    supabase.from('evidence').select('*', { count: 'exact', head: true }),
    supabase.from('audit_log').select('*', { count: 'exact', head: true }),
  ]);
  if (evidenceResult.error) throw evidenceResult.error;
  if (auditResult.error) throw auditResult.error;
  const { count: evidenceCount } = evidenceResult;
  const { count: auditCount } = auditResult;
  return {
    evidenceRecords: evidenceCount ?? 0,
    auditEvents: auditCount ?? 0,
    chainContinuity: null,
    accessReviewCoverage: null,
    retentionAdherence: null,
    overallScore: null,
  };
}
