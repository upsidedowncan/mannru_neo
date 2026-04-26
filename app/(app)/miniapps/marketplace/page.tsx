'use client';

import { useState, useEffect } from 'react';
import { Plus, Download, Trash2, Eye, Check, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FastTransitionLink } from '@/components/fast-transition-link';
import { cn } from '@/lib/utils';

interface MiniAppComponent {
  id: string;
  type: 'button' | 'text' | 'spacer';
  props: Record<string, any>;
  order: number;
}

interface MiniApp {
  id: string;
  name: string;
  description: string;
  authorId: string;
  authorUsername: string;
  components: MiniAppComponent[];
  isPublic: boolean;
  downloads: number;
  createdAt: string;
  updatedAt: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [miniApps, setMiniApps] = useState<MiniApp[]>([]);
  const [myApps, setMyApps] = useState<MiniApp[]>([]);
  const [createdApps, setCreatedApps] = useState<MiniApp[]>([]);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'marketplace' | 'my' | 'created'>('marketplace');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchMiniApps();
  }, [tab]);

  const fetchMiniApps = async () => {
    setLoading(true);
    try {
      // Fetch current user
      const userRes = await fetch('/api/user');
      const userData = await userRes.json();
      if (userData.user) {
        setCurrentUserId(userData.user.id);
      }

      if (tab === 'my') {
        const url = '/api/miniapps?my=true';
        const res = await fetch(url);
        const data = await res.json();
        setMyApps(data.miniApps || []);
      } else if (tab === 'created') {
        const url = '/api/miniapps?created=true';
        const res = await fetch(url);
        const data = await res.json();
        setCreatedApps(data.miniApps || []);
      } else {
        const url = '/api/miniapps';
        const res = await fetch(url);
        const data = await res.json();
        setMiniApps(data.miniApps || []);
      }

      // Fetch installed apps
      const myRes = await fetch('/api/miniapps?my=true');
      const myData = await myRes.json();
      const installed = new Set<string>((myData.miniApps || []).map((app: MiniApp) => app.id));
      setInstalledIds(installed);
    } catch (error) {
      console.error('Failed to fetch miniapps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (id: string) => {
    try {
      const res = await fetch(`/api/miniapps/${id}/install`, { method: 'POST' });
      if (res.ok) {
        setInstalledIds(new Set([...installedIds, id]));
        // Refresh to update download counts
        fetchMiniApps();
      }
    } catch (error) {
      console.error('Failed to install:', error);
    }
  };

  const handleUninstall = async (id: string) => {
    try {
      const res = await fetch(`/api/miniapps/${id}/install`, { method: 'DELETE' });
      if (res.ok) {
        setInstalledIds(new Set([...installedIds].filter((i) => i !== id)));
        if (tab === 'my') {
          fetchMiniApps();
        }
      }
    } catch (error) {
      console.error('Failed to uninstall:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это приложение?')) return;
    
    try {
      const res = await fetch(`/api/miniapps/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMiniApps();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const renderComponentPreview = (component: MiniAppComponent) => {
    switch (component.type) {
      case 'button':
        return (
          <div className="w-full p-2 text-xs font-bold bg-mnr-accent text-black border border-mnr-accent">
            {component.props.label || 'Кнопка'}
          </div>
        );
      case 'text':
        return (
          <div className="text-xs text-mnr-text truncate">
            {component.props.content || 'Текст'}
          </div>
        );
      case 'spacer':
        return <div className="h-2 bg-mnr-border/30" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4 border-b border-mnr-border">
        <div className="text-[20px] font-bold tracking-[-1px] uppercase text-mnr-text">
          МИНИ-ПРИЛОЖЕНИЯ
        </div>
        <FastTransitionLink
          href="/miniapps/create"
          className="flex items-center gap-2 px-4 py-2 bg-mnr-accent text-black border-2 border-mnr-accent font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px]"
        >
          <Plus className="h-5 w-5" />
          Создать
        </FastTransitionLink>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-mnr-border">
        <button
          onClick={() => setTab('marketplace')}
          className={cn(
            'flex-1 py-3 font-bold text-sm transition-all border-b-2',
            tab === 'marketplace'
              ? 'text-mnr-accent border-mnr-accent'
              : 'text-mnr-muted border-transparent hover:text-mnr-text'
          )}
        >
          Маркетплейс
        </button>
        <button
          onClick={() => setTab('my')}
          className={cn(
            'flex-1 py-3 font-bold text-sm transition-all border-b-2',
            tab === 'my'
              ? 'text-mnr-accent border-mnr-accent'
              : 'text-mnr-muted border-transparent hover:text-mnr-text'
          )}
        >
          Установленные
        </button>
        <button
          onClick={() => setTab('created')}
          className={cn(
            'flex-1 py-3 font-bold text-sm transition-all border-b-2',
            tab === 'created'
              ? 'text-mnr-accent border-mnr-accent'
              : 'text-mnr-muted border-transparent hover:text-mnr-text'
          )}
        >
          Созданные
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="text-center py-12 text-mnr-muted">
            <p className="font-bold">Загрузка...</p>
          </div>
        ) : tab === 'marketplace' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {miniApps.length === 0 ? (
              <div className="col-span-full text-center py-12 text-mnr-muted">
                <p className="font-bold">Нет приложений в маркетплейсе</p>
                <p className="text-sm mt-2">Будьте первым, кто создаст приложение!</p>
              </div>
            ) : (
              miniApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-mnr-surface border-2 border-mnr-border p-4 space-y-3 hover:border-mnr-accent transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-mnr-text">{app.name}</h3>
                      <p className="text-xs text-mnr-muted mt-1">@{app.authorUsername}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-mnr-muted">
                      <Download className="h-3 w-3" />
                      {app.downloads}
                    </div>
                  </div>
                  
                  <p className="text-sm text-mnr-muted line-clamp-2">{app.description}</p>
                  
                  {/* Preview */}
                  <div className="bg-[#0c0c0e] border border-mnr-border p-2 space-y-1 max-h-32 overflow-hidden">
                    {app.components.slice(0, 3).map((component) => (
                      <div key={component.id}>{renderComponentPreview(component)}</div>
                    ))}
                    {app.components.length > 3 && (
                      <div className="text-xs text-mnr-muted text-center">
                        +{app.components.length - 3} компонентов
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleInstall(app.id)}
                    disabled={installedIds.has(app.id)}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 p-2 font-bold text-sm transition-all border-2',
                      installedIds.has(app.id)
                        ? 'bg-mnr-surface text-mnr-muted border-mnr-border cursor-not-allowed'
                        : 'bg-mnr-accent text-black border-mnr-accent shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px]'
                    )}
                  >
                    {installedIds.has(app.id) ? (
                      <>
                        <Check className="h-4 w-4" />
                        Установлено
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Установить
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        ) : tab === 'my' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myApps.length === 0 ? (
              <div className="col-span-full text-center py-12 text-mnr-muted">
                <p className="font-bold">У вас нет установленных приложений</p>
                <p className="text-sm mt-2">Установите приложения из маркетплейса</p>
              </div>
            ) : (
              myApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-mnr-surface border-2 border-mnr-border p-4 space-y-3 hover:border-mnr-accent transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-mnr-text">{app.name}</h3>
                      <p className="text-xs text-mnr-muted mt-1">
                        {app.authorId === currentUserId ? 'Создано вами' : `@${app.authorUsername}`}
                      </p>
                    </div>
                    {app.authorId === currentUserId && (
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="p-1 text-mnr-error hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <p className="text-sm text-mnr-muted line-clamp-2">{app.description}</p>
                  
                  <div className="flex gap-2">
                    <FastTransitionLink
                      href={`/miniapps/run/${app.id}`}
                      className="flex-1 flex items-center justify-center gap-2 p-2 bg-mnr-accent text-black border-2 border-mnr-accent font-bold text-sm transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px]"
                    >
                      <Eye className="h-4 w-4" />
                      Запустить
                    </FastTransitionLink>
                    <button
                      onClick={() => handleUninstall(app.id)}
                      className="flex-1 flex items-center justify-center gap-2 p-2 bg-mnr-surface text-mnr-text border-2 border-mnr-border font-bold text-sm hover:border-mnr-error hover:text-mnr-error transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {createdApps.length === 0 ? (
              <div className="col-span-full text-center py-12 text-mnr-muted">
                <p className="font-bold">Вы еще не создали ни одного приложения</p>
                <p className="text-sm mt-2">Создайте свое первое приложение!</p>
              </div>
            ) : (
              createdApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-mnr-surface border-2 border-mnr-border p-4 space-y-3 hover:border-mnr-accent transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-mnr-text">{app.name}</h3>
                      <p className="text-xs text-mnr-muted mt-1">
                        {app.isPublic ? 'Публичное' : 'Приватное'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(app.id)}
                      className="p-1 text-mnr-error hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-mnr-muted line-clamp-2">{app.description}</p>
                  
                  <div className="flex gap-2">
                    <FastTransitionLink
                      href={`/miniapps/create/${app.id}`}
                      className="flex-1 flex items-center justify-center gap-2 p-2 bg-mnr-surface text-mnr-text border-2 border-mnr-border font-bold text-sm hover:border-mnr-accent transition-all"
                    >
                      <Edit className="h-4 w-4" />
                      Редактировать
                    </FastTransitionLink>
                    <FastTransitionLink
                      href={`/miniapps/run/${app.id}`}
                      className="flex-1 flex items-center justify-center gap-2 p-2 bg-mnr-accent text-black border-2 border-mnr-accent font-bold text-sm transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px]"
                    >
                      <Eye className="h-4 w-4" />
                      Запустить
                    </FastTransitionLink>
                  </div>
                  {!installedIds.has(app.id) && (
                    <button
                      onClick={() => handleInstall(app.id)}
                      className="w-full flex items-center justify-center gap-2 p-2 font-bold text-sm transition-all border-2 bg-mnr-surface text-mnr-text border-mnr-border hover:border-mnr-accent"
                    >
                      <Download className="h-4 w-4" />
                      Установить
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
