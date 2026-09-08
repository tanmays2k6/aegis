import React from 'react';
import { Shield, FileCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface LogoProps {
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  theme?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  showSubtitle = true,
  size = 'md',
  className,
  theme = 'light',
}) => {
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const titleSizes = {
    sm: 'text-base font-bold tracking-wider',
    md: 'text-lg font-bold tracking-wider',
    lg: 'text-2xl font-bold tracking-wider',
  };

  const isLight = theme === 'light';

  return (
    <div className={cn('flex items-center gap-3 select-none', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded border transition-colors',
          isLight
            ? 'bg-gov-navy text-white border-gov-dark'
            : 'bg-white text-gov-navy border-slate-300',
          size === 'sm' && 'p-1.5',
          size === 'md' && 'p-2',
          size === 'lg' && 'p-2.5'
        )}
      >
        <Shield className={iconSizes[size]} />
        <FileCheck
          className={cn(
            'absolute',
            size === 'sm' && 'w-3 h-3 translate-x-1.5 translate-y-1.5',
            size === 'md' && 'w-3.5 h-3.5 translate-x-2 translate-y-2',
            size === 'lg' && 'w-4 h-4 translate-x-2.5 translate-y-2.5',
            isLight ? 'text-amber-400' : 'text-gov-navy'
          )}
        />
      </div>

      <div className="flex flex-col text-left">
        <span
          className={cn(
            titleSizes[size],
            isLight ? 'text-gov-dark' : 'text-white'
          )}
        >
          AEGIS
        </span>
        {showSubtitle && (
          <span
            className={cn(
              'text-[10px] uppercase tracking-wider font-semibold leading-tight line-clamp-1',
              isLight ? 'text-gov-muted' : 'text-slate-300'
            )}
          >
            Authenticated Evidence & Government Investigation System
          </span>
        )}
      </div>
    </div>
  );
};
