'use client';

import { ArrowUpRight, ArrowDownLeft, LucideIcon } from 'lucide-react';
import { useFastTransition } from '@/lib/fast-transition';

interface QuickActionCardProps {
  href: string;
  iconName: 'ArrowUpRight' | 'ArrowDownLeft';
  label: string;
}

const iconMap: Record<string, LucideIcon> = {
  ArrowUpRight,
  ArrowDownLeft,
};

export function QuickActionCard({ href, iconName, label }: QuickActionCardProps) {
  const { startTransition } = useFastTransition();
  const Icon = iconMap[iconName];

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    startTransition(href);
  };

  return (
    <button
      onClick={handleClick}
      className="flex-1 bg-mnr-surface border border-mnr-border p-5 flex flex-col items-start gap-3 transition-colors hover:border-mnr-accent group active:translate-y-[2px] active:bg-mnr-surface-hover relative"
    >
      <Icon className="text-mnr-accent w-6 h-6" />
      <span className="font-bold text-[14px] uppercase tracking-wide text-mnr-text">{label}</span>
    </button>
  );
}
