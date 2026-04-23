import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUser, getTransactions, getNotifications } from '@/lib/db';
import { ArrowUpRight, ArrowDownLeft, Bell } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { QuickActionCard } from '@/components/quick-action-card';
import { FastTransitionLink } from '@/components/fast-transition-link';
import { NotificationsPanel } from '@/components/notifications-panel';
import { markNotificationAsRead } from '@/lib/db';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.userId) redirect('/login');
  
  const user = await getUser(session.userId);
  const transactions = await getTransactions(session.userId);
  const notifications = await getNotifications(session.userId);
  const recentTransactions = transactions.slice(0, 4);

  if (!user) redirect('/login');

  async function handleMarkAsRead(notificationId: string) {
    'use server';
    await markNotificationAsRead(notificationId);
  }

  return (
    <div className="flex flex-col h-full font-sans">
      
      {/* Header Bar */}
      <div className="flex items-end justify-between px-6 pt-8 pb-4">
        <div className="text-[20px] font-bold tracking-[-1px] uppercase text-mnr-text leading-none">
          MANNRU
        </div>
        <NotificationsPanel notifications={notifications} onMarkAsRead={handleMarkAsRead} />
      </div>

      {/* Balance Section */}
      <div className="px-6 pb-8 pt-4 border-b border-mnr-border">
        <div className="text-[12px] text-mnr-muted uppercase tracking-[2px] mb-2 font-bold">
          ОБЩИЙ БАЛАНС
        </div>
        <div className="text-[48px] font-bold tracking-[-2px] text-mnr-text leading-tight flex items-baseline">
          {new Intl.NumberFormat('ru-RU').format(Math.floor(user.balance))}
          <span className="text-mnr-accent ml-1 text-[32px]">.{(user.balance % 1).toFixed(2).substring(2)}</span>
          <span className="text-mnr-accent ml-2 text-[24px]">МР</span>
        </div>
        <div className="font-mono text-[12px] text-mnr-muted mt-3 inline-block bg-mnr-surface border border-mnr-border px-2 py-1 tracking-widest">
          СЧЕТ: **** 4092
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex p-6 gap-4">
        <QuickActionCard href="/transfer" iconName="ArrowUpRight" label="ПЕРЕВОД" />
        <QuickActionCard href="/qr" iconName="ArrowDownLeft" label="СКАН" />
      </div>

      {/* Transactions */}
      <div className="px-6 flex-1 pb-24">
        <div className="flex items-center justify-between text-[12px] text-mnr-muted uppercase tracking-[2px] mb-4 font-bold">
          <span>ЛОГ</span>
          <FastTransitionLink href="/history" className="hover:text-mnr-text transition-colors">ВСЕ</FastTransitionLink>
        </div>
        
        <div className="flex flex-col">
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-mnr-muted py-6 font-medium">Нет операций.</p>
          ) : (
            recentTransactions.map((tx) => {
              const isOutgoing = tx.senderId === user.id;
              return (
                <div key={tx.id} className="flex items-center justify-between py-5 border-b border-mnr-border border-dashed last:border-0 hover:bg-mnr-surface/50 transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-[16px] text-mnr-text">
                      {tx.type === 'transfer' ? (isOutgoing ? 'Исходящий перевод' : 'Входящий перевод') : tx.description}
                    </span>
                    <span className="text-[12px] text-mnr-muted">
                      {new Intl.DateTimeFormat('ru-RU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(tx.timestamp))} • Сеть
                    </span>
                  </div>
                  <div className={cn("font-mono text-[16px] font-bold tracking-tight", isOutgoing ? "text-mnr-text" : "text-mnr-accent")}>
                    {isOutgoing ? '- ' : '+ '}{new Intl.NumberFormat('ru-RU').format(tx.amount)}.00
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}