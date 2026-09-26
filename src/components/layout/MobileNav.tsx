'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Users, MessageSquare, Video, GraduationCap, User } from 'lucide-react';

const MOBILE_ITEMS = [
  { href: '/dashboard', label: 'Главная', icon: Home },
  { href: '/discover', label: 'Каталог', icon: Compass },
  { href: '/matches', label: 'Мэтчи', icon: Users },
  { href: '/chats', label: 'Чаты', icon: MessageSquare },
  { href: '/calls', label: 'Звонки', icon: Video },
  { href: '/seminars', label: 'Семинары', icon: GraduationCap },
  { href: '/profile', label: 'Профиль', icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#09090b]/95 backdrop-blur-md border-t border-white/[0.08] flex items-center justify-around px-2 z-40">
      {MOBILE_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2 text-[10px] font-mono transition-colors ${
              isActive ? 'text-blue-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
