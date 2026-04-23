'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// FastTransition - A custom technology for instant page navigation
// Preloads routes for instant navigation without delays

export function useFastTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionRef = useRef<boolean>(false);

  const startTransition = (href: string, callback?: () => void) => {
    if (transitionRef.current) return;
    transitionRef.current = true;
    setIsTransitioning(true);

    router.push(href);
    
    setTimeout(() => {
      setIsTransitioning(false);
      transitionRef.current = false;
      callback?.();
    }, 50);
  };

  return { isTransitioning, startTransition, pathname };
}

// Preload all routes for instant navigation
export function preloadRoutes() {
  if (typeof window === 'undefined') return;

  const routes = ['/', '/transfer', '/qr', '/history', '/profile', '/cards'];
  
  routes.forEach(route => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    document.head.appendChild(link);
  });
}

// Hook to preload routes on mount
export function useRoutePreload() {
  useEffect(() => {
    preloadRoutes();
  }, []);
}
