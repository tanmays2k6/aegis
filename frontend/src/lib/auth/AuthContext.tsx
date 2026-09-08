'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { UserProfile, UserRole } from '@/types';
import { apiClient } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const supabase = getSupabaseBrowserClient();

  const fetchUserProfile = async (currentUser: User, currentSession: Session) => {
    try {
      // First try fetching from backend API (which verifies against public.profiles)
      const data = await apiClient.getProfile(currentSession.access_token);
      setProfile(data);
    } catch {
      // Fallback fallback construction if profile row not yet seeded
      const fallbackRole = (currentUser.user_metadata?.role as UserRole) || UserRole.OFFICER;
      setProfile({
        id: currentUser.id,
        name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Authorized User',
        email: currentUser.email || '',
        role: fallbackRole,
        department: currentUser.user_metadata?.department || 'Special Investigation Unit',
        jurisdiction: currentUser.user_metadata?.jurisdiction || 'Central Division',
        badge_id: currentUser.user_metadata?.badge_id || null,
        avatar_url: null,
        created_at: currentUser.created_at,
        updated_at: currentUser.created_at,
      });
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await fetchUserProfile(initialSession.user, initialSession);
        }
      } catch (err) {
        console.error('Error during auth initialization:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchUserProfile(newSession.user, newSession);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user && session) {
      await fetchUserProfile(user, session);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
