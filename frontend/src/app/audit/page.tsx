'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClipboardCheck } from 'lucide-react';
import Link from 'next/link';

export default function AuditPage() {
  return (
    <ProtectedRoute>
      <AppShell
        title="Immutable Audit Trails"
        breadcrumb="Security & Integrity / Audit Trail"
      >
        <div className="max-w-3xl mx-auto py-8">
          <EmptyState
            icon={ClipboardCheck}
            phaseBadge="Phase 2 Module"
            title="System Audit & Non-Repudiation Log"
            description="Complete tamper-evident event logging, access inspections, and cryptographic export features will be introduced in subsequent development Phase 2."
            action={
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 text-xs font-semibold bg-gov-navy text-white rounded hover:bg-gov-hover transition-colors"
              >
                Return to Operational Dashboard
              </Link>
            }
          />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
