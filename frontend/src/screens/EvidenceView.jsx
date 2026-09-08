import { useEffect, useState } from 'react';
import {
  BadgeCheck, ChevronRight, FileCheck2, FileSearch, FileText,
  Hash, LockKeyhole, ShieldCheck, UploadCloud, X,
} from 'lucide-react';
import { PageHeading, StatusBadge, Modal } from '../components/Shared.jsx';
import { api } from '../lib/api.js';
import { formatDate, formatSize, shortHash, sha256 } from '../lib/utils.js';

export default function EvidenceView({ profile, search }) {
  const [items, setItems] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.evidence.list().then((data) => setItems(data.evidence ?? [])).catch(() => setLoadError('Evidence could not be loaded.'));
  }, []);

  const filtered = items.filter((item) =>
    (statusFilter === 'all' || item.status === statusFilter) &&
    `${item.title} ${item.file_name} ${item.current_hash} ${item.cases?.case_number}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeading
        eyebrow="EVIDENCE VAULT / CHAINED RECORDS"
        title="Evidence vault"
        description="Every file has a fingerprint. Every change has a witness."
        action={<button className="primary-button" onClick={() => setShowUpload(true)}><UploadCloud size={17} /> Add evidence</button>}
      />
      <div className="vault-banner">
        <div className="vault-banner-icon"><LockKeyhole size={20} /></div>
        <div><strong>Vault is operating normally</strong><p>SHA-256 fingerprints are calculated at intake and anchored to the chain automatically.</p></div>
        <span className="status-pill success"><span /> Protected</span>
      </div>
      <div className="toolbar">
        <div className="filter-tabs">
          {[['all', 'All items'], ['submitted', 'Needs review'], ['approved', 'Approved'], ['locked', 'Locked']].map(([key, label]) => (
            <button key={key} className={statusFilter === key ? 'active' : ''} onClick={() => setStatusFilter(key)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="evidence-list">
        {filtered.map((item) => (
          <div className="evidence-row" key={item.id}>
            <div className="evidence-file-icon"><FileText size={20} /></div>
            <div className="evidence-main">
              <div className="evidence-title"><h3>{item.title}</h3><StatusBadge status={item.status} /></div>
              <p>{item.file_name} <span>\u2022</span> {formatSize(item.file_size)} <span>\u2022</span> {item.cases?.case_number ?? 'Unassigned'}</p>
              <div className="evidence-hash"><Hash size={14} /><span>{shortHash(item.current_hash)}</span><small>v{item.version_number}</small></div>
            </div>
            <div className="evidence-meta"><span>Added</span><strong>{formatDate(item.created_at)}</strong></div>
            <button className="row-action" onClick={() => setSelected(item)} aria-label={`Open ${item.title}`}><ChevronRight size={17} /></button>
          </div>
        ))}
        {!items.length && !loadError && <p className="empty-state">No evidence has been uploaded yet.</p>}
        {loadError && <p className="empty-state">{loadError}</p>}
      </div>
      {showUpload && (
        <UploadModal profile={profile} onClose={() => setShowUpload(false)} onCreated={(record) => { setItems((current) => [record, ...current]); setShowUpload(false); }} />
      )}
      {selected && <EvidenceDetailModal item={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function EvidenceDetailModal({ item, onClose }) {
  return (
    <Modal title={item.title} eyebrow="EVIDENCE RECORD" onClose={onClose}>
      <div className="detail-hero"><StatusBadge status={item.status} /><span className="detail-location">{item.cases?.case_number ?? 'Unassigned case'}</span></div>
      <div className="detail-grid">
        <div><span>File</span><strong>{item.file_name}</strong></div>
        <div><span>Type</span><strong>{item.document_type.replaceAll('_', ' ')}</strong></div>
        <div><span>Size</span><strong>{formatSize(item.file_size)}</strong></div>
        <div><span>Added</span><strong>{formatDate(item.created_at)}</strong></div>
      </div>
      <div className="notice-box"><Hash size={17} /><div><strong>SHA-256 fingerprint</strong><p className="hash-full">{item.current_hash}</p></div></div>
    </Modal>
  );
}

function UploadModal({ profile, onClose, onCreated }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [caseNumber, setCaseNumber] = useState('FIR/2026/');
  const [docType, setDocType] = useState('other');
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState('');
  const [error, setError] = useState('');

  async function chooseFile(next) {
    if (next && next.size > 10 * 1024 * 1024) {
      setFile(null);
      setHash('');
      setError('Choose a file no larger than 10 MB.');
      return;
    }
    setFile(next);
    setError('');
    if (next) setHash(await sha256(await next.arrayBuffer()));
  }

  async function submit(event) {
    event.preventDefault();
    if (!file) { setError('Choose a file before anchoring it.'); return; }
    setBusy(true);
    setError('');
    try {
      const content = await file.arrayBuffer();
      const bytes = new Uint8Array(content);
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      }
      const fileContent = btoa(binary);
      const data = await api.evidence.create({
        title, caseNumber, documentType: docType,
        fileName: file.name, fileType: file.type || 'application/octet-stream',
        fileSize: file.size, fileContent, currentHash: hash,
      });
      onCreated(data.evidence ?? { ...{ title, file_name: file.name, file_size: file.size, current_hash: hash, status: 'submitted', version_number: 1 }, id: crypto.randomUUID(), created_at: new Date().toISOString(), cases: { case_number: caseNumber, title: 'New case' } });
    } catch (requestError) {
      setError(requestError.message || 'The file could not be anchored. Please try again.');
    }
    setBusy(false);
  }

  return (
    <Modal title="Anchor new evidence" eyebrow="SECURE INTAKE" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <label>Evidence title
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What does this file prove?" />
        </label>
        <div className="form-grid">
          <label>Case number
            <input required value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} />
          </label>
          <label>Document type
            <select value={docType} onChange={(e) => setDocType(e.target.value)}>
              <option value="fir">FIR</option>
              <option value="forensic_report">Forensic report</option>
              <option value="witness_statement">Witness statement</option>
              <option value="medical_report">Medical report</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
        <label className="upload-zone">
          {file ? (
            <><FileCheck2 size={25} /><strong>{file.name}</strong><span>{formatSize(file.size)} \u00b7 ready to fingerprint</span></>
          ) : (
            <><UploadCloud size={25} /><strong>Drop a file here or browse</strong><span>PDF, image, document or archive up to 10 MB</span></>
          )}
          <input type="file" onChange={(e) => chooseFile(e.target.files?.[0] ?? null)} />
        </label>
        {hash && (
          <div className="hash-preview">
            <Hash size={17} />
            <div><span>SHA-256 fingerprint</span><strong>{hash}</strong></div>
            <BadgeCheck size={17} />
          </div>
        )}
        {error && <div className="form-error"><X size={15} />{error}</div>}
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={busy}>
            {busy ? 'Anchoring\u2026' : 'Anchor evidence'}<ShieldCheck size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
