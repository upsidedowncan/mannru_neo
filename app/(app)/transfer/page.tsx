'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Terminal } from 'lucide-react';
import { transferActionWrapper } from '@/lib/actions';

export default function TransferPage() {
  return (
    <div className="flex flex-col h-full font-sans">
      <div className="flex items-end justify-between px-6 pt-8 pb-4">
        <div className="text-[20px] font-bold tracking-[-1px] uppercase text-mnr-text leading-none">
          ПЕРЕВОД
        </div>
      </div>

      <div className="p-6">
        <TransferForm />
      </div>
      
      <div className="flex-1" />
    </div>
  );
}

function TransferForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await transferActionWrapper(formData);
      if (res?.error) setError(res.error);
    } catch (err) {
      setError('Системная ошибка. Перевод отклонен.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-mnr-muted">ID получателя</label>
        <div className="relative">
          <Input name="recipientUsername" placeholder="Например, ivan123" required />
        </div>
      </div>
      
      <div>
        <label className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-mnr-muted">Сумма (МР)</label>
        <div className="relative">
          <Input name="amount" type="number" min="1" step="0.01" className="font-mono text-xl" placeholder="0.00" required />
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-mnr-accent font-bold">
            МР
          </div>
        </div>
      </div>
      
      <div>
        <label className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-mnr-muted">Назначение</label>
        <Input name="description" placeholder="Ланч, подарок и т.д." />
      </div>

      {error && (
        <div className="bg-transparent border border-mnr-error px-4 py-4 text-[14px] text-mnr-error font-medium uppercase tracking-wide">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full mt-6" disabled={loading}>
        <span>{loading ? 'Обработка...' : 'Отправить'}</span>
        <Terminal className={loading ? "animate-spin" : ""} />
      </Button>
    </form>
  )
}
