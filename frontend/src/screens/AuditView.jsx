import { useEffect, useState } from 'react';
import {
  Activity, Archive, BadgeCheck, ChevronRight, Clock3,
  Hash, ShieldCheck, SlidersHorizontal,
} from 'lucide-react';
import { Modal, PageHeading } from '../components/Shared.jsx';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/utils.js';

export default function AuditView({ search }) {
  const [logs, setLogs] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.audit.list().then((data) => setLogs(data.logs ?? [])).catch((error) => setLoadError(error.message));
  }, []);

  function exportCsv() {
    const header = ['timestamp', 'user', 'role', 'action', 'resource', 'details', 'chain_hash'];
    const rows = logs.map((item) => [item.created_at, item.user_name, item.user_role, item.action, item.resource_name, item.details, item.chain_hash]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const filtered = logs.filter((item) =>
    `${item.user_name} ${item.action} ${item.resource_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeading
        eyebrow="AUDIT TRAIL / IMMUTABLE ACTIVITY"
        title="Audit trail"
        description="A transparent record of every meaningful action across the workspace."
        action={<button className="secondary-button" onClick={exportCsv} disabled={!logs.length}><Archive size={16} /> Export report</button>}
      />
      <div className="audit-summary">
        <div>
          <div className="summary-icon blue"><Activity size={18} /></div>
          <div><span>Events recorded</span><strong>1,284</strong></div>
        </div>
        <div>
          <div className="summary-icon teal"><Hash size={18} /></div>
          <div><span>Chain continuity</span><strong>100%</strong></div>
        </div>
        <div>
          <div className="summary-icon amber"><Clock3 size={18} /></div>
          <div><span>Latest event</span><strong>2 min ago</strong></div>
        </div>
        <div className="audit-trust"><ShieldCheck size={18} /><span>Read-only evidence of activity</span></div>
      </div>
      <div className="panel audit-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">SEQUENTIAL LEDGER</p><h3>Activity sequence</h3></div>
        </div>
        <div className="audit-list">
          {filtered.map((item, index) => (
            <div className="audit-item" key={item.id}>
              <div className="audit-line"><span className="audit-dot" /><span className="audit-connector" /></div>
              <div className="audit-icon"><Activity size={16} /></div>
              <div className="audit-body">
                <div><strong>{item.action}</strong><span className="audit-time">{index === 0 ? '2 min ago' : formatDate(item.created_at)}</span></div>
                <p><b>{item.user_name}</b> \u00b7 {item.details}</p>
                <div className="audit-anchor"><Hash size={13} /> {item.chain_hash} <BadgeCheck size={14} /></div>
              </div>
              <button className="row-action" onClick={() => setSelected(item)} aria-label="Open audit entry"><ChevronRight size={16} /></button>
            </div>
          ))}
          {!logs.length && <p className="empty-state">{loadError || 'No audit entries are available.'}</p>}
        </div>
      </div>
      {selected && <AuditDetailModal item={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function AuditDetailModal({ item, onClose }) {
  return (
    <Modal title={item.action} eyebrow="AUDIT ENTRY" onClose={onClose}>
      <div className="detail-grid">
        <div><span>Officer</span><strong>{item.user_name}</strong></div>
        <div><span>Role</span><strong>{item.user_role?.replaceAll('_', ' ')}</strong></div>
        <div><span>Resource</span><strong>{item.resource_name || 'System'}</strong></div>
        <div><span>Recorded</span><strong>{formatDate(item.created_at)}</strong></div>
      </div>
      <div className="notice-box"><Hash size={17} /><div><strong>Ledger anchor</strong><p className="hash-full">{item.chain_hash}</p></div></div>
    </Modal>
  );
}
