import {
  ArrowUpRight, BadgeCheck, BookOpen, Check, ChevronRight,
  Clock3, ShieldCheck, Users, Zap,
} from 'lucide-react';
import { PageHeading } from '../components/Shared.jsx';
import { api } from '../lib/api.js';

export default function ComplianceView() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.compliance.get().then((data) => { setSummary(data.compliance); setError(''); }).catch((requestError) => setError(requestError.message));
  useEffect(() => { load(); }, []);
  const checks = [
    { label: 'Evidence records', detail: 'Records currently stored in this workspace', value: String(summary?.evidenceRecords ?? '—'), tone: 'blue' },
    { label: 'Audit events', detail: 'Recorded, hash-linked system events', value: String(summary?.auditEvents ?? '—'), tone: 'blue' },
    { label: 'Chain continuity', detail: 'Automated chain verification is not yet available', value: 'Not assessed', tone: 'amber' },
    { label: 'Retention policy', detail: 'Retention review rules have not been configured', value: 'Not assessed', tone: 'amber' },
  ];
  return (
    <>
      <PageHeading
        eyebrow="COMPLIANCE / SYSTEM ASSURANCE"
        title="Compliance posture"
        description="A clear, court-ready view of how your system protects digital evidence."
        action={<button className="primary-button" onClick={load}><ShieldCheck size={17} /> Refresh metrics</button>}
      />
      <div className="compliance-hero">
        <div className="compliance-seal"><ShieldCheck size={32} /></div>
        <div>
          <p className="eyebrow">CURRENT ASSESSMENT</p>
          <h2>{error ? 'Metrics unavailable' : 'Live system metrics'}</h2>
          <p>{error || 'Counts are read from the connected database. Chain verification is explicitly marked until implemented.'}</p>
        </div>
        <div className="compliance-score"><strong>—</strong><span>/ 100</span><small>Not assessed</small></div>
      </div>
      <div className="compliance-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><p className="eyebrow">CONTROL CHECKS</p><h3>Protection controls</h3></div>
            <BadgeCheck size={20} className="verified" />
          </div>
          <div className="check-list">
            {checks.map((check) => (
              <div className="check-row" key={check.label}>
                <div className={`check-ring ${check.tone}`}><Check size={15} /></div>
                <div className="check-copy"><strong>{check.label}</strong><span>{check.detail}</span></div>
                <strong className="check-value">{check.value}</strong>
                <ChevronRight size={16} />
              </div>
            ))}
          </div>
        </section>
        <section className="panel framework-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">GOVERNANCE MAP</p><h3>Evidence standards</h3></div>
            <BookOpen size={20} className="muted-icon" />
          </div>
          <div className="framework-list">
            <div>
              <span className="framework-code">IT</span>
              <div><strong>Information Technology Act</strong><small>Digital records &amp; signatures</small></div>
              <BadgeCheck size={16} />
            </div>
            <div>
              <span className="framework-code">EA</span>
              <div><strong>Bharatiya Sakshya Adhiniyam</strong><small>Electronic evidence admissibility</small></div>
              <BadgeCheck size={16} />
            </div>
            <div>
              <span className="framework-code">DP</span>
              <div><strong>Data protection controls</strong><small>Access, retention &amp; accountability</small></div>
              <BadgeCheck size={16} />
            </div>
          </div>
        </section>
      </div>
      <section className="panel recommendations">
        <div className="panel-heading">
          <div><p className="eyebrow">ATTENTION NEEDED</p><h3>Recommended actions</h3></div>
          <span className="status-pill warning"><span /> Manual review</span>
        </div>
        <div className="recommendation-row">
          <div className="rec-icon amber"><Clock3 size={17} /></div>
          <div><strong>Configure retention windows</strong><p>Retention rules are not configured for this workspace.</p></div>
        </div>
        <div className="recommendation-row">
          <div className="rec-icon blue"><Users size={17} /></div>
          <div><strong>Complete access review</strong><p>Review privileged accounts before using this system with real evidence.</p></div>
        </div>
      </section>
    </>
  );
}
import { useEffect, useState } from 'react';
