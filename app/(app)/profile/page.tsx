'use client';

import { useState, useEffect } from 'react';
import { User, Shield, CreditCard, History, Wallet, Settings, LogOut, Info, Zap } from 'lucide-react';
import { List, ListItem, ListSection } from '@/components/ui/list';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { logoutAction } from '@/lib/actions';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [showAboutDialog, setShowAboutDialog] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/user');
        const data = await res.json();
        setUser(data.user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  if (!user) return null;

  return (
    <div className="flex flex-col h-full font-sans">
      {/* Header Bar */}
      <div className="flex items-end justify-between px-6 pt-8 pb-4">
        <div className="text-[20px] font-bold tracking-[-1px] uppercase text-mnr-text leading-none">
          ПРОФИЛЬ
        </div>
      </div>

      <div className="flex-1 px-6 pb-24 overflow-y-auto">
        {/* User Info Card */}
        <div className="bg-mnr-surface border border-mnr-border p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-mnr-accent rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-black" />
            </div>
            <div>
              <div className="font-mono text-mnr-accent mb-1 text-[12px] uppercase tracking-widest">СТАТУС: АКТИВЕН</div>
              <h2 className="text-[24px] font-bold text-mnr-text mb-1 tracking-tight leading-none">{user.fullName}</h2>
              <p className="text-mnr-muted text-[14px]">@{user.username}</p>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <ListSection title="СЧЕТ" className="mb-6">
          <ListItem icon={<Wallet className="w-5 h-5" />} rightElement={`${new Intl.NumberFormat('ru-RU').format(Math.floor(user.balance))} МР`}>
            Баланс
          </ListItem>
          <ListItem icon={<Zap className="w-5 h-5" />} href="/cards">
            Мои карты
          </ListItem>
          <ListItem icon={<History className="w-5 h-5" />} href="/history">
            История
          </ListItem>
        </ListSection>

        {/* Settings Section */}
        <ListSection title="НАСТРОЙКИ" className="mb-6">
          <ListItem icon={<Shield className="w-5 h-5" />} rightElement="Включен">
            Безопасность
          </ListItem>
          <ListItem icon={<CreditCard className="w-5 h-5" />} rightElement="1 000 000 МР">
            Лимиты
          </ListItem>
          <ListItem icon={<Settings className="w-5 h-5" />}>
            Настройки
          </ListItem>
        </ListSection>

        {/* About Section */}
        <ListSection title="О ПРИЛОЖЕНИИ" className="mb-6">
          <ListItem icon={<Info className="w-5 h-5" />} onClick={() => setShowAboutDialog(true)}>
            О MANNRU
          </ListItem>
          <ListItem icon={<User className="w-5 h-5" />}>
            Версия 1.0.0
          </ListItem>
        </ListSection>

        {/* Logout Button */}
        <form action={logoutAction}>
          <Button variant="danger" className="w-full">
            <LogOut className="w-5 h-5" />
            Завершить сеанс
          </Button>
        </form>
      </div>

      {/* About Mannru Dialog */}
      <Dialog open={showAboutDialog} onClose={() => setShowAboutDialog(false)} title="О MANNRU">
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-mnr-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-black" />
            </div>
            <h3 className="text-[24px] font-bold text-mnr-text mb-2">MANNRU</h3>
            <p className="text-mnr-muted text-[14px]">Ваш надежный финансовый помощник</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-mnr-border">
              <span className="text-mnr-muted">Версия</span>
              <span className="text-mnr-text font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-mnr-border">
              <span className="text-mnr-muted">Сборка</span>
              <span className="text-mnr-text font-mono">2026.04.21</span>
            </div>
            <div className="flex justify-between py-2 border-b border-mnr-border">
              <span className="text-mnr-muted">Платформа</span>
              <span className="text-mnr-text">Next.js 15</span>
            </div>
          </div>

          <div className="pt-4">
            <p className="text-[12px] text-mnr-muted text-center leading-relaxed">
              MANNRU — это современная банковская система для управления финансами. 
              Создавайте карты, совершайте переводы, управляйте проводами и многое другое.
            </p>
          </div>

          <Button
            onClick={() => setShowAboutDialog(false)}
            className="w-full"
          >
            Закрыть
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
