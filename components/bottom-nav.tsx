'use client';

import { usePathname } from 'next/navigation';
import { Home, ArrowRightLeft, QrCode, History, User, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFastTransition, useRoutePreload } from '@/lib/fast-transition';

export function BottomNav() {
  const pathname = usePathname();
  const { startTransition } = useFastTransition();
  
  // Preload all routes on mount for instant navigation
  useRoutePreload();

  const links = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/cards', icon: CreditCard, label: 'Cards' },
    { href: '/qr', icon: QrCode, label: 'QR Code' },
    { href: '/history', icon: History, label: 'History' },
    { href: '/profile', icon: User, label: 'Profile' },
  ];

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    if (pathname !== href) {
      startTransition(href);
    }
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 bg-[#18181b] border-t border-mnr-border">
        <nav className="flex items-center justify-between px-2 h-[80px]">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <button
                key={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={cn(
                  "flex items-center justify-center w-16 h-16 rounded-full transition-all",
                  isActive 
                    ? "bg-mnr-accent text-black" 
                    : "text-mnr-muted hover:text-mnr-text"
                )}
              >
                <Icon className="h-7 w-7" strokeWidth={isActive ? 2.5 : 2} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Desktop Sidebar Navigation */}
      <div className="hidden md:flex fixed left-0 top-0 z-50 h-screen w-20 lg:w-64 flex-col bg-[#18181b] border-r border-mnr-border">
        <nav className="flex-1 flex flex-col items-center lg:items-start gap-2 p-4">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <button
                key={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={cn(
                  "flex items-center justify-center lg:justify-start gap-3 w-full p-3 rounded-lg transition-all",
                  isActive 
                    ? "bg-mnr-accent text-black" 
                    : "text-mnr-muted hover:text-mnr-text hover:bg-mnr-surface-hover"
                )}
              >
                <Icon className="h-6 w-6 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                <span className="hidden lg:inline font-medium">{link.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
