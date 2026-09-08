import React, { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Logo } from '@/components/ui/Logo';
import { Shield, Lock, FileCheck2, Scale } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Banner */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-gov-slate uppercase tracking-wider">
          <Scale className="w-4 h-4 text-gov-navy" />
          <span>Ministry of Home Affairs & Forensic Services Portal</span>
        </div>
        <div className="text-[11px] font-mono text-gov-muted">
          RESTRICTED-GOV-NETWORK
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center my-8">
        <div className="text-center mb-8 space-y-2">
          <div className="flex justify-center mb-3">
            <Logo size="lg" showSubtitle={false} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gov-dark">
            AEGIS — Secure Evidence System
          </h1>
          <p className="text-xs sm:text-sm text-gov-muted max-w-md mx-auto">
            Authenticated Evidence & Government Investigation System. Departmental Access Gateway.
          </p>
        </div>

        {/* Login Form with Suspense for searchParams */}
        <Suspense
          fallback={
            <div className="w-full max-w-md h-72 bg-white border border-gov-border rounded p-6 animate-pulse" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>

      {/* Bottom Legal & Security Notice */}
      <footer className="w-full max-w-5xl mx-auto border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gov-muted">
        <div>
          Official System of Record. Unauthorized access constitutes a punishable legal offense.
        </div>
        <div className="flex items-center gap-4">
          <span>Security Protocol TLS 1.3</span>
          <span>•</span>
          <span>Access Auditing Active</span>
        </div>
      </footer>
    </div>
  );
}
