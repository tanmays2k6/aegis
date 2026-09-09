import { useEffect, useState } from 'react';
import {
  Users, UserCheck, UserX, ShieldCheck, Check, X, Clock3, AlertCircle,
} from 'lucide-react';
import { PageHeading, StatusBadge, Modal } from '../components/Shared.jsx';
import { api } from '../lib/api.js';
import { formatDate, roleLabels, statusLabels } from '../lib/utils.js';

export default function AdminView({ profile }) {
  const [tab, setTab] = useState('requests'); // 'requests' | 'users'
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [reviewAction, setReviewAction] = useState(null); // 'approve' | 'reject'
  const [assignedRole, setAssignedRole] = useState('investigating_officer');
  const [reviewNotes, setReviewNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadData();
  }, [tab]);

  async function loadData() {
    setLoadError('');
    try {
      if (tab === 'requests') {
        const data = await api.admin.getAccessRequests();
        setRequests(data.requests ?? []);
      } else {
        const data = await api.admin.getUsers();
        setUsers(data.users ?? []);
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to load administrative data.');
    }
  }

  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (!selectedRequest) return;
    setBusy(true);
    try {
      if (reviewAction === 'approve') {
        await api.admin.approveAccessRequest(selectedRequest.id, { assignedRole, reviewNotes });
      } else {
        await api.admin.rejectAccessRequest(selectedRequest.id, { reviewNotes });
      }
      setSelectedRequest(null);
      setReviewAction(null);
      setReviewNotes('');
      await loadData();
    } catch (err) {
      alert(err.message || 'Review action failed.');
    }
    setBusy(false);
  }

  async function handleStatusChange(userId, nextStatus) {
    if (!confirm(`Are you sure you want to set this user status to "${statusLabels[nextStatus] || nextStatus}"?`)) return;
    try {
      await api.admin.updateUserStatus(userId, nextStatus);
      await loadData();
    } catch (err) {
      alert(err.message || 'Status update failed.');
    }
  }

  async function handleRoleChange(userId, nextRole) {
    if (!confirm(`Are you sure you want to change this user's role to "${roleLabels[nextRole] || nextRole}"?`)) return;
    try {
      await api.admin.updateUserRole(userId, nextRole);
      await loadData();
    } catch (err) {
      alert(err.message || 'Role change failed.');
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION / IDENTITY & ACCESS"
        title="Access command & user management"
        description="Verify departmental access requests, enforce account lifecycle, and manage operational roles."
      />

      <div className="toolbar">
        <div className="filter-tabs">
          <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>
            Access requests
            <span>{requests.filter((r) => r.status === 'pending').length}</span>
          </button>
          <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
            Registered users
            <span>{users.length}</span>
          </button>
        </div>
      </div>

      {loadError && <p className="empty-state">{loadError}</p>}

      {tab === 'requests' && (
        <div className="panel">
          <div className="panel-heading">
            <div><p className="eyebrow">PENDING ONBOARDING</p><h3>Department credential requests</h3></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Department &amp; Badge</th>
                  <th>Jurisdiction</th>
                  <th>Requested role</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.full_name}</strong>
                      <small style={{ display: 'block', color: 'var(--muted)' }}>{r.official_email}</small>
                    </td>
                    <td>{r.department} <span style={{ color: 'var(--muted)' }}>({r.badge_number || 'N/A'})</span></td>
                    <td>{r.jurisdiction}</td>
                    <td><span className="status-pill">{roleLabels[r.requested_role] || r.requested_role}</span></td>
                    <td>{formatDate(r.created_at)}</td>
                    <td>
                      <span className={`status-pill ${r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {r.status === 'pending' ? (
                        <button
                          className="secondary-button"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => {
                            setSelectedRequest(r);
                            setAssignedRole(r.requested_role);
                            setReviewAction('approve');
                          }}
                        >
                          Review
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!requests.length && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No access requests found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="panel">
          <div className="panel-heading">
            <div><p className="eyebrow">SYSTEM IDENTITIES</p><h3>Official personnel registry</h3></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Officer</th>
                  <th>Department</th>
                  <th>Jurisdiction</th>
                  <th>Assigned role</th>
                  <th>Account status</th>
                  <th>Manage role</th>
                  <th>Lifecycle</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.full_name || u.name || 'Officer'}</strong>
                      <small style={{ display: 'block', color: 'var(--muted)' }}>{u.email}</small>
                    </td>
                    <td>{u.department || 'N/A'}</td>
                    <td>{u.jurisdiction || 'N/A'}</td>
                    <td><strong>{roleLabels[u.role] || u.role}</strong></td>
                    <td>
                      <span className={`status-pill ${u.status === 'active' ? 'success' : u.status === 'suspended' ? 'danger' : 'warning'}`}>
                        {statusLabels[u.status] || u.status}
                      </span>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{ padding: '3px 6px', fontSize: '12px', borderRadius: '4px' }}
                      >
                        <option value="investigating_officer">Investigating Officer</option>
                        <option value="forensic_officer">Forensic Officer</option>
                        <option value="court_clerk">Court Clerk</option>
                        <option value="auditor">Auditor</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                    <td>
                      {u.status === 'active' ? (
                        <button
                          className="secondary-button"
                          style={{ padding: '3px 8px', fontSize: '12px', color: '#c53030' }}
                          onClick={() => handleStatusChange(u.id, 'suspended')}
                        >
                          Suspend
                        </button>
                      ) : u.status === 'suspended' ? (
                        <button
                          className="secondary-button"
                          style={{ padding: '3px 8px', fontSize: '12px', color: '#276749' }}
                          onClick={() => handleStatusChange(u.id, 'active')}
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          className="primary-button"
                          style={{ padding: '3px 8px', fontSize: '12px' }}
                          onClick={() => handleStatusChange(u.id, 'active')}
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No users registered yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedRequest && (
        <Modal
          title={`Review Request: ${selectedRequest.full_name}`}
          eyebrow="CREDENTIAL VETTING"
          onClose={() => { setSelectedRequest(null); setReviewAction(null); }}
        >
          <form onSubmit={handleReviewSubmit} className="modal-form">
            <div className="detail-grid" style={{ marginBottom: '16px' }}>
              <div><span>Email</span><strong>{selectedRequest.official_email}</strong></div>
              <div><span>Department</span><strong>{selectedRequest.department}</strong></div>
              <div><span>Badge Number</span><strong>{selectedRequest.badge_number || 'None'}</strong></div>
              <div><span>Jurisdiction</span><strong>{selectedRequest.jurisdiction}</strong></div>
            </div>

            <label>Stated reason for access
              <p style={{ background: 'var(--bg-panel)', padding: '8px', borderRadius: '4px', fontStyle: 'italic', fontSize: '13px' }}>
                "{selectedRequest.reason}"
              </p>
            </label>

            <div className="form-grid">
              <label>Review decision
                <select value={reviewAction} onChange={(e) => setReviewAction(e.target.value)}>
                  <option value="approve">Approve Access</option>
                  <option value="reject">Reject Request</option>
                </select>
              </label>
              {reviewAction === 'approve' && (
                <label>Assigned operational role
                  <select value={assignedRole} onChange={(e) => setAssignedRole(e.target.value)}>
                    <option value="investigating_officer">Investigating Officer</option>
                    <option value="forensic_officer">Forensic Officer</option>
                    <option value="court_clerk">Court Clerk</option>
                    <option value="auditor">Auditor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </label>
              )}
            </div>

            <label>Reviewer notes / justification
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Document approval justification or rejection reason for audit trail"
                rows={3}
              />
            </label>

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setSelectedRequest(null)}>Cancel</button>
              <button className="primary-button" disabled={busy}>
                {busy ? 'Processing\u2026' : reviewAction === 'approve' ? 'Approve & Activate' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
