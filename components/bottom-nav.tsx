'use client';

import { usePathname } from 'next/navigation';
import { Home, ArrowRightLeft, Smile, History, User, CreditCard, LogOut, Grid3x3, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFastTransition, useRoutePreload } from '@/lib/fast-transition';
import { useState, useEffect } from 'react';

export function BottomNav() {
  const pathname = usePathname();
  const { startTransition } = useFastTransition();
  const [user, setUser] = useState<any>(null);
  const [installedMiniApps, setInstalledMiniApps] = useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Preload all routes on mount for instant navigation
  useRoutePreload();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/user');
        const data = await res.json();
        setUser(data.user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchMiniApps = async () => {
      try {
        const res = await fetch('/api/miniapps?my=true');
        const data = await res.json();
        setInstalledMiniApps(data.miniApps || []);
      } catch (error) {
        console.error('Failed to fetch miniapps:', error);
      }
    };
    fetchMiniApps();
  }, []);

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
    
    // Update main content padding
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      if (sidebarCollapsed) {
        mainContent.classList.remove('md:pl-24', 'lg:pl-72');
        mainContent.classList.add('md:pl-20');
      } else {
        mainContent.classList.remove('md:pl-20');
        mainContent.classList.add('md:pl-24', 'lg:pl-72');
      }
    }
    
    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('sidebarCollapsed', { detail: sidebarCollapsed }));
  }, [sidebarCollapsed]);

  const mainLinks = [
    { href: '/', icon: Home, label: 'Главная' },
    { href: '/cards', icon: CreditCard, label: 'Карты' },
    { href: '/qr', icon: Smile, label: 'Emoji Код' },
    { href: '/history', icon: History, label: 'История' },
  ];

  const miniAppsLinks = [
    { href: '/miniapps/marketplace', icon: Grid3x3, label: 'Мини-приложения' },
  ];

  const accountLinks = [
    { href: '/transfer', icon: ArrowRightLeft, label: 'Переводы' },
  ];

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    if (pathname !== href) {
      startTransition(href);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 bg-[#18181b] border-t-4 border-mnr-border">
        <nav className="flex items-center justify-between px-2 h-[80px]">
          {[...mainLinks, ...miniAppsLinks, { href: '/profile', icon: User, label: 'Профиль' }].map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <button
                key={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={cn(
                  "flex items-center justify-center w-16 h-16 transition-all border-2",
                  isActive 
                    ? "bg-mnr-accent text-black border-mnr-accent" 
                    : "text-mnr-muted hover:text-mnr-text border-transparent"
                )}
              >
                <Icon className="h-7 w-7" strokeWidth={isActive ? 2.5 : 2} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Desktop Sidebar Navigation */}
      <div className={cn(
        "hidden md:flex fixed left-0 top-0 z-50 h-screen flex-col bg-[#18181b] border-r-4 border-mnr-border transition-all duration-300",
        sidebarCollapsed ? "w-20" : "w-24 lg:w-72"
      )}>
        <nav className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto pt-6">
          {/* Collapse Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center justify-center w-full p-2 mb-2 bg-mnr-surface border-2 border-mnr-border hover:border-mnr-accent transition-all"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5 text-mnr-text" /> : <PanelLeftClose className="h-5 w-5 text-mnr-text" />}
          </button>

          {/* Main Section */}
          <div className="space-y-2">
            {!sidebarCollapsed && (
              <div className="hidden lg:block text-mnr-muted text-xs font-bold uppercase tracking-widest mb-2 px-2">
                Основное
              </div>
            )}
            {mainLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <button
                  key={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={cn(
                    "flex items-center justify-center lg:justify-start gap-3 w-full transition-all border-2",
                    sidebarCollapsed ? "p-3 aspect-square" : "p-3",
                    isActive 
                      ? "bg-mnr-accent text-black border-mnr-accent shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                      : "text-mnr-text hover:text-mnr-accent border-mnr-border hover:border-mnr-accent"
                  )}
                  title={sidebarCollapsed ? link.label : undefined}
                >
                  <Icon className="h-6 w-6 shrink-0" strokeWidth={2.5} />
                  {!sidebarCollapsed && <span className="hidden lg:inline font-bold">{link.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Account Section */}
          <div className="space-y-2">
            {!sidebarCollapsed && (
              <div className="hidden lg:block text-mnr-muted text-xs font-bold uppercase tracking-widest mb-2 px-2">
                Счет
              </div>
            )}
            {accountLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <button
                  key={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={cn(
                    "flex items-center justify-center lg:justify-start gap-3 w-full transition-all border-2",
                    sidebarCollapsed ? "p-3 aspect-square" : "p-3",
                    isActive 
                      ? "bg-mnr-accent text-black border-mnr-accent shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                      : "text-mnr-text hover:text-mnr-accent border-mnr-border hover:border-mnr-accent"
                  )}
                  title={sidebarCollapsed ? link.label : undefined}
                >
                  <Icon className="h-6 w-6 shrink-0" strokeWidth={2.5} />
                  {!sidebarCollapsed && <span className="hidden lg:inline font-bold">{link.label}</span>}
                </button>
              );
            })}
          </div>

          {/* MiniApps Section */}
          <div className="space-y-2">
            {!sidebarCollapsed && (
              <div className="hidden lg:block text-mnr-muted text-xs font-bold uppercase tracking-widest mb-2 px-2">
                Мини-приложения
              </div>
            )}
            <button
              onClick={(e) => handleNavClick(e, '/miniapps/marketplace')}
              className={cn(
                "flex items-center justify-center lg:justify-start gap-3 w-full transition-all border-2",
                sidebarCollapsed ? "p-3 aspect-square" : "p-3",
                pathname === '/miniapps/marketplace' || pathname.startsWith('/miniapps')
                  ? "bg-mnr-accent text-black border-mnr-accent shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                  : "text-mnr-text hover:text-mnr-accent border-mnr-border hover:border-mnr-accent"
              )}
              title={sidebarCollapsed ? "Маркетплейс" : undefined}
            >
              <Grid3x3 className="h-6 w-6 shrink-0" strokeWidth={2.5} />
              {!sidebarCollapsed && <span className="hidden lg:inline font-bold">Маркетплейс</span>}
            </button>
            {!sidebarCollapsed && installedMiniApps.slice(0, 3).map((app) => (
              <button
                key={app.id}
                onClick={(e) => handleNavClick(e, `/miniapps/run/${app.id}`)}
                className={cn(
                  "flex items-center justify-center lg:justify-start gap-3 w-full p-3 transition-all border-2",
                  pathname === `/miniapps/run/${app.id}`
                    ? "bg-mnr-accent text-black border-mnr-accent shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                    : "text-mnr-text hover:text-mnr-accent border-mnr-border hover:border-mnr-accent"
                )}
              >
                <Grid3x3 className="h-6 w-6 shrink-0" strokeWidth={2.5} />
                <span className="hidden lg:inline font-bold truncate">{app.name}</span>
              </button>
            ))}
          </div>

        </nav>

        {/* Profile Section */}
        <div className="p-4 border-t-4 border-mnr-border space-y-3">
          {user ? (
            <>
              <button
                onClick={(e) => handleNavClick(e, '/profile')}
                className={cn(
                  "w-full bg-mnr-surface border-2 border-mnr-border hover:border-mnr-accent transition-all flex items-center justify-center lg:justify-start gap-3",
                  sidebarCollapsed ? "p-3 aspect-square" : "p-3"
                )}
                title={sidebarCollapsed ? user.fullName : undefined}
              >
                <div className="w-10 h-10 bg-mnr-accent border-2 border-black flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-black" strokeWidth={2.5} />
                </div>
                {!sidebarCollapsed && (
                  <div className="hidden lg:block text-left">
                    <div className="font-bold text-mnr-text text-sm">{user.fullName}</div>
                    <div className="text-xs text-mnr-muted">@{user.username}</div>
                  </div>
                )}
              </button>
              <button
                onClick={handleLogout}
                className={cn(
                  "w-full bg-mnr-error text-white border-2 border-black hover:bg-red-600 transition-all flex items-center justify-center lg:justify-start gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px]",
                  sidebarCollapsed ? "p-3 aspect-square" : "p-3"
                )}
                title={sidebarCollapsed ? "Выход" : undefined}
              >
                <LogOut className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                {!sidebarCollapsed && <span className="hidden lg:inline font-bold">Выход</span>}
              </button>
            </>
          ) : (
            <div className="w-full p-3 bg-mnr-surface border-2 border-mnr-border">
              <div className="animate-pulse h-10 w-10 bg-mnr-border rounded"></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
