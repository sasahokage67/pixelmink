'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Bell, Search, Video, UserCheck, Globe } from 'lucide-react';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import Identicon from '@/components/ui/Identicon';

export default function TopHeader() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH' });
      setUnreadCount(0);
    } catch {}
  };

  return (
    <header className="h-14 border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between">
      {/* Search Input */}
      <div className="relative w-72 md:w-96">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Поиск по навыкам, темам, коллегам..."
          className="w-full bg-[#111114] border border-white/[0.08] focus:border-blue-500/50 rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none font-sans transition-all"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Landing Page Link */}
        <Link
          href="/"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-mono text-zinc-400 hover:text-white transition-colors"
          title="На главную промо-страницу"
        >
          <Globe className="w-3 h-3 text-zinc-400" />
          <span>Главная</span>
        </Link>

        {/* Trilingual Switcher (RU / KZ / EN) */}
        <LanguageSwitcher />

        {/* User Profile Badge */}
        {user && (
          <Link
            href="/profile"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#141418] hover:bg-[#1a1a20] border border-white/[0.1] text-xs font-mono text-zinc-300 tap-active transition-all"
            title="Перейти в личный кабинет"
          >
            <Identicon name={user?.profile?.name || user.email} size={22} />
            <span className="hidden sm:inline font-semibold">{user?.profile?.name || user.email.split('@')[0]}</span>
          </Link>
        )}

        {/* Start Instant Call Button */}
        <Link
          href="/calls"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium tap-active transition-all shadow-sm shadow-blue-500/20"
        >
          <Video className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Созвон</span>
        </Link>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications && unreadCount > 0) markAllRead();
            }}
            className="relative p-2 rounded-full hover:bg-white/[0.06] text-zinc-400 hover:text-white transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#09090b]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#121217] border border-white/[0.1] rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] mb-2">
                <span className="font-mono text-xs font-semibold text-white">Уведомления</span>
                <span className="font-mono text-[10px] text-blue-400">{notifications.length} всего</span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-zinc-500 text-xs font-mono">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.link || '/dashboard'}
                      onClick={() => setShowNotifications(false)}
                      className="block p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="text-xs font-medium text-zinc-200 tracking-tight">{n.title}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{n.message}</div>
                      <div className="text-[9px] font-mono text-zinc-500 mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
