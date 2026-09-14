import { useEffect, useState } from 'react';
import { Activity, Building2, Check, ShieldCheck, UserCog, Users, X } from 'lucide-react';
import { PageHeading, Modal, StatCard } from '../components/Shared.jsx';
import { api } from '../lib/api.js';
import { formatDate, roleLabels, statusLabels } from '../lib/utils.js';

export default function AdminView() {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve');
  const [assignedRole, setAssignedRole] = useState('investigating_officer');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadData(); }, [tab]);

  async function loadData() {
    setLoadError('');
    try {
      if (tab === 'requests') {
        const data = await api.admin.getAccessRequests();
        setRequests(data.requests ?? []);
      } else {
        const data = await api.admin.getOverview();
        setOverview(data);
      }
    } catch (error) { setLoadError(error.message || 'Administrative data could not be loaded.'); }
  }

  async function changeRole(user, role) {
    if (user.role === role || !confirm(`Change ${user.full_name || user.email} to ${roleLabels[role] || role}?`)) return;
    try { await api.admin.updateUserRole(user.id, role); await loadData(); }
    catch (error) { setLoadError(error.message || 'Role update failed.'); }
  }

  async function changeStatus(user, status) {
    if (!confirm(`Set ${user.full_name || user.email} to ${statusLabels[status] || status}?`)) return;
    try { await api.admin.updateUserStatus(user.id, status); await loadData(); }
    catch (error) { setLoadError(error.message || 'Status update failed.'); }
  }

  async function submitReview(event) {
    event.preventDefault();
    if (!selectedRequest) return;
    setBusy(true); setReviewError('');
    try {
      if (reviewAction === 'approve') await api.admin.approveAccessRequest(selectedRequest.id, { assignedRole, reviewNotes });
      else await api.admin.rejectAccessRequest(selectedRequest.id, { reviewNotes });
      setSelectedRequest(null); setReviewNotes(''); await loadData();
    } catch (error) { setReviewError(error.message || 'Could not complete this review.'); }
    setBusy(false);
  }

  const users = overview?.users ?? [];
  const summary = overview?.summary;
  return <>
    <PageHeading eyebrow="PRIVILEGED WORKSPACE / ADMINISTRATION" title="Admin control center" description="Separate oversight for personnel, departments, access approvals, and recorded activity." />
    <div className="toolbar"><div className="filter-tabs">
      {[['overview', 'Overview'], ['departments', 'Departments'], ['users', 'Personnel'], ['requests', 'Access requests']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}{id === 'requests' && <span>{requests.filter((item) => item.status === 'pending').length}</span>}</button>)}
    </div></div>
    {loadError && <p className="empty-state">{loadError}</p>}
    {(tab !== 'requests' && !overview && !loadError) && <p className="empty-state">Loading administration data…</p>}
    {tab === 'overview' && summary && <>
      <div className="stat-grid">
        <StatCard label="Registered personnel" value={String(summary.total_users)} detail="All user profiles" icon={Users} tone="blue" />
        <StatCard label="Active accounts" value={String(summary.active_users)} detail="Currently enabled" icon={UserCog} tone="teal" />
        <StatCard label="Administrators" value={String(summary.administrators)} detail="Privileged operators" icon={ShieldCheck} tone="amber" />
        <StatCard label="Departments" value={String(summary.departments)} detail="Organizational groups" icon={Building2} tone="green" />
      </div>
      <div className="dashboard-grid">
        <section className="panel"><div className="panel-heading"><div><p className="eyebrow">DEPARTMENT DIRECTORY</p><h3>Access by department</h3></div></div><DepartmentCards departments={overview.departments} /></section>
        <section className="panel"><div className="panel-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h3>Latest recorded events</h3></div></div><ActivityList events={overview.recent_activity} /></section>
      </div>
    </>}
    {tab === 'departments' && overview && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">ORGANIZATIONAL OVERSIGHT</p><h3>Departments and activity</h3></div></div><DepartmentCards departments={overview.departments} expanded /></section>}
    {tab === 'users' && overview && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">PERSONNEL DIRECTORY</p><h3>Users, roles, and account activity</h3></div></div><PersonnelTable users={users} onRole={changeRole} onStatus={changeStatus} /></section>}
    {tab === 'requests' && <AccessRequests requests={requests} onReview={(request) => { setSelectedRequest(request); setReviewAction('approve'); setAssignedRole(request.requested_role); setReviewError(''); }} />}
    {selectedRequest && <Modal title={`Review request: ${selectedRequest.full_name}`} eyebrow="CREDENTIAL VETTING" onClose={() => setSelectedRequest(null)}><form onSubmit={submitReview} className="modal-form">
      <div className="detail-grid"><div><span>Email</span><strong>{selectedRequest.official_email}</strong></div><div><span>Department</span><strong>{selectedRequest.department}</strong></div><div><span>Badge</span><strong>{selectedRequest.badge_number || 'Not supplied'}</strong></div><div><span>Jurisdiction</span><strong>{selectedRequest.jurisdiction}</strong></div></div>
      <label>Stated reason<p className="admin-request-reason">{selectedRequest.reason}</p></label>
      <div className="form-grid"><label>Decision<select value={reviewAction} onChange={(event) => setReviewAction(event.target.value)}><option value="approve">Approve access</option><option value="reject">Reject request</option></select></label>{reviewAction === 'approve' && <label>Operational role<select value={assignedRole} onChange={(event) => setAssignedRole(event.target.value)}>{roleOptions()}</select></label>}</div>
      <label>Reviewer notes<textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} rows={3} placeholder="Document the decision for the audit trail" /></label>
      {reviewError && <div className="form-error"><X size={15} />{reviewError}</div>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setSelectedRequest(null)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? 'Processing…' : reviewAction === 'approve' ? 'Approve and activate' : 'Reject request'}<Check size={16} /></button></div>
    </form></Modal>}
  </>;
}

