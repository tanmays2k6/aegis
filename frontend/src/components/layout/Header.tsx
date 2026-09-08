'use client';

import React from 'react';
import { Menu, Bell, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ROLE_DISPLAY_NAMES } from '@/types';
import { SystemStatus } from '@/components/dashboard/SystemStatus';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
  breadcrumb?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  title = 'Operational Dashboard',
  breadcrumb,
}) => {
  const { profile, user, signOut } = useAuth();

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Authorized Personnel';
  const displayRole = profile ? ROLE_DISPLAY_NAMES[profile.role] : 'Special Investigator';
  const department = profile?.department || 'Investigation Bureau';

  return (
    <header className="h-16 bg-white border-b border-gov-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Left: Mobile Menu Toggle & Breadcrumb / Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-1.5 text-gov-slate hover:bg-slate-100 rounded lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          {breadcrumb && (
            <div className="text-[11px] font-medium text-gov-muted uppercase tracking-wider">
              {breadcrumb}
            </div>
          )}
          <h1 className="text-sm lg:text-base font-bold text-gov-dark leading-none">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Security Indicator, User Details, Logout */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:block">
          <SystemStatus compact={true} />
        </div>

        {/* Notifications Icon (Phase 1 inactive) */}
        <button
          className="p-1.5 text-gov-muted hover:text-gov-slate hover:bg-slate-100 rounded transition-colors relative"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-gov-border" />

        {/* User Card */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-gov-navy text-white flex items-center justify-center text-xs font-bold uppercase select-none">
            {displayName.charAt(0)}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-bold text-gov-dark leading-tight line-clamp-1">
              {displayName}
            </span>
            <span className="text-[10px] text-gov-muted leading-tight font-medium">
              {displayRole} • {department}
            </span>
          </div>
        </div>

        {/* Sign Out Action */}
        <button
          onClick={signOut}
          className="p-1.5 text-gov-muted hover:text-status-error hover:bg-rose-50 rounded transition-colors"
          title="Sign out of AEGIS"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
