import { BottomNav } from '@/components/bottom-nav';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ToastProvider } from '@/components/toast';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.userId) {
    redirect('/login');
  }

  return (
    <ToastProvider>
      <main className="flex-1 pb-24 md:pl-24 lg:pl-72 h-full overflow-y-auto custom-scrollbar">
        {children}
      </main>
      <BottomNav />
    </ToastProvider>
  );
}
