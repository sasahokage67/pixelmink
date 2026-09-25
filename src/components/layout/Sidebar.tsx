'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/ui/Logo';
import Identicon from '@/components/ui/Identicon';
import {
  Home,
  Compass,
  Users,
  MessageSquare,
  Video,
  GraduationCap,
  TrendingUp,
  Award,
  Layers,
  Calendar,
  ShieldAlert,
  LogOut,
  Zap,
  Globe,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/matches', label: 'Matches', icon: Users },
  { href: '/chats', label: 'Chats', icon: MessageSquare },
  { href: '/calls', label: 'Calls', icon: Video },
  { href: '/seminars', label: 'Seminars', icon: GraduationCap },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/skills', label: 'My Skills', icon: Layers },
  { href: '/tests', label: 'Proof Tests', icon: Award },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-[#09090b] border-r border-white/[0.08] sticky top-0 shrink-0 select-none z-30 font-mono">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <Logo size={24} />
            <span className="font-heading text-sm text-white group-hover:text-blue-400 transition-colors">
              pixelmink
            </span>
          </Link>
          <div className="text-[10px] text-zinc-500 mt-1 leading-tight">
            Your skills for theirs
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px]">
          <Zap className="w-3 h-3 text-blue-400" />
          <span>{user?.profile?.xCredits ?? 5} XC</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded text-xs transition-all group ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-3.5 h-3.5 transition-colors ${
                    isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}

        {/* Public & Admin Links */}
        <div className="pt-2 border-t border-white/[0.06] mt-2 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded text-xs transition-all text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
          >
            <Globe className="w-3.5 h-3.5 text-zinc-500" />
            <span>Public Landing</span>
          </Link>

          <Link
            href="/admin"
            className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs transition-all ${
              pathname.startsWith('/admin')
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
            <span>Admin Center</span>
          </Link>
        </div>
      </nav>

      {/* User Footer Card with GitHub Identicon */}
      <div className="p-3 border-t border-white/[0.08] bg-[#0c0c0f]">
        <div className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.03] transition-colors">
          <Link href="/profile" className="flex items-center gap-2.5 min-w-0 flex-1">
            <Identicon name={user?.profile?.name || user?.email || 'me'} size={28} />
            <div className="min-w-0">
              <div className="text-xs text-white truncate">
                {user?.profile?.name || 'Alex'}
              </div>
              <div className="text-[10px] text-zinc-500 truncate">
                {user?.email || 'alex@xchange.dev'}
              </div>
            </div>
          </Link>

          <button
            onClick={() => logout()}
            title="Log out"
            className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors rounded"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
