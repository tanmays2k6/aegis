'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { Users } from 'lucide-react';
import Link from 'next/link';

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <AppShell
        title="Officer & Personnel Directory"
        breadcrumb="Administration / Users"
      >
        <div className="max-w-3xl mx-auto py-8">
          <EmptyState
            icon={Users}
            phaseBadge="Phase 2 Module"
            title="Departmental User & Role Administration"
            description="Investigator onboarding, departmental transfers, badge assignment, and administrative role provisioning will be introduced in subsequent development Phase 2."
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
