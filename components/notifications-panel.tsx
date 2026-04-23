'use client';

import { useState, useEffect } from 'react';
import { Bell, X, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification } from '@/lib/db';
import { useToast } from '@/components/toast';

interface NotificationsPanelProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

export function NotificationsPanel({ notifications, onMarkAsRead }: NotificationsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previousCount, setPreviousCount] = useState(0);
  const { toast } = useToast();
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Show toast for new unread notifications
  useEffect(() => {
    if (unreadCount > previousCount) {
      const newNotifications = notifications.filter((n) => !n.read).slice(0, unreadCount - previousCount);
      newNotifications.forEach((notification) => {
        const toastType = notification.type === 'transfer_received' ? 'transfer_received' as const :
                         notification.type === 'transfer_sent' ? 'transfer_sent' as const : 'info' as const;
        toast({
          type: toastType,
          title: notification.title,
          message: notification.message,
          amount: notification.amount,
        });
      });
    }
    setPreviousCount(unreadCount);
  }, [unreadCount, notifications, previousCount, toast]);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'transfer_received':
        return <ArrowDownLeft className="w-4 h-4 text-mnr-accent" />;
      case 'transfer_sent':
        return <ArrowUpRight className="w-4 h-4 text-mnr-muted" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-[40px] h-[40px] border border-mnr-border flex items-center justify-center bg-mnr-surface relative hover:border-mnr-accent transition-colors"
      >
        <Bell className="w-5 h-5 text-mnr-text" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-mnr-accent text-black text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 w-80 max-h-96 bg-mnr-surface border border-mnr-border z-50 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-mnr-border">
              <span className="text-[12px] font-bold uppercase tracking-widest text-mnr-text">
                УВЕДОМЛЕНИЯ
              </span>
              <button onClick={() => setIsOpen(false)} className="text-mnr-muted hover:text-mnr-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-mnr-muted text-sm">
                  Нет уведомлений
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => onMarkAsRead(notification.id)}
                    className={cn(
                      "p-4 border-b border-mnr-border cursor-pointer hover:bg-mnr-surface-hover transition-colors",
                      !notification.read && "bg-mnr-accent/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getIcon(notification.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[14px] text-mnr-text">
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-mnr-accent rounded-full shrink-0" />
                          )}
                        </div>
                        <p className="text-[12px] text-mnr-muted mt-1">{notification.message}</p>
                        {notification.amount && (
                          <span className="text-[12px] font-mono text-mnr-accent mt-1 block">
                            {notification.amount} МР
                          </span>
                        )}
                        <span className="text-[10px] text-mnr-muted mt-2 block">
                          {new Intl.DateTimeFormat('ru-RU', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(notification.timestamp))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
