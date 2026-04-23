import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getTransactions, getUser } from '@/lib/db';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function HistoryPage() {
  const session = await getSession();
  if (!session?.userId) redirect('/login');
  const user = await getUser(session.userId);
  const transactions = await getTransactions(session.userId);

  if (!user) redirect('/login');

  return (
    <div className="flex flex-col h-full font-sans">
      <div className="flex items-end justify-between px-6 pt-8 pb-4 border-b border-mnr-border">
        <div className="text-[20px] font-bold tracking-[-1px] uppercase text-mnr-text leading-none">
          СИСТЕМНЫЙ ЛОГ
        </div>
      </div>

      <div className="px-6 flex-1 pb-24 pt-4">
        <div className="flex items-center justify-between text-[12px] text-mnr-muted uppercase tracking-[2px] mb-4 font-bold">
          <span>Все операции</span>
          <span className="text-mnr-text">{transactions.length} ЗАПИСЕЙ</span>
        </div>

        <div className="flex flex-col">
          {transactions.length === 0 ? (
            <p className="text-sm text-mnr-muted py-6 font-medium">Нет операций.</p>
          ) : (
            transactions.map((tx) => {
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
                    {tx.type === 'transfer' && (
                       <span className="font-mono text-[10px] text-mnr-accent mt-1 max-w-[200px] truncate">
                         &quot;{tx.description}&quot;
                       </span>
                    )}
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
