'use client';

import { useState } from 'react';
import { loginAction, registerAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Terminal } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    try {
      let result;
      if (isLogin) {
        result = await loginAction(formData);
      } else {
        result = await registerAction(formData);
      }
      
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Системная ошибка. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center px-10 py-10 relative overflow-hidden flex-1 h-full font-sans">
      
      <div className="mb-14 border-l-4 border-mnr-accent pl-4">
        <div className="text-mnr-accent font-mono mb-2 track-widest uppercase text-sm">SYS.AUTH</div>
        <h1 className="text-[48px] font-bold leading-none tracking-tight uppercase mb-2 text-mnr-text">Mannru</h1>
        <p className="text-mnr-muted font-medium">Защищенный терминал</p>
      </div>

      <div className="w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="relative w-full">
              <Input name="fullName" placeholder="ФИО или Позывной" required />
            </div>
          )}
          
          <div className="relative w-full">
            <Input name="username" placeholder="ID / Телефон" required />
          </div>
          
          <div className="relative w-full">
            <Input name="password" type="password" placeholder="Пароль" required />
          </div>

          {error && (
            <div className="bg-transparent border border-mnr-error px-4 py-4 text-[14px] text-mnr-error font-medium uppercase tracking-wide">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full mt-6" disabled={loading}>
            <span>{loading ? 'Обработка...' : isLogin ? 'Инициализация' : 'Регистрация'}</span>
            <Terminal className={loading ? "animate-spin" : ""} />
          </Button>
        </form>

        <div className="mt-8 text-sm font-medium border-t border-mnr-border pt-6 flex justify-between">
          <span className="text-mnr-muted">
            {isLogin ? 'Нет кода доступа?' : 'Уже есть доступ?'}
          </span>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-mnr-accent hover:text-[#b3e600] uppercase tracking-wide transition-colors"
          >
            {isLogin ? 'Регистрация' : 'Вход'}
          </button>
        </div>
      </div>
    </div>
  );
}
