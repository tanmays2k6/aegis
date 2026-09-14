import { useEffect, useState } from 'react';
import {
  ArrowUpRight, BadgeCheck, BriefcaseBusiness, Check, ChevronDown,
  ClipboardCheck, Clock3, ChevronRight, FileCheck2, FileText, Hash, Plus, ShieldCheck, Zap,
} from 'lucide-react';
import { PageHeading, StatCard, StatusBadge } from '../components/Shared.jsx';
import { api } from '../lib/api.js';
import { formatDate, shortHash } from '../lib/utils.js';

export default function Dashboard({ profile, setView }) {
  const [cases, setCases] = useState([]);
  const [evidence, setEvidence] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [caseData, evidenceData] = await Promise.all([
          api.cases.list(),
          api.evidence.list(),
        ]);
        setCases(caseData.cases ?? []);
        setEvidence(evidenceData.evidence ?? []);
      } catch { /* Individual screens show an empty state when data cannot load. */ }
    })();
  }, []);

  const active = cases.filter((item) => item.status === 'under_investigation' || item.status === 'open').length;
  const inCourt = cases.filter((item) => item.status === 'in_court').length;
  const canReview = ['admin', 'auditor'].includes(profile.role);
  const activity = buildActivity(cases, evidence);
  const activityMax = Math.max(...activity.map((item) => item.total), 1);
  const chartPoints = activity.map((item, index) => {
    const x = (index / Math.max(activity.length - 1, 1)) * 640;
    const y = 190 - ((item.total / activityMax) * 160);
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,210 ${chartPoints} 640,210`;

  return (
    <>
      <PageHeading
        eyebrow={`COMMAND CENTER / ${new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()).toUpperCase()}`}
        title={`Good morning, ${profile.full_name.split(' ')[0]}.`}
        description="Here’s the current pulse of your evidence operations."
        action={<button className="primary-button" onClick={() => setView('cases')}><Plus size={17} /> New case</button>}
      />
      <div className="stat-grid">
        <StatCard label="Active investigations" value={String(active)} detail="Current open and in-progress cases" icon={BriefcaseBusiness} tone="blue" onClick={() => setView('cases')} />
        <StatCard label="Evidence items" value={String(evidence.length)} detail="Items recorded in this workspace" icon={FileCheck2} tone="teal" onClick={() => setView('evidence')} />
        <StatCard label="Awaiting court" value={String(inCourt)} detail="Cases currently in court" icon={ClipboardCheck} tone="amber" onClick={() => setView('cases')} />
        <StatCard label="Chain integrity" value="—" detail="Verification has not been run" icon={ShieldCheck} tone="green" onClick={canReview ? () => setView('compliance') : undefined} />
      </div>
      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">LIVE PULSE</p><h3>Operational overview</h3></div>
            {canReview && <button className="text-button" onClick={() => setView('audit')}>View audit trail <ArrowUpRight size={15} /></button>}
          </div>
          <div className="chart-wrap">
            <div className="chart-labels"><span>{activityMax}</span><span>{Math.ceil(activityMax * .75)}</span><span>{Math.ceil(activityMax * .5)}</span><span>{Math.ceil(activityMax * .25)}</span><span>0</span></div>
            <div className="chart">
              <div className="chart-grid"><i /><i /><i /><i /><i /></div>
              <svg viewBox="0 0 640 210" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#1e78a6" stopOpacity=".25" />
                    <stop offset="100%" stopColor="#1e78a6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={areaPoints} fill="url(#area)" />
                <polyline points={chartPoints} fill="none" stroke="#1e78a6" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="chart-dates">{activity.map((item) => <span key={item.key}>{item.label}</span>)}</div>
            </div>
          </div>
          <div className="chart-legend">
            <span><i className="legend-blue" />Evidence actions</span>
            <span><i className="legend-grey" />Case updates</span>
            <strong>Last 7 days <ChevronDown size={14} /></strong>
          </div>
        </section>
        <section className="panel chain-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">ANCHOR STATUS</p><h3>Chain health</h3></div>
            <span className="status-pill warning"><span /> Not assessed</span>
          </div>
          <div className="chain-score">
            <div className="score-ring"><div><strong>--</strong><small>%</small></div></div>
            <div><strong>Integrity has not been assessed.</strong><p>A privileged reviewer can run the compliance check after records are added.</p></div>
          </div>
          <div className="chain-items">
            <div><span className="chain-dot amber" /><div><strong>Evidence ledger</strong><small>Requires a compliance review</small></div><Clock3 size={16} /></div>
            <div><span className="chain-dot amber" /><div><strong>Audit sequence</strong><small>Requires a compliance review</small></div><Clock3 size={16} /></div>
          </div>
          {canReview && <button className="secondary-button full" onClick={() => setView('compliance')}>Run integrity check <Zap size={16} /></button>}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div><p className="eyebrow">RECENT ACTIVITY</p><h3>Latest evidence movements</h3></div>
          <button className="text-button" onClick={() => setView('evidence')}>Open evidence vault <ArrowUpRight size={15} /></button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Evidence item</th><th>Case</th><th>Status</th><th>Last updated</th><th>Hash anchor</th><th /></tr>
            </thead>
            <tbody>
              {evidence.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="table-title">
                      <span className="file-icon"><FileText size={16} /></span>
                      <div><strong>{item.title}</strong><small>{item.file_name}</small></div>
                    </div>
                  </td>
                  <td><span className="case-ref">{item.cases?.case_number ?? 'Unlinked evidence'}</span></td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>{formatDate(item.created_at)}</td>
                  <td><span className="hash-text"><Hash size={13} />{shortHash(item.current_hash)}</span></td>
                  <td><button className="row-action" onClick={() => setView('evidence')} aria-label="Open evidence vault"><ChevronRight size={16} /></button></td>
                </tr>
              ))}
              {!evidence.length && <tr><td colSpan="6">No evidence has been recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function buildActivity(cases, evidence) {
  const formatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' });
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return { key: date.toISOString().slice(0, 10), label: formatter.format(date), total: 0 };
  });
  const byDay = new Map(days.map((day) => [day.key, day]));
  [...cases.map((item) => item.updated_at), ...evidence.map((item) => item.created_at)].forEach((value) => {
    if (!value) return;
    const key = new Date(value).toISOString().slice(0, 10);
    const day = byDay.get(key);
    if (day) day.total += 1;
  });
  return days;
}
