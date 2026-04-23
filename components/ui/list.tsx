'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListProps {
  children: React.ReactNode;
  className?: string;
}

export function List({ children, className }: ListProps) {
  return (
    <div className={cn('bg-mnr-surface border border-mnr-border divide-y divide-mnr-border', className)}>
      {children}
    </div>
  );
}

interface ListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function ListItem({ children, onClick, href, icon, rightElement, className, disabled }: ListItemProps) {
  const content = (
    <>
      {icon && <div className="text-mnr-accent mr-3 shrink-0">{icon}</div>}
      <div className="flex-1 text-left">{children}</div>
      {rightElement ? (
        <div className="text-mnr-muted ml-3 shrink-0">{rightElement}</div>
      ) : (
        <ChevronRight className="w-5 h-5 text-mnr-muted ml-3 shrink-0" />
      )}
    </>
  );

  const baseClassName = cn(
    'flex items-center px-4 py-4 transition-colors w-full',
    !disabled && 'hover:bg-mnr-accent/5 active:bg-mnr-accent/10 cursor-pointer',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  );

  if (href) {
    return (
      <a href={href} className={baseClassName}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} className={baseClassName}>
      {content}
    </button>
  );
}

interface ListSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function ListSection({ title, children, className }: ListSectionProps) {
  return (
    <div className={className}>
      {title && (
        <div className="text-[12px] text-mnr-muted uppercase tracking-[2px] mb-2 font-bold px-4">
          {title}
        </div>
      )}
      <List>{children}</List>
    </div>
  );
}
