'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { SystemStatus } from '@/components/dashboard/SystemStatus';
import { useAuth } from '@/lib/auth/AuthContext';
import { ROLE_DISPLAY_NAMES } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  FolderOpen,
  FileText,
  ShieldAlert,
  ClipboardCheck,
  BadgeCheck,
  Users,
  Building2,
  Clock,
  Shield,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile, user } = useAuth();

  const greetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Investigator';
  const roleName = profile ? ROLE_DISPLAY_NAMES[profile.role] : 'Special Investigator';

  return (
    <ProtectedRoute>
      <AppShell
        title="Operational Dashboard"
        breadcrumb="National Evidence Management System / Overview"
      >
        {/* Welcome Section */}
        <div className="bg-white border border-gov-border rounded p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gov-navy uppercase tracking-wider">
                Authorized Session Active
              </span>
              <Badge variant="success" size="sm">
                Operational
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-gov-dark">
              {greetingTime()}, {displayName}
            </h2>
            <p className="text-xs text-gov-muted">
              Logged in as <strong className="text-gov-slate">{roleName}</strong> within{' '}
              <strong>{profile?.department || 'Investigation Bureau'}</strong> ({profile?.jurisdiction || 'Central Division'}).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-gov-dark rounded border border-slate-200 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-gov-navy" />
              <span>Review Session Security</span>
            </Link>
          </div>
        </div>

        {/* Real System Operational Status Component */}
        <SystemStatus />

        {/* Workspace Modules Foundation Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-slate">
              Investigation Workspace Modules
            </h3>
            <span className="text-[11px] text-gov-muted">
              Phase 1 Foundation • Phase 2+ modules clearly demarcated
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Module 1: Cases */}
            <Card
              title="Case Management"
              subtitle="Secure investigation dossiers and multi-agency records"
              action={
                <Badge variant="warning" size="sm">
                  Coming in Phase 2
                </Badge>
              }
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-gov-slate shrink-0">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gov-muted leading-relaxed">
                    Case creation, FIR tracking, attribute-based access control, and jurisdiction assignment.
                  </p>
                  <Link
                    href="/cases"
                    className="inline-flex items-center gap-1 text-xs text-gov-navy hover:underline pt-1 font-medium"
                  >
                    <span>View module specification</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </Card>

            {/* Module 2: Documents */}
            <Card
              title="Sensitive Documents"
              subtitle="Chain-of-custody document repository"
              action={
                <Badge variant="warning" size="sm">
                  Coming in Phase 2
                </Badge>
              }
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-gov-slate shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gov-muted leading-relaxed">
                    Encrypted vault storage, tamper-evident metadata, multi-agency sharing, and version history.
                  </p>
                  <Link
                    href="/documents"
                    className="inline-flex items-center gap-1 text-xs text-gov-navy hover:underline pt-1 font-medium"
                  >
                    <span>View module specification</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </Card>

            {/* Module 3: Evidence */}
            <Card
              title="Evidence History"
              subtitle="Cryptographic tracking of physical & digital items"
              action={
                <Badge variant="warning" size="sm">
                  Coming in Phase 2
                </Badge>
              }
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-gov-slate shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gov-muted leading-relaxed">
                    Barcode tracking, forensic submission log, custodian handovers, and transfer logs.
                  </p>
                  <Link
                    href="/evidence"
                    className="inline-flex items-center gap-1 text-xs text-gov-navy hover:underline pt-1 font-medium"
                  >
                    <span>View module specification</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </Card>

            {/* Module 4: Audit Trail */}
            <Card
              title="Audit & Compliance"
              subtitle="Immutable event logs and access inspection"
              action={
                <Badge variant="warning" size="sm">
                  Coming in Phase 2
                </Badge>
              }
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-gov-slate shrink-0">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gov-muted leading-relaxed">
                    Non-repudiation audit trails logging every viewing, download, export, and administrative action.
                  </p>
                  <Link
                    href="/audit"
                    className="inline-flex items-center gap-1 text-xs text-gov-navy hover:underline pt-1 font-medium"
                  >
                    <span>View module specification</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </Card>

            {/* Module 5: Cryptographic Verification */}
            <Card
              title="Integrity Verification"
              subtitle="SHA-256 validation & blockchain anchoring"
              action={
                <Badge variant="default" size="sm">
                  Coming in Phase 3
                </Badge>
              }
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-gov-slate shrink-0">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gov-muted leading-relaxed">
                    Standalone file hash verifier proving uncompromised integrity across courts and forensic labs.
                  </p>
                  <Link
                    href="/verification"
                    className="inline-flex items-center gap-1 text-xs text-gov-navy hover:underline pt-1 font-medium"
                  >
                    <span>View module specification</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </Card>

            {/* Module 6: User Administration */}
            <Card
              title="User Administration"
              subtitle="Departmental roles and officer badge assignments"
              action={
                <Badge variant="warning" size="sm">
                  Coming in Phase 2
                </Badge>
              }
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-gov-slate shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gov-muted leading-relaxed">
                    Authorized officer enrollment, role assignments, department transfers, and credential revocation.
                  </p>
                  <Link
                    href="/users"
                    className="inline-flex items-center gap-1 text-xs text-gov-navy hover:underline pt-1 font-medium"
                  >
                    <span>View module specification</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
