'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, CheckCircle2, Lock, Mail } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoSigningIn, setIsDemoSigningIn] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';
  const supabase = getSupabaseBrowserClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        // Restrained professional error message
        setError('Authentication failed. Please verify your official email and password.');
        return;
      }

      if (data.session) {
        router.push(redirectPath);
      }
    } catch {
      setError('System communication failure. Please check your connectivity and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-gov-border rounded shadow-md overflow-hidden">
      {/* Header Banner */}
      <div className="bg-slate-50 border-b border-gov-border px-6 py-4">
        <h2 className="text-base font-bold text-gov-dark">Official Account Login</h2>
        <p className="text-xs text-gov-muted mt-0.5">
          Enter your authorized credentials to access investigation records.
        </p>
      </div>

      {/* Form Content */}
      <form onSubmit={handleLogin} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded flex items-start gap-2.5 text-xs text-rose-700">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Email / Official ID"
            type="email"
            id="official-email"
            required
            placeholder="officer.badge@gov.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading || isDemoSigningIn}
            autoComplete="username"
          />

          <Input
            label="Password"
            type="password"
            id="official-password"
            required
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading || isDemoSigningIn}
            autoComplete="current-password"
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
            disabled={isDemoSigningIn}
          >
            Sign In to AEGIS
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-gov-muted">Forgot password?</span>
          <span className="text-gov-muted cursor-not-allowed hover:text-gov-slate">
            Contact Department Administrator
          </span>
        </div>
      </form>

      {/* Official Security Notice Footer */}
      <div className="bg-slate-50/80 border-t border-gov-border px-6 py-3 flex items-start gap-2 text-[11px] text-gov-muted leading-relaxed">
        <Lock className="w-3.5 h-3.5 text-gov-slate shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-gov-slate">Authorized Personnel Only.</span>{' '}
          All session activities, IP addresses, and document access requests are cryptographically audited and permanently logged.
        </div>
      </div>
    </div>
  );
};
