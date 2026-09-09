import { useState } from 'react';
import {
  ArrowUpRight, Check, Fingerprint, LockKeyhole, X,
} from 'lucide-react';
import { api } from '../lib/api.js';

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('investigating_officer');
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
          localStorage.setItem('coc_token', data.session.access_token);
          onAuthed(data);
        }
      } else {
        await api.auth.signUp({
          email, password, fullName, role,
          department: 'Bengaluru City Police', jurisdiction: 'Bengaluru',
        });
        setMessage('Account created. You can sign in now.');
        setMode('login');
      }
    } catch {
      setError(mode === 'login'
        ? 'We couldn\u2019t sign you in. Check your email and password.'
        : 'We couldn\u2019t create your account. Please check your details and try again.');
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
            <span>CHAIN<span>OF</span>CUSTODY</span>
          </div>
          <p className="eyebrow">DIGITAL EVIDENCE COMMAND</p>
          <h1>Trust every<br /><em>single record.</em></h1>
          <p className="auth-lede">A secure evidence workspace built for the people who protect truth, preserve context, and stand up in court.</p>
          <div className="auth-proof">
            <div><strong>256-bit</strong><span>Hash anchoring</span></div>
            <div><strong>100%</strong><span>Traceable actions</span></div>
            <div><strong>5 roles</strong><span>One source of truth</span></div>
          </div>
        </div>
        <div className="auth-footer">NCRB / WOMEN SAFETY DIVISION <span>\u2022</span> SECURE COMMAND SYSTEM</div>
      </div>
      <div className="auth-panel">
        <div className="auth-panel-inner">
          <div className="mobile-brand">
            <span className="brand-mark"><Fingerprint size={20} /></span>
            CHAIN<span>OF</span>CUSTODY
          </div>
          <div className="auth-heading">
            <p className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'CREATE ACCESS'}</p>
            <h2>{mode === 'login' ? 'Sign in to your workspace' : 'Create your secure account'}</h2>
            <p>{mode === 'login' ? 'Continue where your chain of custody left off.' : 'Your role determines what you can view and approve.'}</p>
          </div>
          <form onSubmit={submit} className="auth-form">
            {mode === 'signup' && (
              <>
                <label>Full name
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Aarav Mehta" />
                </label>
                <label>Role
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="investigating_officer">Investigating Officer</option>
                    <option value="forensic_lab">Forensic Lab Officer</option>
                    <option value="court_clerk">Court Clerk</option>
                    <option value="auditor">Auditor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </label>
                <p className="auth-role-note">Select the workspace role for this demonstration account.</p>
              </>
            )}
            <label>Official email
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@department.gov" />
            </label>
            <label>Password
              <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
            </label>
            {error && <div className="form-error"><X size={15} />{error}</div>}
            {message && <div className="form-success"><Check size={15} />{message}</div>}
            <button className="primary-button full" disabled={busy}>
              {busy ? 'Securing access\u2026' : mode === 'login' ? 'Enter command center' : 'Create account'}
              <ArrowUpRight size={17} />
            </button>
          </form>
          <div className="auth-switch">
            {mode === 'login' ? 'Need an account?' : 'Already have access?'}{' '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}>
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </div>
          <div className="auth-note"><LockKeyhole size={14} /> End-to-end access controls enabled for every session</div>
        </div>
      </div>
    </div>
  );
}
