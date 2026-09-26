'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Sparkles,
  Users,
  Repeat,
  Video,
  MessageSquare,
  Search,
  Loader2,
  RefreshCw,
  Filter,
  CheckCircle2,
  X,
  Send,
  Star,
  Clock,
  Award,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import Identicon from '@/components/ui/Identicon';

const CATEGORIES = [
  { id: '', label: 'Все сферы' },
  { id: 'CODING', label: 'Разработка (Backend/Web)' },
  { id: 'AI_ML', label: 'AI & Data Science' },
  { id: 'DEVOPS', label: 'DevOps & Infra' },
  { id: 'DESIGN', label: 'UI/UX & Product' },
  { id: 'COMPUTER_SCIENCE', label: 'CS & Algorithms' },
  { id: 'MATH', label: 'Math & Cryptography' },
  { id: 'VIDEO_EDITING', label: 'Media & Motion' },
];

const LEVELS = [
  { id: '', label: 'Любой грейд' },
  { id: 'BEGINNER', label: 'Junior / Beginner' },
  { id: 'INTERMEDIATE', label: 'Middle' },
  { id: 'ADVANCED', label: 'Senior' },
  { id: 'EXPERT', label: 'Lead / Expert' },
];

export default function MatchesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestTeacherId = searchParams.get('requestTeacherId');
  const { user } = useAuth();
  const { socket } = useSocket();

  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab state: 'all_users' | 'reciprocal' | 'chains'
  const [activeTab, setActiveTab] = useState<'all_users' | 'reciprocal' | 'chains'>('all_users');

  // All Users catalog state (synced globally across devices)
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allUsersLoading, setAllUsersLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filter states for all users
  const [userFilterCategory, setUserFilterCategory] = useState('');
  const [userFilterLevel, setUserFilterLevel] = useState('');
  const [userFilterSearch, setUserFilterSearch] = useState('');

  // Nickname search state for quick match & chat
  const [nicknameQuery, setNicknameQuery] = useState('');
  const [nicknameResults, setNicknameResults] = useState<any[]>([]);
  const [searchingNickname, setSearchingNickname] = useState(false);
  const [hasSearchedNickname, setHasSearchedNickname] = useState(false);

  // Modal for Request Session
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [sessionTitle, setSessionTitle] = useState('1-на-1 обмен техническими знаниями');
  const [duration, setDuration] = useState('60');
  const [format, setFormat] = useState('VIDEO');
  const [proposedDate, setProposedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadMatches = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/matches');
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);

        if (requestTeacherId && data.matches) {
          const found = data.matches.find((m: any) => m.candidateUser?.id === requestTeacherId);
          if (found) {
            setSelectedTeacher(found.candidateUser);
            setIsModalOpen(true);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async (force = false) => {
    try {
      setAllUsersLoading(true);
      const res = await fetch(`/api/users${force ? '?force=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAllUsersLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await fetch('/api/sync', { method: 'POST' }).catch(() => {});
      await Promise.all([loadMatches(), loadAllUsers(true)]);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadMatches();
    loadAllUsers();
  }, [requestTeacherId, user]);

  const handleNicknameSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = nicknameQuery.trim().replace(/^@/, '');
    if (!q) {
      setNicknameResults([]);
      setHasSearchedNickname(false);
      return;
    }

    setSearchingNickname(true);
    setHasSearchedNickname(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setNicknameResults(data.users || []);
      } else {
        setNicknameResults([]);
      }
    } catch (err) {
      console.error(err);
      setNicknameResults([]);
    } finally {
      setSearchingNickname(false);
    }
  };

  const handleStartDirectChat = async (targetUserId: string) => {
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

  const handleStartDirectCall = async (targetUserId: string) => {
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

  const handleOpenRequest = (peer: any) => {
    setSelectedTeacher(peer);
    setIsModalOpen(true);
    setSuccessMessage('');
  };

  const handleSendSessionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    setIsSubmitting(true);

    try {
      const teachSkill = selectedTeacher.userSkills?.find((s: any) => s.type === 'TEACH');
      const skillId = teachSkill?.skillId || 'default_skill_id';

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacher.id,
          skillId,
          title: sessionTitle,
          scheduledAt: proposedDate || new Date(Date.now() + 3600000 * 24).toISOString(),
          duration,
          format,
          notes,
        }),
      });

      if (res.ok) {
        setSuccessMessage('✓ Запрос на сессию отправлен! Коллега получил уведомление.');
        setTimeout(() => {
          setIsModalOpen(false);
          setSuccessMessage('');
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered users calculation
  const filteredAllUsers = allUsers.filter((peer) => {
    // 1. Text search (nickname @handle, name, bio, skill names)
    if (userFilterSearch.trim()) {
      const q = userFilterSearch.toLowerCase().trim().replace(/^@/, '');
      const pName = (peer.profile?.name || '').toLowerCase();
      const email = (peer.email || '').toLowerCase();
      const bio = (peer.profile?.bio || '').toLowerCase();
      const location = (peer.profile?.location || '').toLowerCase();
      const skillsStr = (peer.userSkills || [])
        .map(
          (s: any) =>
            `${s.skill?.name || s.name || ''} ${s.skill?.category || s.category || ''}`
        )
        .join(' ')
        .toLowerCase();

      const matched =
        pName.includes(q) ||
        email.includes(q) ||
        bio.includes(q) ||
        location.includes(q) ||
        skillsStr.includes(q);

      if (!matched) return false;
    }

    // 2. Category filter
    if (userFilterCategory) {
      const targetCat = userFilterCategory.toUpperCase();
      const hasCat = (peer.userSkills || []).some((s: any) => {
        const cat = (s.skill?.category || s.category || '').toUpperCase();
        return cat === targetCat || cat.includes(targetCat);
      });
      if (!hasCat) return false;
    }

    // 3. Level filter
    if (userFilterLevel) {
      const targetLvl = userFilterLevel.toUpperCase();
      const hasLvl = (peer.userSkills || []).some((s: any) => {
        const lvl = (s.level || '').toUpperCase();
        return lvl === targetLvl || lvl.includes(targetLvl);
      });
      if (!hasLvl) return false;
    }

    return true;
  });

  const directMatches = matches.filter((m) => m.matchType !== 'CIRCULAR_CHAIN');
  const chainMatches = matches.filter((m) => m.matchType === 'CIRCULAR_CHAIN');

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Каталог инженеров & Бартер знаний
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Мэтчи и инженеры платформы
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Синхронизированный пул разработчиков, прямой бартер знаний и цепочки обмена.
          </p>
        </div>

        {/* Global Sync Trigger Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/[0.1] text-zinc-200 font-mono text-xs transition-all shadow-sm disabled:opacity-60"
            title="Синхронизировать пользователей со всеми устройствами сети"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Синхронизация...' : 'Синхронизировать с сетью'}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex border-b border-white/[0.08] gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('all_users')}
          className={`pb-3 px-4 text-xs font-mono font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'all_users'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span>Все инженеры платформы</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {allUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('reciprocal')}
          className={`pb-3 px-4 text-xs font-mono font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'reciprocal'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Взаимные мэтчи</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
            {directMatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('chains')}
          className={`pb-3 px-4 text-xs font-mono font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'chains'
              ? 'border-purple-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Repeat className="w-3.5 h-3.5 text-purple-400" />
          <span>Цепочки (A → B → C)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/10 text-purple-300">
            {chainMatches.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ALL PLATFORM USERS WITH FILTERS */}
      {activeTab === 'all_users' && (
        <section className="space-y-6 animate-in fade-in">
          {/* Quick Nickname Lookup Bar */}
          <div className="drinkit-card p-5 border-blue-500/20 bg-blue-950/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5 font-mono">
                <Search className="w-3.5 h-3.5 text-blue-400" />
                <span>Быстрый поиск по @handle или никнейму</span>
              </h2>
              <span className="text-[10px] font-mono text-zinc-400">
                Мгновенный переход к чату или созвону
              </span>
            </div>

            <form onSubmit={handleNicknameSearch} className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-500">
                  @
                </span>
                <input
                  type="text"
                  value={nicknameQuery}
                  onChange={(e) => setNicknameQuery(e.target.value)}
                  placeholder="никнейм коллеги (например: svald, alex, dev)..."
                  className="w-full bg-[#121217] border border-white/[0.1] focus:border-blue-500 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-zinc-500 outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={searchingNickname}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 shrink-0"
              >
                {searchingNickname ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Найти</span>
              </button>
            </form>

            {hasSearchedNickname && (
              <div className="pt-2 border-t border-white/[0.08]">
                {searchingNickname ? (
                  <div className="py-3 text-center text-xs font-mono text-zinc-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span>Поиск...</span>
                  </div>
                ) : nicknameResults.length === 0 ? (
                  <div className="py-2 text-center text-xs font-mono text-zinc-400">
                    Пользователь с никнеймом «{nicknameQuery}» не найден.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {nicknameResults.map((peer) => {
                      const pName = peer.profile?.name || peer.email?.split('@')[0] || 'Инженер';
                      return (
                        <div
                          key={peer.id}
                          className="p-3.5 rounded-xl bg-[#14141b] border border-white/[0.08] flex items-center justify-between gap-3"
                        >
                          <Link
                            href={`/profile?userId=${peer.id}`}
                            className="flex items-center gap-2.5 min-w-0"
                          >
                            <Identicon name={pName} size={32} />
                            <div className="truncate">
                              <div className="text-xs font-bold text-white truncate">@{pName}</div>
                              <div className="text-[10px] font-mono text-zinc-400">
                                ⭐️ {peer.profile?.rating ?? '5.0'} • {peer.profile?.location || 'Remote'}
                              </div>
                            </div>
                          </Link>

                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => handleOpenRequest(peer)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-[11px] font-semibold"
                            >
                              Обмен
                            </button>
                            <button
                              onClick={() => handleStartDirectChat(peer.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-[11px]"
                            >
                              Чат
                            </button>
                            <button
                              onClick={() => handleStartDirectCall(peer.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-[11px]"
                            >
                              Созвон
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Directory Filters Bar */}
          <div className="drinkit-card p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Live search input */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userFilterSearch}
                  onChange={(e) => setUserFilterSearch(e.target.value)}
                  placeholder="Фильтр по никнейму, навыку, локации (например: Rust, Python, React)..."
                  className="w-full bg-[#121217] border border-white/[0.08] focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none font-mono"
                />
                {userFilterSearch && (
                  <button
                    onClick={() => setUserFilterSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Grade / Level filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <select
                  value={userFilterLevel}
                  onChange={(e) => setUserFilterLevel(e.target.value)}
                  className="bg-[#121217] border border-white/[0.08] focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none font-mono"
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.label}
                    </option>
                  ))}
                </select>

                {(userFilterCategory || userFilterLevel || userFilterSearch) && (
                  <button
                    onClick={() => {
                      setUserFilterCategory('');
                      setUserFilterLevel('');
                      setUserFilterSearch('');
                    }}
                    className="text-xs font-mono text-zinc-400 hover:text-white underline shrink-0 px-2"
                  >
                    Сбросить
                  </button>
                )}
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/[0.06]">
              {CATEGORIES.map((cat) => {
                const isActive = userFilterCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setUserFilterCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg font-mono text-xs transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                        : 'bg-[#14141b] text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a24] border border-white/[0.04]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
              <span>
                Отображено: <strong className="text-zinc-300">{filteredAllUsers.length}</strong> из{' '}
                <strong className="text-zinc-300">{allUsers.length}</strong> инженеров платформы
              </span>
              <span className="text-[10px] text-zinc-500">
                Синхронизировано между ноутбуками
              </span>
            </div>
          </div>

          {/* Users Grid */}
          {allUsersLoading ? (
            <div className="py-20 text-center font-mono text-xs text-zinc-500 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span>Загрузка каталога инженеров и синхронизация базы...</span>
            </div>
          ) : filteredAllUsers.length === 0 ? (
            <div className="drinkit-card p-12 text-center text-zinc-400 font-mono text-xs space-y-3">
              <div>Инженеры по заданным параметрам поиска не найдены.</div>
              <button
                onClick={() => {
                  setUserFilterCategory('');
                  setUserFilterLevel('');
                  setUserFilterSearch('');
                }}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono"
              >
                Сбросить все фильтры
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAllUsers.map((peer) => {
                const pName = peer.profile?.name || peer.email?.split('@')[0] || 'Инженер';
                const teachSkills = peer.userSkills?.filter((s: any) => s.type === 'TEACH') || [];
                const learnSkills = peer.userSkills?.filter((s: any) => s.type === 'LEARN') || [];
                const isCurrentUser = user && peer.id === user.id;

                return (
                  <div
                    key={peer.id}
                    className="drinkit-card p-5 flex flex-col justify-between space-y-4 hover:border-white/[0.16] transition-all bg-[#0d0d12]"
                  >
                    <div className="space-y-3">
                      {/* Peer Card Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/profile?userId=${peer.id}`}
                          className="flex items-center gap-3 group min-w-0"
                        >
                          <Identicon name={pName} size={42} />
                          <div className="truncate">
                            <div className="text-sm font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors flex items-center gap-1.5 truncate">
                              <span>@{pName}</span>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-mono text-[9px]">
                                  Вы
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-0.5 text-amber-400">
                                <Star className="w-2.5 h-2.5 fill-amber-400" />
                                {peer.profile?.rating ?? '5.0'}
                              </span>
                              <span>•</span>
                              <span className="truncate">{peer.profile?.location || 'Remote'}</span>
                            </div>
                          </div>
                        </Link>

                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.06] shrink-0">
                          {peer.profile?.xCredits ?? 5} XC
                        </span>
                      </div>

                      {/* Bio */}
                      <p className="text-xs text-zinc-400 font-sans line-clamp-2 leading-relaxed min-h-[2.5rem]">
                        {peer.profile?.bio ||
                          'Инженер платформы pixelmink. Готов к бартеру техническими знаниями и парному кодингу.'}
                      </p>

                      {/* Skills Section */}
                      <div className="space-y-2 pt-2 border-t border-white/[0.04] text-[11px] font-mono">
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                            <span>Обучает (Teach)</span>
                            <span className="text-emerald-400 font-bold">{teachSkills.length}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {teachSkills.length > 0 ? (
                              teachSkills.slice(0, 4).map((s: any, idx: number) => (
                                <span
                                  key={s.id || idx}
                                  className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px]"
                                >
                                  {s.skill?.name || s.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-zinc-600">Навыки не указаны</span>
                            )}
                            {teachSkills.length > 4 && (
                              <span className="text-[10px] text-zinc-500">
                                +{teachSkills.length - 4}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                            <span>Изучает (Learn)</span>
                            <span className="text-blue-400 font-bold">{learnSkills.length}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {learnSkills.length > 0 ? (
                              learnSkills.slice(0, 4).map((s: any, idx: number) => (
                                <span
                                  key={s.id || idx}
                                  className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px]"
                                >
                                  {s.skill?.name || s.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-zinc-600">Цели не указаны</span>
                            )}
                            {learnSkills.length > 4 && (
                              <span className="text-[10px] text-zinc-500">
                                +{learnSkills.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.06]">
                      <button
                        onClick={() => handleOpenRequest(peer)}
                        className="py-2 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1 transition-all shadow-md shadow-blue-600/20"
                        title="Предложить взаимный обмен знаниями"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Обмен</span>
                      </button>

                      <button
                        onClick={() => handleStartDirectChat(peer.id)}
                        className="py-2 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-mono text-xs flex items-center justify-center gap-1 transition-all border border-white/[0.08]"
                        title="Написать в чат"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Чат</span>
                      </button>

                      <button
                        onClick={() => handleStartDirectCall(peer.id)}
                        className="py-2 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-mono text-xs flex items-center justify-center gap-1 transition-all border border-white/[0.08]"
                        title="Быстрый P2P созвон"
                      >
                        <Video className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Звонок</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: RECIPROCAL MATCHES (DIRECT 1-ON-1) */}
      {activeTab === 'reciprocal' && (
        <section className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Прямые взаимные мэтчи (1-на-1)
              </h2>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {directMatches.length} найдено
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center font-mono text-xs text-zinc-500">
              Расчет алгоритмической совместимости и взаимных навыков...
            </div>
          ) : directMatches.length === 0 ? (
            <div className="drinkit-card p-12 text-center text-zinc-400 font-mono text-xs space-y-3">
              <div>
                Взаимных мэтчей пока не найдено. Добавьте больше навыков в личном кабинете или
                выберите инженера из вкладки «Все инженеры платформы»!
              </div>
              <button
                onClick={() => setActiveTab('all_users')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all"
              >
                Открыть всех инженеров
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {directMatches.map((m, idx) => {
                const candidate = m.candidateUser;
                const pName = candidate?.profile?.name || candidate?.email?.split('@')[0] || 'Инженер';
                return (
                  <div
                    key={candidate?.id || idx}
                    className="drinkit-card p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-4">
                      {/* Top bar with match score */}
                      <div className="flex items-start justify-between">
                        <Link
                          href={`/profile?userId=${candidate?.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <Identicon name={pName} size={44} />
                          <div>
                            <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                              @{pName}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500">
                              ⭐️ {candidate?.profile?.rating ?? '5.0'} •{' '}
                              {candidate?.profile?.location || 'Remote'}
                            </div>
                          </div>
                        </Link>

                        <div className="font-mono text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                          {m.score}% совместимость
                        </div>
                      </div>

                      {/* Reasons */}
                      {m.reasons && m.reasons.length > 0 && (
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                            Точки пересечения:
                          </span>
                          <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                            {m.reasons[0]}
                          </p>
                        </div>
                      )}

                      {/* Matching keywords */}
                      {m.matchingKeywords && m.matchingKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {m.matchingKeywords.map((kw: string) => (
                            <span
                              key={kw}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
                      <button
                        onClick={() => handleStartDirectChat(candidate?.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#18181f] hover:bg-zinc-800 text-zinc-200 text-xs font-mono transition-all flex items-center justify-center gap-1.5 border border-white/[0.08]"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Чат</span>
                      </button>

                      <button
                        onClick={() => handleOpenRequest(candidate)}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Предложить обмен</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: CIRCULAR CHAINS (A -> B -> C -> A) */}
      {activeTab === 'chains' && (
        <section className="space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Циклические цепочки обмена (A → B → C → A)
            </h2>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Кольцевой бартер
            </span>
          </div>

          {chainMatches.length === 0 ? (
            <div className="drinkit-card p-12 text-center text-zinc-400 font-mono text-xs space-y-3">
              <div>
                В данный момент нет замкнутых кольцевых цепочек. Они формируются автоматически при
                наличии 3+ инженеров с взаимно дополняющимися потребностями.
              </div>
              <button
                onClick={() => setActiveTab('all_users')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all"
              >
                Посмотреть всех инженеров
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {chainMatches.map((chain, idx) => (
                <div
                  key={idx}
                  className="drinkit-card p-6 border-purple-500/30 bg-purple-950/10 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <span className="font-mono text-xs uppercase text-purple-400 font-bold">
                        Тройной замкнутый обмен
                      </span>
                      <div className="text-sm font-semibold text-white mt-1">
                        {chain.chainDetails?.exchangeFlow}
                      </div>
                    </div>
                    <div className="font-mono text-xs text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                      {chain.score}% синергия цикла
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {chain.reasons?.[0]}
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleOpenRequest(chain.candidateUser)}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-purple-600/20"
                    >
                      Начать обмен по цепочке
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Session Request Modal */}
      {isModalOpen && selectedTeacher && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#121217] border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Предложение сессии обмена знаниями
                </h3>
                <p className="text-xs font-mono text-zinc-400 mt-0.5">
                  С инженером: @{selectedTeacher.profile?.name || selectedTeacher.email?.split('@')[0]}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {successMessage ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono text-center">
                {successMessage}
              </div>
            ) : (
              <form onSubmit={handleSendSessionRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Тема сессии / задача
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Длительность
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    >
                      <option value="30">30 мин (0.5 XC)</option>
                      <option value="60">60 мин (1.0 XC)</option>
                      <option value="90">90 мин (1.5 XC)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Формат
                    </label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    >
                      <option value="VIDEO">Видеозвонок + Терминал</option>
                      <option value="AUDIO">Только аудио</option>
                      <option value="CHAT">Чат с кодом</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Предлагаемые дата и время
                  </label>
                  <input
                    type="datetime-local"
                    value={proposedDate}
                    onChange={(e) => setProposedDate(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Вопросы и цели для обсуждения
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="например: Разбор архитектуры, профилирование памяти, код-ревью алгоритма..."
                    className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-sans"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-mono"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-blue-600/20"
                  >
                    {isSubmitting ? 'Отправка...' : 'Отправить запрос'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
