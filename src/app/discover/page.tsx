'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  CheckCircle2,
  Star,
  Clock,
  MessageSquare,
  UserPlus,
  Video,
  Globe,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Identicon from '@/components/ui/Identicon';

export default function DiscoverPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [language, setLanguage] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (level) params.set('level', level);
      if (language) params.set('language', language);
      if (verifiedOnly) params.set('verified', 'true');

      const res = await fetch(`/api/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [category, level, language, verifiedOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleConnect = async (targetUserId: string) => {
    try {
      await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      setConnectedIds((prev) => new Set(prev).add(targetUserId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMessage = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (data.conversation?.id) {
        router.push(`/chats?convId=${data.conversation.id}`);
      } else {
        router.push('/chats');
      }
    } catch {
      router.push('/chats');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Инженеры и менторы
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Прямой поиск коллег по никнейму (@никнейм), навыкам и стеку технологий для взаимного обучения.
          </p>
        </div>

        {/* Search input form */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по нику (@svald), навыкам или био..."
            className="w-full bg-[#111114] border border-white/[0.08] focus:border-blue-500/50 rounded-full pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none font-mono"
          />
        </form>
      </div>

      {/* Filter Chips Bar (Drinkit Style Pill Selectors) */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <span className="text-xs font-mono text-zinc-500 flex items-center gap-1 mr-2">
          <Filter className="w-3 h-3" /> Фильтры:
        </span>

        {/* Categories */}
        {[
          { key: '', label: 'Все направления' },
          { key: 'CODING', label: 'Разработка' },
          { key: 'AI_ML', label: 'AI / ML' },
          { key: 'DESIGN', label: 'Дизайн / UI' },
          { key: 'VIDEO_EDITING', label: 'Монтаж' },
          { key: 'DEVOPS', label: 'DevOps' },
          { key: 'MATH', label: 'Computer Science' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`drinkit-pill transition-all ${
              category === key
                ? 'bg-blue-600 text-white border-blue-500'
                : 'text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            {label}
          </button>
        ))}

        <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block" />

        {/* Level */}
        {[
          { key: '', label: 'Любой грейд' },
          { key: 'EXPERT', label: 'Lead / Principal' },
          { key: 'ADVANCED', label: 'Senior' },
          { key: 'INTERMEDIATE', label: 'Middle' },
          { key: 'BEGINNER', label: 'Junior' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setLevel(key)}
            className={`drinkit-pill transition-all ${
              level === key
                ? 'bg-blue-600 text-white border-blue-500'
                : 'text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Peers Grid */}
      {loading ? (
        <div className="py-24 text-center font-mono text-xs text-zinc-500">
          Поиск инженеров по каталогу...
        </div>
      ) : users.length === 0 ? (
        <div className="drinkit-card p-12 text-center space-y-3">
          <p className="text-sm font-mono text-zinc-400">Инженеры по заданным фильтрам не найдены.</p>
          <button
            onClick={() => {
              setSearch('');
              setCategory('');
              setLevel('');
              setLanguage('');
              setVerifiedOnly(false);
            }}
            className="px-4 py-2 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {users.map((peer) => {
            const pName = peer.profile?.name || peer.email?.split('@')[0] || 'Инженер';
            const teaches = peer.userSkills?.filter((s: any) => s.type === 'TEACH') || [];
            const wants = peer.userSkills?.filter((s: any) => s.type === 'LEARN') || [];
            const isConnected = connectedIds.has(peer.id);

            return (
              <div
                key={peer.id}
                className="drinkit-card p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Peer Avatar & Rating */}
                  <div className="flex items-start justify-between">
                    <Link
                      href={`/profile?userId=${peer.id}`}
                      className="flex items-center gap-3 group"
                      title="Перейти в профиль инженера"
                    >
                      <Identicon name={pName} size={44} />
                      <div>
                        <div className="text-sm font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                          @{pName}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                          {peer.profile?.location || 'Remote'} • {peer.profile?.timezone || 'UTC+0'}
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-1 font-mono text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{peer.profile?.rating ?? 5.0}</span>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    {peer.profile?.bio || 'Инженер платформы pixelmink. Готов к бартеру техническими знаниями.'}
                  </p>

                  {/* Can Teach */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider">
                      Обучает:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {teaches.length > 0 ? (
                        teaches.map((ts: any) => (
                          <span
                            key={ts.id}
                            className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          >
                            {ts.skill?.name || ts.name} ({ts.level})
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-600">Не указано</span>
                      )}
                    </div>
                  </div>

                  {/* Wants to Learn */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase text-blue-400 tracking-wider">
                      Изучает:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {wants.length > 0 ? (
                        wants.map((ws: any) => (
                          <span
                            key={ws.id}
                            className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20"
                          >
                            {ws.skill?.name || ws.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-600">Не указано</span>
                      )}
                    </div>
                  </div>

                  {/* Teaching Hours & Languages */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[10px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {peer.profile?.teachingHours ?? 0} ч сессий
                    </span>
                    <span className="flex items-center gap-1 truncate max-w-[140px]">
                      <Globe className="w-3 h-3 text-zinc-500" />
                      {peer.profile?.languages || 'English, Russian'}
                    </span>
                  </div>
                </div>

                {/* Actions: Connect, Message, Call */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06]">
                  <button
                    onClick={() => handleConnect(peer.id)}
                    disabled={isConnected}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono tap-active transition-all flex items-center justify-center gap-1 border ${
                      isConnected
                        ? 'bg-zinc-800 text-zinc-500 border-transparent cursor-default'
                        : 'bg-[#18181f] hover:bg-zinc-800 text-zinc-200 border-white/[0.08]'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{isConnected ? 'Запрошен' : 'Обмен'}</span>
                  </button>

                  <button
                    onClick={() => handleMessage(peer.id)}
                    className="py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium tap-active transition-all flex items-center justify-center gap-1 shadow-md shadow-blue-600/20"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Чат</span>
                  </button>

                  <button
                    onClick={() => {
                      const roomId = `room-${peer.id.slice(0, 8)}-${Date.now().toString(36)}`;
                      router.push(`/calls/${roomId}`);
                    }}
                    className="py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono tap-active transition-all flex items-center justify-center gap-1"
                  >
                    <Video className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Созвон</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
