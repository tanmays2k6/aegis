import { ChevronRight, X } from 'lucide-react';
import { titleCase } from '../lib/utils.js';

export function StatusBadge({ status }) {
  const normalized = String(status || '').toUpperCase();
  const tone = ['APPROVED', 'LOCKED', 'CLOSED', 'CLEAN', 'RELEASED'].includes(normalized)
    ? 'success'
    : ['SUBMITTED', 'IN_COURT', 'PENDING', 'SCANNING'].includes(normalized)
    ? 'info'
    : ['CRITICAL', 'HIGH', 'INFECTED', 'QUARANTINED', 'SCAN_FAILED'].includes(normalized)
    ? 'danger'
    : 'warning';
  return (
    <span className={`status-pill ${tone}`}>
      <span />
      {titleCase(String(status || '').replaceAll('_', ' '))}
    </span>
  );
}

export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, detail, icon: Icon, tone, onClick }) {
  const cardContents = (
    <>
      <div className={`stat-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <div className="stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <ChevronRight size={16} className="stat-arrow" />
    </>
  );

  return onClick
    ? <button type="button" className="stat-card stat-card-action" onClick={onClick} aria-label={`Open ${label}`}>{cardContents}</button>
    : <div className="stat-card">{cardContents}</div>;
}

export function Modal({ eyebrow, title, onClose, children }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