function DepartmentCards({ departments, expanded = false }) {
  if (!departments?.length) return <p className="empty-state">No departments are available yet.</p>;
  return <div className="department-grid">{departments.map((department) => <article className="department-card" key={department.name}><div className="department-card-icon"><Building2 size={18} /></div><div><strong>{department.name}</strong><span>{department.user_count} personnel · {department.active_count} active</span>{expanded && <small>{department.admin_count} administrator{department.admin_count === 1 ? '' : 's'} · last activity {formatActivityTime(department.latest_activity_at)}</small>}</div></article>)}</div>;
}

function ActivityList({ events }) {
  if (!events?.length) return <p className="empty-state">No activity has been recorded since the reset.</p>;
  return <div className="admin-activity-list">{events.map((event) => <div key={event.id}><span className="admin-event-icon"><Activity size={14} /></span><p><strong>{event.action}</strong><small>{event.user_name || 'System'} · {formatActivityTime(event.created_at)}</small></p></div>)}</div>;
}

function PersonnelTable({ users, onRole, onStatus }) {
  return <div className="table-wrap"><table><thead><tr><th>Officer</th><th>Department</th><th>Role</th><th>Last login</th><th>Latest activity</th><th>Status</th><th>Manage</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.full_name || user.name || 'Unnamed user'}</strong><small>{user.email}</small></td><td>{user.department || 'Unassigned'}</td><td><select value={user.role} onChange={(event) => onRole(user, event.target.value)}>{roleOptions()}</select></td><td>{formatActivityTime(user.last_login_at)}</td><td><span title={user.last_activity?.details || ''}>{user.last_activity?.action || formatActivityTime(user.last_activity_at)}</span></td><td><span className={`status-pill ${user.status === 'active' ? 'success' : user.status === 'suspended' ? 'danger' : 'warning'}`}>{statusLabels[user.status] || user.status}</span></td><td>{user.status === 'active' ? <button className="secondary-button compact" onClick={() => onStatus(user, 'suspended')}>Suspend</button> : <button className="primary-button compact" onClick={() => onStatus(user, 'active')}>Activate</button>}</td></tr>)}{!users.length && <tr><td colSpan="7">No users found.</td></tr>}</tbody></table></div>;
}

function AccessRequests({ requests, onReview }) {
  return <section className="panel"><div className="panel-heading"><div><p className="eyebrow">PENDING ONBOARDING</p><h3>Department credential requests</h3></div></div><div className="table-wrap"><table><thead><tr><th>Applicant</th><th>Department</th><th>Requested role</th><th>Submitted</th><th>Status</th><th /></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td><strong>{request.full_name}</strong><small>{request.official_email}</small></td><td>{request.department}</td><td>{roleLabels[request.requested_role] || request.requested_role}</td><td>{formatDate(request.created_at)}</td><td><span className={`status-pill ${request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'danger' : 'warning'}`}>{request.status}</span></td><td>{request.status === 'pending' && <button className="secondary-button compact" onClick={() => onReview(request)}>Review</button>}</td></tr>)}{!requests.length && <tr><td colSpan="6">No access requests found.</td></tr>}</tbody></table></div></section>;
}

function roleOptions() { return <><option value="investigating_officer">Investigating Officer</option><option value="forensic_officer">Forensic Officer</option><option value="court_clerk">Court Clerk</option><option value="auditor">Compliance Auditor</option><option value="admin">Administrator</option></>; }
function formatActivityTime(value) { return value ? formatDate(value) : 'No recorded activity'; }
