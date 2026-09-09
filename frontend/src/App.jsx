import { useEffect, useState } from 'react';
import { Fingerprint, Clock, AlertOctagon, UserX, LogOut } from 'lucide-react';
import { api, setAuthToken } from './lib/api.js';
import AuthScreen from './screens/AuthScreen.jsx';
import Workspace from './screens/Workspace.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('active');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt session restoration via server session / cookies
    (async () => {
      try {
        const data = await api.auth.getProfile();
        if (data.profile) {
          setProfile(data.profile);
          setStatus(data.profile.status || 'active');
          setSession({ user: { id: data.profile.id, email: data.profile.email } });
        }
      } catch (err) {
        // Clear tokens if invalid
        setAuthToken(null);
        if (err.status === 403 && err.code === 'ACCOUNT_INACTIVE') {
          setStatus(err.status || 'pending');
          setStatusMessage(err.message);
        }
      }
      setLoading(false);
    })();
  }, []);

  function handleAuthed(data) {
    setSession({ user: data.user });
    if (data.profile) {
      setProfile(data.profile);
      setStatus(data.profile.status || 'active');
    }
  }

  async function handleSignOut() {
    try {
      await api.auth.signOut();
    } catch {
      /* ignore signout network error */
    }
    setAuthToken(null);
    setSession(null);
    setProfile(null);
    setStatus('active');
  }

  if (loading) return <LoadingScreen />;

  if (!session) {
    return <AuthScreen onAuthed={handleAuthed} />;
  }

  if (status === 'pending') {
    return <PendingScreen profile={profile} onSignOut={handleSignOut} message={statusMessage} />;
  }

  if (status === 'suspended') {
    return <SuspendedScreen onSignOut={handleSignOut} message={statusMessage} />;
  }

  if (status === 'deactivated') {
    return <DeactivatedScreen onSignOut={handleSignOut} />;
  }

  return <Workspace profile={profile} email={session.user?.email ?? ''} onSignOut={handleSignOut} />;
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="brand-mark"><Fingerprint size={24} /></div>
      <div className="loading-line" />
      <p>Securing AEGIS workspace</p>
    </div>
  );
}

function PendingScreen({ profile, onSignOut, message }) {
  return (
    <div className="loading-screen" style={{ maxWidth: '500px', margin: '100px auto', padding: '32px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(217, 133, 53, 0.1)', borderRadius: '50%', color: '#d98535', marginBottom: '16px' }}>
        <Clock size={32} />
      </div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Access request under administrative review</h2>
      <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
        {message || 'Your account credentials and department verification have been submitted. An authorized administrator must approve your operational role before workspace access is granted.'}
      </p>
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', fontSize: '12px', textAlign: 'left', marginBottom: '24px' }}>
        <div><strong>Officer:</strong> {profile?.full_name || 'Officer'}</div>
        <div><strong>Department:</strong> {profile?.department || 'Bengaluru City Police'}</div>
        <div><strong>Jurisdiction:</strong> {profile?.jurisdiction || 'Bengaluru'}</div>
        <div><strong>Status:</strong> <span className="status-pill warning">PENDING APPROVAL</span></div>
      </div>
      <button className="secondary-button" onClick={onSignOut} style={{ margin: '0 auto' }}>
        <LogOut size={16} /> Sign out
      </button>
    </div>
  );
}

function SuspendedScreen({ onSignOut, message }) {
  return (
    <div className="loading-screen" style={{ maxWidth: '500px', margin: '100px auto', padding: '32px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(197, 48, 48, 0.1)', borderRadius: '50%', color: '#c53030', marginBottom: '16px' }}>
        <AlertOctagon size={32} />
      </div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Account suspended</h2>
      <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
        {message || 'Access to AEGIS evidence and case records has been suspended for this account. Contact your department administrator or internal affairs for clearance.'}
      </p>
      <button className="secondary-button" onClick={onSignOut} style={{ margin: '0 auto' }}>
        <LogOut size={16} /> Sign out
      </button>
    </div>
  );
}

function DeactivatedScreen({ onSignOut }) {
  return (
    <div className="loading-screen" style={{ maxWidth: '500px', margin: '100px auto', padding: '32px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(113, 128, 150, 0.1)', borderRadius: '50%', color: '#718096', marginBottom: '16px' }}>
        <UserX size={32} />
      </div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Account deactivated</h2>
      <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
        This account is no longer active in the personnel registry.
      </p>
      <button className="secondary-button" onClick={onSignOut} style={{ margin: '0 auto' }}>
        <LogOut size={16} /> Sign out
      </button>
    </div>
  );
}
