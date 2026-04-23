'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'transfer_received' | 'transfer_sent';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  amount?: number;
}

interface ToastContextType {
  toast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { ...toastData, id };
    
    setToasts((prev) => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-mnr-accent" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-mnr-error" />;
      case 'info':
        return <Info className="w-5 h-5 text-mnr-text" />;
      case 'transfer_received':
        return <ArrowDownLeft className="w-5 h-5 text-mnr-accent" />;
      case 'transfer_sent':
        return <ArrowUpRight className="w-5 h-5 text-mnr-muted" />;
      default:
        return null;
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto bg-mnr-surface border border-mnr-border p-4 flex items-start gap-3 min-w-[320px] max-w-md shadow-lg animate-in slide-in-from-right-full fade-in duration-300",
              t.type === 'error' && "border-mnr-error"
            )}
          >
            <div className="mt-0.5 shrink-0">{getIcon(t.type)}</div>
            <div className="flex-1">
              <div className="font-bold text-[14px] text-mnr-text">{t.title}</div>
              {t.message && (
                <div className="text-[12px] text-mnr-muted mt-1">{t.message}</div>
              )}
              {t.amount && (
                <div className="font-mono text-[14px] text-mnr-accent mt-1">
                  {t.amount} МР
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-mnr-muted hover:text-mnr-text transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
