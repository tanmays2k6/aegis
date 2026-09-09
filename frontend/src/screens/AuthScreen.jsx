import { useState } from 'react';
import {
  ArrowUpRight, Check, Fingerprint, LockKeyhole, ShieldAlert, X,
} from 'lucide-react';
import { api, setAuthToken } from '../lib/api.js';

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login'); // 'login' | 'request'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Access request form state
  const [fullName, setFullName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [department, setDepartment] = useState('Bengaluru City Police');
  const [designation, setDesignation] = useState('Sub-Inspector');
  const [jurisdiction, setJurisdiction] = useState('Bengaluru');
  const [requestedRole, setRequestedRole] = useState('investigating_officer');
  const [reason, setReason] = useState('');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'login') {
        const data = await api.auth.signIn({ email, password });
        if (data.session) {
          setAuthToken(data.session.access_token);
          onAuthed(data);
        }
      } else {
        // Submit vetted Access Request
        await api.auth.requestAccess({
          fullName,
          officialEmail: email,
          badgeNumber,
          department,
          designation,
          jurisdiction,
          requestedRole,
          reason,
        });
        setMessage('Access request submitted. An administrator will review your credentials before account activation.');
        setMode('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The server returned an error.');
    }
    setBusy(false);
  }

  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <div className="auth-grid" />
        <div className="auth-copy">
          <div className="brand-lockup">
            <span className="brand-mark"><Fingerprint size={22} /></span>
            <span>AEGIS<span> \u2022 </span>CHAIN OF CUSTODY</span>
          </div>
          <p className="eyebrow">GOVERNMENT DIGITAL EVIDENCE COMMAND</p>
          <h1>Trust every<br /><em>single record.</em></h1>
          <p className="auth-lede">A cryptographically anchored evidence management system built for law enforcement, forensic officers, and judicial review.</p>
          <div className="auth-proof">
            <div><strong>SHA-256</strong><span>Ledger integrity</span></div>
            <div><strong>Zero-Trust</strong><span>Vetted access</span></div>
            <div><strong>Strict RBAC</strong><span>Enforced separation</span></div>
          </div>
        </div>
        <div className="auth-footer">NCRB / WOMEN SAFETY DIVISION <span>\u2022</span> SECURE INVESTIGATION SYSTEM</div>
      </div>
      <div className="auth-panel">
        <div className="auth-panel-inner">
          <div className="mobile-brand">
            <span className="brand-mark"><Fingerprint size={20} /></span>
            AEGIS <span>\u2022</span> CHAIN OF CUSTODY
          </div>
          <div className="auth-heading">
            <p className="eyebrow">{mode === 'login' ? 'OFFICIAL ACCESS' : 'CREDENTIAL ONBOARDING'}</p>
            <h2>{mode === 'login' ? 'Sign in to your workspace' : 'Request official access'}</h2>
            <p>{mode === 'login' ? 'Enter verified credentials to access authorized investigations.' : 'Submit your department credentials for administrative verification.'}</p>
          </div>
          <form onSubmit={submit} className="auth-form">
            {mode === 'request' && (
              <>
                <label>Full name
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Inspector Rajesh Kumar" />
                </label>
                <div className="form-grid">
                  <label>Badge / Employee ID
                    <input required value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} placeholder="BCP-7489" />
                  </label>
                  <label>Designation
                    <input required value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Sub-Inspector" />
                  </label>
                </div>
                <div className="form-grid">
                  <label>Department
                    <input required value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Cyber Crime Unit" />
                  </label>
                  <label>Jurisdiction
                    <input required value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="Bengaluru" />
                  </label>
                </div>
                <label>Requested role
                  <select value={requestedRole} onChange={(e) => setRequestedRole(e.target.value)}>
                    <option value="investigating_officer">Investigating Officer</option>
                    <option value="forensic_officer">Forensic Officer</option>
                    <option value="court_clerk">Court Clerk</option>
                    <option value="auditor">Compliance Auditor</option>
                  </select>
                </label>
                <label>Reason for access
                  <textarea required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="State investigation mandate, FIR reference, or audit assignment" rows={3} />
                </label>
              </>
            )}

            <label>Official email address
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="officer@police.gov.in" />
            </label>
            {mode === 'login' && (
              <label>Password
                <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
              </label>
            )}

            {error && <div className="form-error"><X size={15} />{error}</div>}
            {message && <div className="form-success"><Check size={15} />{message}</div>}

            <button className="primary-button full" disabled={busy}>
              {busy ? 'Verifying\u2026' : mode === 'login' ? 'Sign in to command center' : 'Submit access request'}
              <ArrowUpRight size={17} />
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? 'New officer or auditor?' : 'Already have approved credentials?'}{' '}
            <button onClick={() => { setMode(mode === 'login' ? 'request' : 'login'); setError(''); setMessage(''); }}>
              {mode === 'login' ? 'Request official access' : 'Sign in'}
            </button>
          </div>
          <div className="auth-note"><LockKeyhole size={14} /> End-to-end access controls &amp; session security enabled</div>
        </div>
      </div>
    </div>
  );
}
