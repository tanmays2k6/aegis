'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  ShieldAlert,
  ClipboardCheck,
  BadgeCheck,
  Users,
  Settings,
  X,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/utils/cn';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  phase?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Investigation',
    items: [
      {
        label: 'Cases',
        href: '/cases',
        icon: FolderOpen,
        phase: 'Phase 2',
      },
      {
        label: 'Documents',
        href: '/documents',
        icon: FileText,
        phase: 'Phase 2',
      },
      {
        label: 'Evidence',
        href: '/evidence',
        icon: ShieldAlert,
        phase: 'Phase 2',
      },
    ],
  },
  {
    title: 'Security & Integrity',
    items: [
      {
        label: 'Audit Trail',
        href: '/audit',
        icon: ClipboardCheck,
        phase: 'Phase 2',
      },
      {
        label: 'Verification',
        href: '/verification',
        icon: BadgeCheck,
        phase: 'Phase 3',
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Users',
        href: '/users',
        icon: Users,
        phase: 'Phase 2',
      },
      {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
      },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
          <Logo theme="dark" size="sm" showSubtitle={true} />
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigationSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && (
                <div className="px-3 text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 text-xs font-medium rounded transition-colors group',
                      isActive
                        ? 'bg-gov-blue text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={cn(
                          'w-4 h-4 transition-colors',
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.phase && (
                      <span className="text-[9px] font-medium bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/60">
                        {item.phase}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Official Environment Notice */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/20 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">AEGIS Core</span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400 font-mono">
              v1.0.0
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Restricted Government Network
          </p>
        </div>
      </aside>
    </>
  );
};
