'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth/AuthContext';
import { ROLE_DISPLAY_NAMES } from '@/types';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api';
import { User, Shield, KeyRound, Monitor, CheckCircle, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const { profile, session, refreshProfile } = useAuth();

  const [name, setName] = useState(profile?.name || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [jurisdiction, setJurisdiction] = useState(profile?.jurisdiction || '');
  const [badgeId, setBadgeId] = useState(profile?.badge_id || '');

  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setIsUpdating(true);
    setStatusMessage(null);

    try {
      await apiClient.updateProfile(session.access_token, {
        name,
        department,
        jurisdiction,
        badge_id: badgeId || null,
      });
      await refreshProfile();
      setStatusMessage({
        type: 'success',
        text: 'Profile details saved successfully in official record.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile record';
      setStatusMessage({
        type: 'error',
        text: message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const roleName = profile ? ROLE_DISPLAY_NAMES[profile.role] : 'Special Investigator';

  return (
    <ProtectedRoute>
      <AppShell
        title="Settings & Credentials"
        breadcrumb="Administration / Settings"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Officer Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card
              title="Official Officer Profile"
              subtitle="Government investigation identification and departmental jurisdiction"
            >
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {statusMessage && (
                  <div
                    className={`p-3 rounded border flex items-center gap-2 text-xs ${
                      statusMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {statusMessage.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{statusMessage.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Official Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />

                  <Input
                    label="Official Email Address"
                    value={profile?.email || ''}
                    disabled
                    helperText="Official email is bound to your account and cannot be modified."
                  />

                  <Input
                    label="Assigned Department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                  />

                  <Input
                    label="Jurisdiction / Territory"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    required
                  />

                  <Input
                    label="Officer Badge ID / Service Number"
                    value={badgeId}
                    onChange={(e) => setBadgeId(e.target.value)}
                    placeholder="e.g. NCID-7809"
                  />

                  <div className="space-y-1.5 text-left">
                    <label className="block text-xs font-semibold tracking-wider text-gov-slate uppercase">
                      Assigned Role
                    </label>
                    <div className="p-2 border border-gov-border rounded bg-slate-50 flex items-center justify-between">
                      <span className="text-xs font-bold text-gov-dark">{roleName}</span>
                      <Badge variant="info" size="sm">
                        Fixed Authority
                      </Badge>
                    </div>
                    <p className="text-[10px] text-gov-muted">
                      Role modifications require administrative authorization from the Directorate.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" isLoading={isUpdating}>
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </Card>

            {/* Active Sessions & Security */}
            <Card
              title="Active Authenticated Session"
              subtitle="Device and cryptographic session tokens"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between p-3 border border-gov-border rounded bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-gov-navy" />
                    <div>
                      <div className="text-xs font-bold text-gov-dark flex items-center gap-2">
                        <span>Current Browser Session</span>
                        <Badge variant="success" size="sm">
                          Current
                        </Badge>
                      </div>
                      <div className="text-[11px] text-gov-muted mt-0.5">
                        Token Expiration:{' '}
                        {session?.expires_at
                          ? new Date(session.expires_at * 1000).toLocaleString()
                          : 'Standard Session Duration'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gov-muted leading-relaxed">
                  Session tokens are signed and validated via Supabase Auth JWT. Any suspicious session activity will automatically flag the internal audit trail.
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Security Controls & Phase Notice */}
          <div className="space-y-6">
            <Card
              title="Security Controls"
              subtitle="Credential and access policies"
            >
              <div className="space-y-4">
                <div className="p-3 border border-slate-200 rounded space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gov-dark">Password Management</span>
                    <Badge variant="default" size="sm">Active</Badge>
                  </div>
                  <p className="text-[11px] text-gov-muted">
                    Strong password policy enforced with Supabase Auth encryption.
                  </p>
                </div>

                <div className="p-3 border border-dashed border-slate-300 rounded space-y-1 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gov-dark">Multi-Factor Auth (MFA)</span>
                    <Badge variant="warning" size="sm">Planned Phase 5</Badge>
                  </div>
                  <p className="text-[11px] text-gov-muted">
                    FIDO2 / Hardware Security Key and TOTP enforcement will be introduced in Phase 5.
                  </p>
                </div>

                <div className="p-3 border border-dashed border-slate-300 rounded space-y-1 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gov-dark">Hardware Token (PKI)</span>
                    <Badge variant="warning" size="sm">Planned Phase 5</Badge>
                  </div>
                  <p className="text-[11px] text-gov-muted">
                    e-Mudhra / USB cryptotoken digital signing support planned for evidence verification.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
