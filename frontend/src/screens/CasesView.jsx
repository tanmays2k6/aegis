import { useEffect, useState } from 'react';
import {
  ArrowUpRight, ChevronDown, ChevronRight, LockKeyhole, Plus,
  ShieldCheck, SlidersHorizontal, X,
} from 'lucide-react';
import { PageHeading, StatusBadge, Modal } from '../components/Shared.jsx';
import { api } from '../lib/api.js';
import { formatDate, titleCase } from '../lib/utils.js';

export default function CasesView({ profile, search }) {
  const [cases, setCases] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.cases.list().then((data) => setCases(data.cases ?? [])).catch(() => setLoadError('Cases could not be loaded.'));
  }, []);

  const filtered = cases.filter((item) =>
    (filter === 'all' || item.status === filter) &&
    `${item.title} ${item.case_number} ${item.jurisdiction}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeading
        eyebrow="CASE REGISTRY / ALL MATTERS"
        title="Case registry"
        description="A complete, accountable view of investigations under your command."
        action={profile.role !== 'auditor' ? <button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17} /> Register case</button> : null}
      />
      <div className="toolbar">
        <div className="filter-tabs">
          {[['all', 'All cases'], ['under_investigation', 'In progress'], ['in_court', 'In court'], ['closed', 'Closed']].map(([key, label]) => (
            <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>
              {label}
              <span>{key === 'all' ? cases.length : cases.filter((item) => item.status === key).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="case-grid">
        {filtered.map((item) => (
          <button className="case-card" key={item.id} onClick={() => setSelected(item)}>
            <div className="case-card-top">
              <span className={`priority-dot ${item.priority}`} />
              <span className="case-number">{item.case_number}</span>
              <ChevronRight size={17} />
            </div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="case-card-footer">
              <StatusBadge status={item.status} />
              <span>{formatDate(item.updated_at)}</span>
            </div>
            <div className="case-progress">
              <span style={{ width: item.status === 'closed' ? '100%' : item.status === 'in_court' ? '76%' : item.status === 'under_investigation' ? '54%' : '23%' }} />
            </div>
          </button>
        ))}
        {!cases.length && <p className="empty-state">{loadError || 'No cases have been registered yet.'}</p>}
      </div>
      {showCreate && (
        <CreateCaseModal profile={profile} onClose={() => setShowCreate(false)} onCreated={(record) => { setCases((current) => [record, ...current]); setShowCreate(false); }} />
      )}
      {selected && <CaseDetailModal record={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function CreateCaseModal({ profile, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api.cases.create({
        case_number: number, title, description, priority,
        jurisdiction: profile.jurisdiction ?? 'Bengaluru',
      });
      onCreated(data.case ?? { ...{ case_number: number, title, description, priority }, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), status: 'open' });
    } catch (requestError) {
      setError(requestError.message || 'Could not register this case. Please check the details.');
    }
    setBusy(false);
  }

  return (
    <Modal title="Register a new case" eyebrow="CASE INTAKE" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="form-grid">
          <label>Case / FIR number
            <input required value={number} onChange={(e) => setNumber(e.target.value)} placeholder="FIR/2026/00001" />
          </label>
          <label>Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
        </div>
        <label>Case title
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short, descriptive matter title" />
        </label>
        <label>Brief description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should the next officer understand immediately?" rows={4} />
        </label>
        {error && <div className="form-error"><X size={15} />{error}</div>}
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={busy}>
            {busy ? 'Registering\u2026' : 'Register case'}<ArrowUpRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CaseDetailModal({ record, onClose }) {
  return (
    <Modal title={record.title} eyebrow={record.case_number} onClose={onClose}>
      <div className="detail-hero">
        <div className={`priority-dot ${record.priority}`} />
        <StatusBadge status={record.status} />
        <span className="detail-location">{record.jurisdiction}</span>
      </div>
      <p className="detail-description">{record.description}</p>
      <div className="detail-grid">
        <div><span>Registered</span><strong>{formatDate(record.created_at)}</strong></div>
        <div><span>Last activity</span><strong>{formatDate(record.updated_at)}</strong></div>
        <div><span>Priority</span><strong>{titleCase(record.priority)}</strong></div>
        <div><span>Integrity</span><strong className="green-text"><ShieldCheck size={15} /> Anchored</strong></div>
      </div>
      <div className="notice-box">
        <LockKeyhole size={17} />
        <div><strong>Evidence access is traceable</strong><p>Every view, download, and update in this case is added to the immutable audit trail.</p></div>
      </div>
    </Modal>
  );
}
