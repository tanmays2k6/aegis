import { useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { api } from './lib/api.js';
import AuthScreen from './screens/AuthScreen.jsx';
import Workspace from './screens/Workspace.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('coc_token');
    if (!token) { setLoading(false); return; }

    (async () => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const userId = payload.sub;
        const data = await api.auth.getProfile();
        if (data.profile) {
          setProfile(data.profile);
          setSession({ user: { id: userId, email: payload.email } });
        }
      } catch {
        localStorage.removeItem('coc_token');
      }
      setLoading(false);
    })();
  }, []);

  function handleAuthed(data) {
    setSession({ user: data.user });
    if (data.profile) setProfile(data.profile);
  }

  function handleSignOut() {
    localStorage.removeItem('coc_token');
    setSession(null);
    setProfile(null);
  }

  if (loading) return <LoadingScreen />;
  if (!session) return <AuthScreen onAuthed={handleAuthed} />;
  return <Workspace profile={profile} email={session.user.email ?? ''} onSignOut={handleSignOut} />;
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="brand-mark"><Fingerprint size={22} /></div>
      <div className="loading-line" />
      <p>Securing workspace</p>
    </div>
  );
}
