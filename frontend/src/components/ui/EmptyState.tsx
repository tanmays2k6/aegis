import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  phaseBadge?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  phaseBadge,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'border border-dashed border-gov-border rounded-lg p-10 flex flex-col items-center justify-center text-center bg-slate-50/50',
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-gov-slate mb-4 border border-slate-200">
          <Icon className="w-6 h-6" />
        </div>
      )}
      {phaseBadge && (
        <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-slate-200 text-slate-700 rounded mb-2">
          {phaseBadge}
        </span>
      )}
      <h4 className="text-base font-medium text-gov-dark">{title}</h4>
      <p className="text-sm text-gov-muted max-w-sm mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
