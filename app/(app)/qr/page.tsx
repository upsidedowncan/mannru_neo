'use client';

import { useState, useEffect } from 'react';
import { Smile, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QRPage() {
  const [emojiCode, setEmojiCode] = useState('');
  const [amount, setAmount] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [receiveCode, setReceiveCode] = useState('');
  const [receiveResult, setReceiveResult] = useState<{ success: boolean; amount?: number; sender?: string; error?: string } | null>(null);

  const handleCreateEmojiCode = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      const res = await fetch('/api/emoji-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      if (res.ok) {
        const data = await res.json();
        setEmojiCode(data.emojiTransfer.code);
        setShowCode(true);
        setAmount('');
      } else {
        const data = await res.json();
        alert(data.error || 'Не удалось создать код');
      }
    } catch (error) {
      console.error('Failed to create emoji code:', error);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(emojiCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReceive = async () => {
    if (!receiveCode) return;

    try {
      const res = await fetch('/api/emoji-transfers/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: receiveCode }),
      });

      const data = await res.json();
      setReceiveResult(data);

      if (res.ok) {
        setReceiveCode('');
      }
    } catch (error) {
      console.error('Failed to receive:', error);
    }
  };

  return (
    <div className="flex flex-col font-sans h-full">
      <div className="flex items-end justify-between px-6 pt-8 pb-4">
        <div className="text-[20px] font-bold tracking-[-1px] uppercase text-mnr-text leading-none">
          EMOJI КОД
        </div>
      </div>

      <div className="flex-1 px-6 pb-24 overflow-y-auto">
        {/* Create Emoji Code Section */}
        <div className="mb-8">
          <div className="text-[12px] text-mnr-muted uppercase tracking-[2px] mb-4 font-bold">
            СОЗДАТЬ КОД
          </div>
          
          {!showCode ? (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-mnr-muted">
                  Сумма (МР)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-mnr-bg border border-mnr-border px-4 py-3 text-mnr-text font-mono text-xl focus:outline-none focus:border-mnr-accent"
                />
              </div>
              
              <Button
                onClick={handleCreateEmojiCode}
                className="w-full"
              >
                <Smile className="w-5 h-5" />
                Создать Emoji код
              </Button>
            </div>
          ) : (
            <div className="bg-mnr-surface border border-mnr-border p-6">
              <div className="text-[12px] text-mnr-muted uppercase tracking-widest mb-4">
                Ваш код для отправки:
              </div>
              
              <div className="bg-mnr-bg border border-mnr-accent p-6 mb-4">
                <div className="text-[48px] text-center tracking-wider">
                  {emojiCode}
                </div>
              </div>
              
              <div className="text-[12px] text-mnr-muted mb-4 text-center">
                Покажите этот код получателю
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={handleCopyCode}
                  className="flex-1"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Скопировано' : 'Копировать'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowCode(false);
                    setEmojiCode('');
                  }}
                  className="flex-1"
                >
                  Новый код
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Receive Section */}
        <div>
          <div className="text-[12px] text-mnr-muted uppercase tracking-[2px] mb-4 font-bold">
            ПОЛУЧИТЬ
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-mnr-muted">
                Введите emoji код
              </label>
              <input
                type="text"
                value={receiveCode}
                onChange={(e) => setReceiveCode(e.target.value)}
                placeholder="�💎�⚡🎯"
                className="w-full bg-mnr-bg border border-mnr-border px-4 py-3 text-mnr-text font-mono text-2xl focus:outline-none focus:border-mnr-accent"
              />
            </div>
            
            <Button
              onClick={handleReceive}
              className="w-full"
            >
              <Smile className="w-5 h-5" />
              Получить
            </Button>
            
            {receiveResult && (
              <div className={`p-4 border-2 ${
                receiveResult.success 
                  ? 'border-green-600 bg-green-900/20' 
                  : 'border-red-600 bg-red-900/20'
              }`}>
                {receiveResult.success ? (
                  <div className="text-center">
                    <div className="text-[16px] font-bold text-green-100 mb-2">
                      Получено!
                    </div>
                    <div className="text-[24px] font-mono text-green-100">
                      {new Intl.NumberFormat('ru-RU').format(receiveResult.amount || 0)} МР
                    </div>
                    <div className="text-[12px] text-green-200 mt-2">
                      От: {receiveResult.sender}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-red-100">
                    {receiveResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
