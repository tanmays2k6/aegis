import { useEffect, useState } from 'react';
import {
  BadgeCheck, Bell, ChevronRight, Fingerprint, LayoutDashboard,
  FolderClosed, FileKey2, Activity, ShieldCheck, LogOut, Menu, Search, X,
} from 'lucide-react';
import { roleLabels } from '../lib/utils.js';
import Dashboard from './Dashboard.jsx';
import CasesView from './CasesView.jsx';
import EvidenceView from './EvidenceView.jsx';
import AuditView from './AuditView.jsx';
import ComplianceView from './ComplianceView.jsx';
import { api } from '../lib/api.js';

const navItems = [
  { id: 'dashboard', label: 'Command center', icon: LayoutDashboard },
  { id: 'cases', label: 'Case registry', icon: FolderClosed },
  { id: 'evidence', label: 'Evidence vault', icon: FileKey2 },
  { id: 'audit', label: 'Audit trail', icon: Activity },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
];

export default function Workspace({ profile, email, onSignOut }) {
  const [view, setView] = useState('dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState({ cases: [], evidence: [], logs: [] });
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const displayProfile = profile ?? {
    id: '', full_name: email.split('@')[0], role: 'investigating_officer',
    badge_number: null, jurisdiction: 'Bengaluru', department: 'Bengaluru City Police',
  };
  const canReview = ['admin', 'auditor'].includes(displayProfile.role);
  const visibleNavItems = navItems.filter((item) => canReview || !['audit', 'compliance'].includes(item.id));
  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) { setSearchResults({ cases: [], evidence: [], logs: [] }); return undefined; }
    const timer = setTimeout(() => {
      const requests = [api.cases.list({ search: query }), api.evidence.list({ search: query })];
      if (canReview) requests.push(api.audit.list({ search: query }));
      Promise.all(requests).then(([caseData, evidenceData, auditData]) => {
        setSearchResults({ cases: caseData.cases ?? [], evidence: evidenceData.evidence ?? [], logs: auditData?.logs ?? [] });
      }).catch(() => setSearchResults({ cases: [], evidence: [], logs: [] }));
    }, 220);
    return () => clearTimeout(timer);
  }, [search, canReview]);
  const resultCount = searchResults.cases.length + searchResults.evidence.length + searchResults.logs.length;
  const openResult = (nextView) => { setView(nextView); setSearch(''); };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand-lockup">
            <span className="brand-mark"><Fingerprint size={20} /></span>
            <span>CHAIN<span>OF</span>CUSTODY</span>
          </div>
          <button className="sidebar-close" onClick={() => setMobileNav(false)}><X size={18} /></button>
        </div>
        <div className="workspace-label"><span className="live-dot" />LIVE COMMAND SYSTEM</div>
        <nav>
          {visibleNavItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => { setView(id); setMobileNav(false); }}>
              <Icon size={18} /><span>{label}</span>
              {id === 'audit' && <span className="nav-count">12</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="security-card">
            <div className="security-icon"><ShieldCheck size={17} /></div>
            <div><strong>System integrity</strong><span>All chains verified</span></div>
            <BadgeCheck size={16} className="verified" />
          </div>
          <div className="profile-mini">
            <div className="avatar">{displayProfile.full_name.slice(0, 2).toUpperCase()}</div>
            <div className="profile-meta">
              <strong>{displayProfile.full_name}</strong>
              <span>{roleLabels[displayProfile.role]}</span>
            </div>
            <button onClick={onSignOut} title="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={21} /></button>
          <div className="breadcrumb">
            <span>SECURE WORKSPACE</span>
            <ChevronRight size={14} />
            <strong>{navItems.find((item) => item.id === view)?.label.toUpperCase()}</strong>
          </div>
          <div className="topbar-actions">
            <div className="global-search-wrap">
              <div className="global-search">
                <Search size={16} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cases, evidence, hashes\u2026" aria-label="Global search" />
              </div>
              {search.trim().length >= 2 && <div className="search-results">
                <div className="search-results-title">{resultCount ? `${resultCount} matching records` : 'No matching records'}</div>
                {searchResults.cases.slice(0, 3).map((item) => <button key={`case-${item.id}`} onClick={() => openResult('cases')}><small>CASE</small><span>{item.case_number} · {item.title}</span></button>)}
                {searchResults.evidence.slice(0, 3).map((item) => <button key={`evidence-${item.id}`} onClick={() => openResult('evidence')}><small>EVIDENCE</small><span>{item.title}</span></button>)}
                {searchResults.logs.slice(0, 3).map((item) => <button key={`audit-${item.id}`} onClick={() => openResult('audit')}><small>AUDIT</small><span>{item.action} · {item.resource_name}</span></button>)}
              </div>}
            </div>
            <div className="notification-wrap">
              <button className="icon-button notification" onClick={() => setNotificationsOpen((open) => !open)} aria-label="Notifications"><Bell size={18} /><i /></button>
              {notificationsOpen && <div className="notification-popover"><strong>Notifications</strong><p>No new operational alerts.</p></div>}
            </div>
            <div className="topbar-avatar">{displayProfile.full_name.slice(0, 2).toUpperCase()}</div>
          </div>
        </header>
        <div className="page-wrap">
          {view === 'dashboard' && <Dashboard profile={displayProfile} setView={setView} />}
          {view === 'cases' && <CasesView profile={displayProfile} search={search} />}
          {view === 'evidence' && <EvidenceView profile={displayProfile} search={search} />}
          {view === 'audit' && <AuditView search={search} />}
          {view === 'compliance' && <ComplianceView />}
        </div>
      </main>
    </div>
  );
}
