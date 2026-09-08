'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { BadgeCheck } from 'lucide-react';
import Link from 'next/link';

export default function VerificationPage() {
  return (
    <ProtectedRoute>
      <AppShell
        title="Cryptographic Integrity Verification"
        breadcrumb="Security & Integrity / Verification"
      >
        <div className="max-w-3xl mx-auto py-8">
          <EmptyState
            icon={BadgeCheck}
            phaseBadge="Phase 3 Module"
            title="Evidence & Document Hash Verifier"
            description="Cryptographic SHA-256 validation, hash-chain integrity proofs, and public verification receipts will be introduced in Phase 3."
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
