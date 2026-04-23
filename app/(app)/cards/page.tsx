'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, ArrowUp, ArrowDown, Zap, Pause, Play, X } from 'lucide-react';
import { Card, CardTier, WireTransfer } from '@/lib/db';
import { TIER_PRICES } from '@/lib/constants';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { BankCard } from '@/components/bank-card';

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [wireTransfers, setWireTransfers] = useState<WireTransfer[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showWireModal, setShowWireModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedTier, setSelectedTier] = useState<CardTier>('standard');
  const [selectedPaymentCard, setSelectedPaymentCard] = useState<string>('');
  const [selectedFromCard, setSelectedFromCard] = useState<string>('');
  const [selectedToCard, setSelectedToCard] = useState<string>('');
  const [wireAmount, setWireAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDirection, setTransferDirection] = useState<'to-card' | 'to-balance'>('to-card');
  const [loading, setLoading] = useState(true);

  const tierColors: Record<CardTier, { bg: string; border: string; text: string; accent: string }> = {
    standard: { bg: 'bg-mnr-surface', border: 'border-mnr-border', text: 'text-mnr-text', accent: 'text-mnr-muted' },
    gold: { bg: 'bg-yellow-900/20', border: 'border-yellow-600', text: 'text-yellow-100', accent: 'text-yellow-400' },
    platinum: { bg: 'bg-slate-300/20', border: 'border-slate-400', text: 'text-slate-100', accent: 'text-slate-300' },
    black: { bg: 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900 via-zinc-900 via-slate-900 to-zinc-950', border: 'border-zinc-600', text: 'text-zinc-100', accent: 'text-purple-400' },
  };

  const tierNames: Record<CardTier, string> = {
    standard: 'Стандарт',
    gold: 'Золото',
    platinum: 'Платина',
    black: 'Черный',
  };

  useEffect(() => {
    fetchCards();
    fetchWireTransfers();

    // Poll for wire updates every 5 seconds
    const interval = setInterval(() => {
      fetchWireTransfers();
      fetchCards();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchCards = async () => {
    try {
      const res = await fetch('/api/cards');
      const data = await res.json();
      setCards(data.cards || []);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWireTransfers = async () => {
    try {
      const res = await fetch('/api/wire-transfers');
      const data = await res.json();
      setWireTransfers(data.wireTransfers || []);
    } catch (error) {
      console.error('Failed to fetch wire transfers:', error);
    }
  };

  const handleCreateWire = async () => {
    try {
      const res = await fetch('/api/wire-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCardId: selectedFromCard,
          toCardId: selectedToCard,
          amount: parseFloat(wireAmount),
        }),
      });

      if (res.ok) {
        setShowWireModal(false);
        setSelectedFromCard('');
        setSelectedToCard('');
        setWireAmount('');
        fetchWireTransfers();
        fetchCards();
      } else {
        const data = await res.json();
        alert(data.error || 'Не удалось создать провод');
      }
    } catch (error) {
      console.error('Failed to create wire:', error);
    }
  };

  const handleExecuteWire = async (wireId: string) => {
    try {
      const res = await fetch(`/api/wire-transfers/${wireId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute' }),
      });

      if (res.ok) {
        fetchWireTransfers();
        fetchCards();
      }
    } catch (error) {
      console.error('Failed to execute wire:', error);
    }
  };

  const handlePauseWire = async (wireId: string) => {
    try {
      const res = await fetch(`/api/wire-transfers/${wireId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      });

      if (res.ok) {
        fetchWireTransfers();
      }
    } catch (error) {
      console.error('Failed to pause wire:', error);
    }
  };

  const handleResumeWire = async (wireId: string) => {
    try {
      const res = await fetch(`/api/wire-transfers/${wireId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      });

      if (res.ok) {
        fetchWireTransfers();
      }
    } catch (error) {
      console.error('Failed to resume wire:', error);
    }
  };

  const handleDeleteWire = async (wireId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот провод?')) return;

    try {
      const res = await fetch(`/api/wire-transfers/${wireId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchWireTransfers();
      }
    } catch (error) {
      console.error('Failed to delete wire:', error);
    }
  };

  const handleCreateCard = async () => {
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: selectedTier,
          paymentCardId: selectedPaymentCard || undefined,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setSelectedPaymentCard('');
        fetchCards();
      } else {
        const data = await res.json();
        alert(data.error || 'Не удалось создать карту');
      }
    } catch (error) {
      console.error('Failed to create card:', error);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту карту?')) return;

    try {
      const res = await fetch(`/api/cards?cardId=${cardId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchCards();
      }
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  const handleTransfer = async () => {
    if (!selectedCard || !transferAmount) return;

    try {
      const amount = parseFloat(transferAmount);
      const operation = transferDirection === 'to-card' ? 'add' : 'subtract';

      const res = await fetch('/api/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: selectedCard.id, amount, operation }),
      });

      if (res.ok) {
        setShowTransferModal(false);
        setTransferAmount('');
        setSelectedCard(null);
        fetchCards();
      } else {
        const data = await res.json();
        alert(data.error || 'Не удалось выполнить перевод');
      }
    } catch (error) {
      console.error('Failed to transfer:', error);
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col h-full font-sans">
        <div className="flex items-end justify-between px-6 pt-8 pb-4">
          <div className="text-[20px] font-bold tracking-[-1px] uppercase text-mnr-text leading-none">
            КАРТЫ
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-mnr-muted">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full font-sans">
      <div className="flex items-end justify-between px-6 pt-8 pb-4">
        <div className="text-[20px] font-bold tracking-[-1px] uppercase text-mnr-text leading-none">
          КАРТЫ
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowWireModal(true)}
            className="px-4"
          >
            <Zap className="w-4 h-4" />
            Провод
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="px-4"
          >
            <Plus className="w-4 h-4" />
            Создать
          </Button>
        </div>
      </div>

      <div className="flex-1 px-6 pb-24 overflow-y-auto">
        {wireTransfers.length > 0 && (
          <div className="mb-6">
            <div className="text-[12px] text-mnr-muted uppercase tracking-[2px] mb-4 font-bold">
              АКТИВНЫЕ ПРОВОДА
            </div>
            <div className="flex flex-col gap-3">
              {wireTransfers.map((wire) => {
                const fromCard = cards.find((c) => c.id === wire.fromCardId);
                const toCard = cards.find((c) => c.id === wire.toCardId);
                const progress = (wire.transferred / wire.amount) * 100;
                
                return (
                  <div key={wire.id} className="bg-mnr-surface border border-mnr-border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          wire.status === 'active' ? 'bg-green-500 animate-pulse' :
                          wire.status === 'paused' ? 'bg-yellow-500' :
                          wire.status === 'completed' ? 'bg-mnr-accent' :
                          'bg-red-500'
                        }`} />
                        <div className="font-mono text-[14px] text-mnr-text">
                          {fromCard ? `**** ${fromCard.lastFour}` : 'Unknown'} → {toCard ? `**** ${toCard.lastFour}` : 'Unknown'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {wire.status === 'active' && (
                          <button
                            onClick={() => handlePauseWire(wire.id)}
                            className="text-mnr-muted hover:text-mnr-text transition-colors"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {wire.status === 'paused' && (
                          <button
                            onClick={() => handleResumeWire(wire.id)}
                            className="text-mnr-muted hover:text-mnr-text transition-colors"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteWire(wire.id)}
                          className="text-mnr-muted hover:text-mnr-error transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] text-mnr-muted">
                        {new Intl.NumberFormat('ru-RU').format(wire.transferred)} / {new Intl.NumberFormat('ru-RU').format(wire.amount)} МР
                      </span>
                      <span className="text-[12px] text-mnr-muted uppercase">
                        {wire.status}
                      </span>
                    </div>
                    <div className="w-full bg-mnr-bg h-2">
                      <div
                        className="bg-mnr-accent h-full transition-all duration-300"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-mnr-muted">
            <CreditCard className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-sm">У вас нет карт</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {cards.map((card) => {
              const colors = tierColors[card.tier];
              return (
                <div
                  key={card.id}
                  className={`${colors.bg} ${colors.border} border-2 p-4 relative`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className={`font-bold text-[14px] ${colors.text} uppercase tracking-wider`}>
                        {tierNames[card.tier]}
                      </div>
                      <div className={`font-mono text-[16px] ${colors.accent} mt-1`}>
                        **** {card.lastFour}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="text-mnr-muted hover:text-mnr-error transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`font-mono text-[24px] font-bold ${colors.text} mb-3`}>
                    {new Intl.NumberFormat('ru-RU').format(card.balance)} МР
                  </div>

                  <button
                    onClick={() => {
                      setSelectedCard(card);
                      setShowTransferModal(true);
                    }}
                    className="w-full bg-mnr-accent text-black font-bold text-[12px] uppercase py-1.5 px-3 flex items-center justify-center gap-2 hover:bg-mnr-accent/90 transition-colors"
                  >
                    Перевести
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setShowCreateModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-mnr-surface border border-mnr-border p-6 w-full max-w-md">
              <h2 className="text-[20px] font-bold tracking-[-1px] uppercase text-mnr-text leading-none mb-6">
                Создать карту
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-mnr-muted">
                    Уровень карты
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(tierColors) as CardTier[]).map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setSelectedTier(tier)}
                       className={`p-3 border-2 transition-all ${
                           selectedTier === tier
                             ? 'border-mnr-accent bg-mnr-accent/10'
                             : 'border-mnr-border hover:border-mnr-accent/50'
                         }`}
                      >
                        <div className={`font-bold text-[14px] ${tierColors[tier].text} uppercase`}>
                          {tierNames[tier]}
                        </div>
                        <div className={`font-mono text-[12px] ${tierColors[tier].accent} mt-1`}>
                          {TIER_PRICES[tier] === 0 ? 'Бесплатно' : `${TIER_PRICES[tier]} МР`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedTier !== 'standard' && (
                  <div>
                    <label className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-mnr-muted">
                      Оплата с карты
                    </label>
                    <Combobox
                      options={cards.map((card) => ({
                        value: card.id,
                        label: `${tierNames[card.tier]} - **** ${card.lastFour} (${new Intl.NumberFormat('ru-RU').format(card.balance)} МР)`,
                      }))}
                      value={selectedPaymentCard}
                      onChange={setSelectedPaymentCard}
                      placeholder="Выберите карту для оплаты"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={handleCreateCard}
                    className="flex-1"
                  >
                    Создать
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showTransferModal && selectedCard && (
        <>
          <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setShowTransferModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-mnr-surface border border-mnr-border p-6 w-full max-w-md">
              <h2 className="text-[20px] font-bold tracking-[-1px] uppercase text-mnr-text leading-none mb-6">
                Перевод
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-mnr-muted">
                    Направление
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTransferDirection('to-card')}
                       className={`p-3 border-2 transition-all ${
                         transferDirection === 'to-card'
                           ? 'border-mnr-accent bg-mnr-accent/10'
                           : 'border-mnr-border hover:border-mnr-accent/50'
                       }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <ArrowDown className="w-4 h-4" />
                        <span className="font-bold text-[14px] text-mnr-text uppercase">
                          На карту
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => setTransferDirection('to-balance')}
                       className={`p-3 border-2 transition-all ${
                         transferDirection === 'to-balance'
                           ? 'border-mnr-accent bg-mnr-accent/10'
                           : 'border-mnr-border hover:border-mnr-accent/50'
                       }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <ArrowUp className="w-4 h-4" />
                        <span className="font-bold text-[14px] text-mnr-text uppercase">
                          На баланс
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-mnr-muted">
                    Сумма (МР)
                  </label>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-mnr-bg border border-mnr-border px-4 py-3 text-mnr-text font-mono text-xl focus:outline-none focus:border-mnr-accent"
                  />
                </div>

                <div className="p-3 bg-mnr-surface border border-mnr-border">
                  <div className="text-[12px] text-mnr-muted uppercase tracking-widest mb-1">
                    Карта
                  </div>
                  <div className="font-mono text-[14px] text-mnr-text">
                    {tierNames[selectedCard.tier]} - **** {selectedCard.lastFour}
                  </div>
                  <div className="font-mono text-[12px] text-mnr-accent mt-1">
                    Баланс: {new Intl.NumberFormat('ru-RU').format(selectedCard.balance)} МР
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={handleTransfer}
                    className="flex-1"
                  >
                    Перевести
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showWireModal && (
        <>
          <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setShowWireModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-mnr-surface border border-mnr-border p-6 w-full max-w-md">
              <h2 className="text-[20px] font-bold tracking-[-1px] uppercase text-mnr-text leading-none mb-6">
                Создать провод
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-mnr-muted">
                    От карты
                  </label>
                  <Combobox
                    options={cards.map((card) => ({
                      value: card.id,
                      label: `${tierNames[card.tier]} - **** ${card.lastFour} (${new Intl.NumberFormat('ru-RU').format(card.balance)} МР)`,
                    }))}
                    value={selectedFromCard}
                    onChange={setSelectedFromCard}
                    placeholder="Выберите исходную карту"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-mnr-muted">
                    На карту
                  </label>
                  <Combobox
                    options={cards.map((card) => ({
                      value: card.id,
                      label: `${tierNames[card.tier]} - **** ${card.lastFour} (${new Intl.NumberFormat('ru-RU').format(card.balance)} МР)`,
                    }))}
                    value={selectedToCard}
                    onChange={setSelectedToCard}
                    placeholder="Выберите целевую карту"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-mnr-muted">
                    Сумма (МР)
                  </label>
                  <input
                    type="number"
                    value={wireAmount}
                    onChange={(e) => setWireAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-mnr-bg border border-mnr-border px-4 py-3 text-mnr-text font-mono text-xl focus:outline-none focus:border-mnr-accent"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => setShowWireModal(false)}
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={handleCreateWire}
                    className="flex-1"
                  >
                    Создать
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
