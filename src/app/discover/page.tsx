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
  Lock,
  Ban,
  ShieldAlert,
  Check,
  X,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import Identicon from '@/components/ui/Identicon';

export default function DiscoverPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [language, setLanguage] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Match Gate & Block state
  const [connectedUserIds, setConnectedUserIds] = useState<string[]>([]);
  const [pendingSentIds, setPendingSentIds] = useState<string[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [matchAlert, setMatchAlert] = useState<string | null>(null);

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
        if (data.connectedUserIds) setConnectedUserIds(data.connectedUserIds);
        if (data.pendingSentIds) setPendingSentIds(data.pendingSentIds);
        if (data.blockedUserIds) setBlockedUserIds(data.blockedUserIds);
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
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action: 'request' }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.status === 'ACCEPTED') {
          setConnectedUserIds((prev) => Array.from(new Set([...prev, targetUserId])));
          setPendingSentIds((prev) => prev.filter((id) => id !== targetUserId));
          setMatchAlert('✓ Взаимный мэтч подтвержден! Чат и созвон разблокированы.');
        } else {
          setPendingSentIds((prev) => Array.from(new Set([...prev, targetUserId])));
          setMatchAlert('Запрос на мэтч отправлен инженеру.');
        }
      } else {
        setMatchAlert(data.error || 'Ошибка при отправке запроса');
      }
    } catch (err) {
      console.error(err);
      setMatchAlert('Сетевая ошибка при отправке запроса');
    }
  };

  const handleToggleBlock = async (targetUserId: string) => {
    const isCurrentlyBlocked = blockedUserIds.includes(targetUserId);
    const action = isCurrentlyBlocked ? 'unblock' : 'block';
    try {
      const res = await fetch('/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action }),
      });
      if (res.ok) {
        if (isCurrentlyBlocked) {
          setBlockedUserIds((prev) => prev.filter((id) => id !== targetUserId));
          setMatchAlert('Пользователь разблокирован.');
        } else {
          setBlockedUserIds((prev) => [...prev, targetUserId]);
          setConnectedUserIds((prev) => prev.filter((id) => id !== targetUserId));
          setPendingSentIds((prev) => prev.filter((id) => id !== targetUserId));
          setMatchAlert('Пользователь заблокирован.');
        }
        await fetchUsers();
      }
    } catch {
      setMatchAlert('Ошибка при изменении статуса блокировки');
    }
  };

  const handleMessage = async (targetUserId: string) => {
    if (blockedUserIds.includes(targetUserId)) {
      setMatchAlert('Этот пользователь заблокирован.');
      return;
    }
    if (!connectedUserIds.includes(targetUserId)) {
      setMatchAlert('🔒 Для открытия чата необходим взаимный мэтч! Нажмите «Обмен».');
      return;
    }
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMatchAlert(data.error || 'Требуется взаимный мэтч!');
        return;
      }
      if (data.conversation?.id) {
        router.push(`/chats?convId=${data.conversation.id}`);
      } else {
        router.push('/chats');
      }
    } catch {
      router.push('/chats');
    }
  };

  const handleStartCall = async (targetUserId: string) => {
    if (blockedUserIds.includes(targetUserId)) {
      setMatchAlert('Этот пользователь заблокирован.');
      return;
    }
    if (!connectedUserIds.includes(targetUserId)) {
      setMatchAlert('🔒 Для созвона необходим взаимный подтвержденный мэтч! Нажмите «Обмен».');
      return;
    }
    const roomId = `room-${targetUserId.slice(0, 8)}-${Date.now().toString(36)}`;
    try {
      await fetch('/api/calls/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initiate',
          roomId,
          callerId: user?.id,
          callerName: user?.profile?.name || user?.email?.split('@')[0] || 'Инженер',
          callerAvatar: user?.profile?.avatar,
          receiverId: targetUserId,
          type: 'VIDEO',
        }),
      });

      if (socket) {
        socket.emit('call:initiate', {
          callerId: user?.id,
          callerName: user?.profile?.name || user?.email?.split('@')[0] || 'Инженер',
          callerAvatar: user?.profile?.avatar,
          receiverId: targetUserId,
          roomId,
          type: 'VIDEO',
        });
      }
    } catch (e) {
      console.error('Call initiate error:', e);
    }
    router.push(`/calls/${roomId}`);
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

      {/* Alert Banner */}
      {matchAlert && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs font-mono text-zinc-200 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{matchAlert}</span>
          </div>
          <button onClick={() => setMatchAlert(null)} className="text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
            const isConnected = connectedUserIds.includes(peer.id);
            const isPendingSent = pendingSentIds.includes(peer.id);
            const isBlocked = blockedUserIds.includes(peer.id);
            const isCurrentUser = user && peer.id === user.id;

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

                {/* Actions: Connect / Match, Message, Call, Block */}
                <div className="pt-2 border-t border-white/[0.06]">
                  {isCurrentUser ? (
                    <div className="py-1.5 text-center font-mono text-[11px] text-zinc-500 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                      Ваш профиль
                    </div>
                  ) : isBlocked ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-red-950/20 border border-red-500/30">
                      <span className="text-[11px] font-mono text-red-400 flex items-center gap-1">
                        <Ban className="w-3.5 h-3.5" />
                        <span>Заблокирован</span>
                      </span>
                      <button
                        onClick={() => handleToggleBlock(peer.id)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-[11px]"
                      >
                        Разблокировать
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5">
                      {/* Match button */}
                      {isConnected ? (
                        <div
                          className="py-1.5 px-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold flex items-center justify-center gap-1"
                          title="Взаимный мэтч подтвержден"
                        >
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Мэтч</span>
                        </div>
                      ) : isPendingSent ? (
                        <button
                          disabled
                          className="py-1.5 px-1 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 font-mono text-[11px] cursor-default flex items-center justify-center gap-1"
                          title="Запрос на мэтч отправлен"
                        >
                          <span>⏳ Ждем</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnect(peer.id)}
                          className="py-1.5 px-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium tap-active transition-all flex items-center justify-center gap-1 shadow-md shadow-blue-600/20"
                          title="Запросить взаимный обмен навыками"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Обмен</span>
                        </button>
                      )}

                      {/* Chat Button (Locked if not matched) */}
                      <button
                        onClick={() => handleMessage(peer.id)}
                        className={`py-1.5 px-1 rounded-lg text-xs font-mono font-medium tap-active transition-all flex items-center justify-center gap-1 border ${
                          isConnected
                            ? 'bg-[#18181f] hover:bg-zinc-800 text-zinc-200 border-white/[0.08]'
                            : 'bg-zinc-950/60 hover:bg-zinc-900 text-zinc-500 border-white/[0.04]'
                        }`}
                        title={isConnected ? 'Написать в чат' : 'Необходим взаимный мэтч'}
                      >
                        {isConnected ? (
                          <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                        <span>Чат</span>
                      </button>

                      {/* Call Button (Locked if not matched) */}
                      <button
                        onClick={() => handleStartCall(peer.id)}
                        className={`py-1.5 px-1 rounded-lg text-xs font-mono tap-active transition-all flex items-center justify-center gap-1 border ${
                          isConnected
                            ? 'bg-[#18181f] hover:bg-zinc-800 text-zinc-200 border-white/[0.08]'
                            : 'bg-zinc-950/60 hover:bg-zinc-900 text-zinc-500 border-white/[0.04]'
                        }`}
                        title={isConnected ? 'Быстрый P2P созвон' : 'Необходим взаимный мэтч'}
                      >
                        {isConnected ? (
                          <Video className="w-3.5 h-3.5 text-zinc-400" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                        <span>Звонок</span>
                      </button>

                      {/* Block Button */}
                      <button
                        onClick={() => handleToggleBlock(peer.id)}
                        className="py-1.5 px-1 rounded-lg bg-zinc-950 hover:bg-red-950/40 text-zinc-500 hover:text-red-400 border border-white/[0.04] hover:border-red-500/20 font-mono text-xs flex items-center justify-center transition-all"
                        title="Заблокировать пользователя"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
