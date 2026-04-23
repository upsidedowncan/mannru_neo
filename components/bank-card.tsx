import { CreditCard, Trash2, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import { Card as CardType, CardTier } from '@/lib/db';
import { cn } from '@/lib/utils';

interface BankCardProps {
  card: CardType;
  onSelect?: () => void;
  onTransfer?: () => void;
  onDelete?: () => void;
  isActive?: boolean;
}

const tierColors: Record<CardTier, string> = {
  standard: 'from-gray-700 to-gray-900',
  gold: 'from-yellow-600 to-yellow-800',
  black: 'from-gray-900 to-black',
  platinum: 'from-gray-400 to-gray-600',
};

const tierNames: Record<CardTier, string> = {
  standard: 'STANDARD',
  gold: 'GOLD',
  black: 'BLACK',
  platinum: 'PLATINUM',
};

export function BankCard({ card, onSelect, onTransfer, onDelete, isActive }: BankCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative bg-gradient-to-br p-6 rounded-xl border-2 transition-all cursor-pointer',
        tierColors[card.tier],
        card.isActive ? 'border-mnr-accent' : 'border-transparent',
        'hover:border-mnr-accent/50 active:border-mnr-accent/80 active:bg-black/10'
      )}
    >
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-white/80" />
          <span className="text-[12px] font-bold text-white/80 uppercase tracking-widest">
            {tierNames[card.tier]}
          </span>
        </div>
        {card.isActive && (
          <div className="w-3 h-3 bg-mnr-accent rounded-full animate-pulse" />
        )}
      </div>

      <div className="font-mono text-[20px] text-white font-bold tracking-wider mb-6">
        **** {card.lastFour}
      </div>

      <div className="flex justify-between items-end">
        <div>
          <div className="text-[10px] text-white/60 uppercase tracking-widest mb-1">
            Баланс
          </div>
          <div className="text-[18px] font-mono text-white font-bold">
            {new Intl.NumberFormat('ru-RU').format(card.balance)} МР
          </div>
        </div>
        {isActive && (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTransfer?.();
              }}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 active:bg-white/30 transition-colors"
            >
              <ArrowUp className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="p-2 bg-white/10 rounded-lg hover:bg-red-500/20 active:bg-red-500/30 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        )}
      </div>

      {!card.isActive && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
          <span className="text-white font-bold text-sm uppercase tracking-widest">
            Неактивна
          </span>
        </div>
      )}
    </div>
  );
}
