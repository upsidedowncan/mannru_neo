'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { useFastTransition } from '@/lib/fast-transition';

interface FastTransitionLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function FastTransitionLink({ href, children, className }: FastTransitionLinkProps) {
  const { startTransition } = useFastTransition();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    startTransition(href);
  };

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
