import { useEffect, useRef, useState } from 'react';
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
        action={profile.role !== 'auditor' ? <button className="primary-button" onClick={() => setShowUpload(true)}><UploadCloud size={17} /> Add evidence</button> : null}
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
              <p>{item.file_name} <span>•</span> {formatSize(item.file_size)} <span>•</span> {item.cases?.case_number ?? 'Unassigned'}</p>
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
      {selected && <EvidenceDetailModal item={selected} profile={profile} onClose={() => setSelected(null)} />}
    </>
  );
}

function EvidenceDetailModal({ item, profile, onClose }) {
  const [full, setFull] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.evidence.get(item.id)
      .then((data) => { if (!cancelled) setFull(data.evidence ?? null); })
      .catch(() => { if (!cancelled) setLoadError('Could not load the file for preview.'); });
    return () => { cancelled = true; };
  }, [item.id]);

  return (
    <Modal title={item.title} eyebrow="EVIDENCE RECORD" onClose={onClose}>
      <div className="detail-hero"><StatusBadge status={item.status} /><span className="detail-location">{item.cases?.case_number ?? 'Unassigned case'}</span></div>
      <WatermarkedPreview file={full} profile={profile} loadError={loadError} />
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

// Renders the file with the viewer's identity burned into the DISPLAY only.
// The original file_content bytes are never touched, so current_hash stays
// valid forever — only what's drawn on screen carries the watermark.
function WatermarkedPreview({ file, profile, loadError }) {
  const canvasRef = useRef(null);
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => {
    if (!file?.file_content || file.file_type !== 'application/pdf') {
      setPdfUrl('');
      return undefined;
    }
    const bytes = Uint8Array.from(atob(file.file_content), (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file?.file_content || !file.file_type?.startsWith('image/')) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bytes = Uint8Array.from(atob(file.file_content), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: file.file_type });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      // Render at a higher internal resolution than the CSS display width so
      // the image stays sharp — CSS max-width scales it down responsively,
      // but we don't want to have downsampled the source before that.
      const maxWidth = 1000;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Sparse, light, single-pass watermark: identifies the viewer without
      // obscuring the evidence itself. Evidence needs to stay inspectable.
      const label = `${profile?.full_name || 'Unknown viewer'}  •  ID ${profile?.id?.slice(0, 8) || '—'}  •  ${new Date().toLocaleString()}`;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 10);
      ctx.font = '500 15px sans-serif';
      ctx.textAlign = 'center';
      const stepX = Math.max(canvas.width * 0.9, 500);
      const stepY = Math.max(canvas.height * 0.35, 220);
      for (let y = -canvas.height; y < canvas.height * 1.5; y += stepY) {
        for (let x = -canvas.width; x < canvas.width * 1.5; x += stepX) {
          ctx.fillStyle = 'rgba(255,255,255,0.21)';
          ctx.fillText(label, x + 1, y + 1);
          ctx.fillStyle = 'rgba(0,0,0,0.21)';
          ctx.fillText(label, x, y);
        }
      }
      ctx.restore();

      // A clear footer signature makes the viewer identity visible even when
      // a screenshot crops away the repeated watermark across the image.
      const stamp = `Viewed by ${profile?.full_name || 'Unknown'} • ID ${profile?.id?.slice(0, 8) || '—'} • ${new Date().toLocaleString()}`;
      ctx.font = '600 13px sans-serif';
      const padding = 8;
      const textWidth = ctx.measureText(stamp).width;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, canvas.height - 28, textWidth + padding * 2, 28);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(stamp, padding, canvas.height - 10);

      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [file, profile]);

  if (loadError) return <div className="form-error"><X size={15} />{loadError}</div>;
  if (!file) return <div className="empty-state">Loading preview…</div>;
  if (file.file_type === 'application/pdf') {
    const viewerStamp = `Viewed by ${profile?.full_name || 'Unknown viewer'} • ID ${profile?.id?.slice(0, 8) || '—'} • ${new Date().toLocaleString()}`;
    return (
      <div className="pdf-preview">
        <div className="pdf-preview-label"><FileText size={16} /> Secure document preview</div>
        <div className="pdf-viewer-frame">
          {pdfUrl && <iframe src={pdfUrl} title={`Preview of ${file.file_name}`} />}
          <div className="pdf-watermark" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => <span key={index}>{viewerStamp}</span>)}
          </div>
          <div className="pdf-viewer-signature" aria-hidden="true">{viewerStamp}</div>
        </div>
      </div>
    );
  }
  if (!file.file_type?.startsWith('image/')) {
    return (
      <div className="notice-box">
        <FileText size={17} />
        <div>
          <strong>Preview not available for this file type</strong>
          <p>Viewed by {profile?.full_name || 'Unknown'} (ID {profile?.id?.slice(0, 8) || '—'}) at {new Date().toLocaleString()} — this view has been logged.</p>
        </div>
      </div>
    );
  }
  return <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: 8, display: 'block', margin: '0 0 16px' }} />;
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
            <><FileCheck2 size={25} /><strong>{file.name}</strong><span>{formatSize(file.size)} · ready to fingerprint</span></>
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
            {busy ? 'Anchoring…' : 'Anchor evidence'}<ShieldCheck size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
