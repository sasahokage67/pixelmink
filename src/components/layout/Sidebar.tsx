'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/ui/Logo';
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
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/matches', label: 'Matches', icon: Users, badge: '🔥' },
  { href: '/chats', label: 'Chats', icon: MessageSquare },
  { href: '/calls', label: 'Calls', icon: Video },
  { href: '/seminars', label: 'Seminars', icon: GraduationCap, badge: 'Live' },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/skills', label: 'My Skills', icon: Layers },
  { href: '/tests', label: 'Proof Tests', icon: Award },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-[#09090b] border-r border-white/[0.08] sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <Logo size={28} />
            <span className="font-mono text-xl font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">
              pixelmink<span className="text-blue-500">.</span>
            </span>
          </Link>
          <div className="font-mono text-[10px] text-zinc-400 tracking-tight mt-1 leading-tight">
            Your skills for theirs.
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[11px]">
          <Zap className="w-3 h-3 text-blue-400" />
          <span>{user?.profile?.xCredits ?? 5} XC</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono transition-all group ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 font-medium border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                />
                <span className="tracking-tight">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                    item.badge === 'Live'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Admin Link */}
        <div className="pt-3 border-t border-white/[0.06] mt-3">
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all ${
              pathname.startsWith('/admin')
                ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-zinc-500" />
            <span>Admin Center</span>
          </Link>
        </div>
      </nav>

      {/* User Footer Card */}
      <div className="p-3 border-t border-white/[0.08] bg-[#0c0c0f]">
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
          <Link href="/profile" className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
              {user?.profile?.avatar ? (
                <img src={user.profile.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-xs font-bold text-blue-400">
                  {user?.profile?.name?.charAt(0) || 'A'}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#09090b]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-white truncate tracking-tight">
                {user?.profile?.name || 'Alex Voronov'}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 truncate">
                {user?.role === 'ADMIN' ? 'Platform Admin' : 'Full-Stack Peer'}
              </div>
            </div>
          </Link>

          <button
            onClick={() => logout()}
            title="Log out"
            className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors rounded"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
