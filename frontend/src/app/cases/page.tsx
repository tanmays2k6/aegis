'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { FolderOpen } from 'lucide-react';
import Link from 'next/link';

export default function CasesPage() {
  return (
    <ProtectedRoute>
      <AppShell
        title="Investigation Dossiers & Cases"
        breadcrumb="Investigation / Cases"
      >
        <div className="max-w-3xl mx-auto py-8">
          <EmptyState
            icon={FolderOpen}
            phaseBadge="Phase 2 Module"
            title="Case Management System"
            description="Case creation, FIR docketing, multi-departmental jurisdictional access, and role-based assignment will be introduced in subsequent development Phase 2."
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
