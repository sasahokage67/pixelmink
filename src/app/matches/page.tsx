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
  Calendar,
  Clock,
  CheckCircle2,
  X,
  Send,
  ArrowRight,
  TrendingUp,
  Search,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Identicon from '@/components/ui/Identicon';

export default function MatchesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestTeacherId = searchParams.get('requestTeacherId');
  const { user } = useAuth();

  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Nickname search state for direct match & chat
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

  useEffect(() => {
    async function loadMatches() {
      try {
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
    }
    loadMatches();
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

  const handleStartDirectCall = (targetUserId: string) => {
    const roomId = `room-${targetUserId.slice(0, 8)}-${Date.now().toString(36)}`;
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

  const directMatches = matches.filter((m) => m.matchType !== 'CIRCULAR_CHAIN');
  const chainMatches = matches.filter((m) => m.matchType === 'CIRCULAR_CHAIN');

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Алгоритм бартера знаний • pixelmink match
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Мэтчи и цепочки обмена
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Прямой и циклический обмен знаниями между инженерами без фиатных денег.
          </p>
        </div>
      </div>

      {/* QUICK NICKNAME SEARCH & MATCH SECTION */}
      <section className="drinkit-card p-6 border-blue-500/20 bg-blue-950/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" />
              <span>Поиск и мэтч по никнейму</span>
            </h2>
            <p className="text-xs font-mono text-zinc-400 mt-0.5">
              Найдите коллегу по его никнейму (@handle), чтобы сразу предложить обмен, написать или созвониться
            </p>
          </div>
        </div>

        <form onSubmit={handleNicknameSearch} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-500">@</span>
            <input
              type="text"
              value={nicknameQuery}
              onChange={(e) => setNicknameQuery(e.target.value)}
              placeholder="никнейм (например: svald, alex, dev)..."
              className="w-full bg-[#121217] border border-white/[0.1] focus:border-blue-500 rounded-xl pl-8 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={searchingNickname}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 shrink-0"
          >
            {searchingNickname ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Найти</span>
          </button>
        </form>

        {/* Search Results Display */}
        {hasSearchedNickname && (
          <div className="pt-2 border-t border-white/[0.08] space-y-3">
            {searchingNickname ? (
              <div className="py-6 text-center text-xs font-mono text-zinc-500 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Поиск инженера...</span>
              </div>
            ) : nicknameResults.length === 0 ? (
              <div className="py-4 text-center text-xs font-mono text-zinc-400">
                Пользователь с никнеймом «{nicknameQuery}» не найден. Проверьте правильность написания.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nicknameResults.map((peer) => {
                  const pName = peer.profile?.name || peer.email?.split('@')[0] || 'Инженер';
                  const teachSkills = peer.userSkills?.filter((s: any) => s.type === 'TEACH') || [];
                  const learnSkills = peer.userSkills?.filter((s: any) => s.type === 'LEARN') || [];

                  return (
                    <div
                      key={peer.id}
                      className="p-4 rounded-xl bg-[#14141b] border border-white/[0.08] space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <Link
                            href={`/profile?userId=${peer.id}`}
                            className="flex items-center gap-3 group"
                          >
                            <Identicon name={pName} size={40} />
                            <div>
                              <div className="text-sm font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                                @{pName}
                              </div>
                              <div className="text-[10px] font-mono text-zinc-500">
                                ⭐️ {peer.profile?.rating || '5.0'} • {peer.profile?.location || 'Remote'}
                              </div>
                            </div>
                          </Link>

                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Найден
                          </span>
                        </div>

                        {peer.profile?.bio && (
                          <p className="text-xs text-zinc-400 font-sans line-clamp-2">
                            {peer.profile.bio}
                          </p>
                        )}

                        <div className="space-y-1 font-mono text-[11px]">
                          {teachSkills.length > 0 && (
                            <div className="text-zinc-400">
                              Обучает: <span className="text-emerald-400">{teachSkills.map((s: any) => s.skill?.name || s.name).join(', ')}</span>
                            </div>
                          )}
                          {learnSkills.length > 0 && (
                            <div className="text-zinc-400">
                              Изучает: <span className="text-blue-400">{learnSkills.map((s: any) => s.skill?.name || s.name).join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Direct Actions: Match, Chat, Call */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06]">
                        <button
                          onClick={() => handleOpenRequest(peer)}
                          className="py-2 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                          title="Предложить взаимный обмен знаниями"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Обмен</span>
                        </button>

                        <button
                          onClick={() => handleStartDirectChat(peer.id)}
                          className="py-2 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs flex items-center justify-center gap-1 transition-all"
                          title="Написать личное сообщение"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Чат</span>
                        </button>

                        <button
                          onClick={() => handleStartDirectCall(peer.id)}
                          className="py-2 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs flex items-center justify-center gap-1 transition-all"
                          title="Быстрый P2P видеозвонок"
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
        )}
      </section>

      {/* Circular Chains Section (A -> B -> C -> A) */}
      {chainMatches.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Циклические цепочки обмена (A → B → C → A)
            </h2>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Кольцевой бартер
            </span>
          </div>

          <div className="space-y-3">
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
                    className="px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-medium tap-active transition-all"
                  >
                    Начать обмен по цепочке
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Direct 1-on-1 Matches Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Прямые мэтчи (1-на-1)
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
          <div className="drinkit-card p-12 text-center text-zinc-400 font-mono text-xs">
            Мэтчей пока не найдено. Добавьте больше навыков в личном кабинете или воспользуйтесь поиском по никнейму выше!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {directMatches.map((m, idx) => {
              const candidate = m.candidateUser;
              return (
                <div
                  key={candidate?.id || idx}
                  className="drinkit-card p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/profile?userId=${candidate?.id}`}
                        className="flex items-center gap-3 group"
                        title="Перейти в личный кабинет коллеги"
                      >
                        <Identicon name={candidate?.profile?.name || candidate?.email || 'peer'} size={44} />
                        <div>
                          <div className="text-sm font-semibold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                            @{candidate?.profile?.name || candidate?.email?.split('@')[0]}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500">
                            ⭐️ {candidate?.profile?.rating || '5.0'} • {candidate?.profile?.location || 'Remote'}
                          </div>
                        </div>
                      </Link>

                      <div className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
                        {m.score}% СОВМЕСТИМОСТЬ
                      </div>
                    </div>

                    {/* Skill Exchange Summary Box */}
                    <div className="bg-black/40 p-3 rounded-xl border border-white/[0.04] space-y-1.5 text-xs font-mono">
                      <div className="text-zinc-400">
                        Научит вас: <span className="text-emerald-400 font-semibold">{m.skillsOfferedToYou?.join(', ') || 'Domain Skill'}</span>
                      </div>
                      <div className="text-zinc-400">
                        Хочет изучить: <span className="text-blue-400 font-semibold">{m.skillsWantedFromYou?.join(', ') || 'Your Expertise'}</span>
                      </div>
                    </div>

                    {/* Reason List */}
                    <ul className="space-y-1 text-[11px] text-zinc-400">
                      {m.reasons?.map((r: string, rIdx: number) => (
                        <li key={rIdx} className="flex items-start gap-1.5">
                          <span className="text-blue-400 shrink-0">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Description Keywords Matched */}
                    {m.descriptionKeywordsMatched && m.descriptionKeywordsMatched.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-mono text-zinc-500">Пересечение интересов:</span>
                        {m.descriptionKeywordsMatched.map((kw: string) => (
                          <span key={kw} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
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
                      className="flex-1 py-2 px-3 rounded-full bg-[#18181f] hover:bg-zinc-800 text-zinc-200 text-xs font-mono tap-active transition-all flex items-center justify-center gap-1.5 border border-white/[0.08]"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Чат</span>
                    </button>

                    <button
                      onClick={() => handleOpenRequest(candidate)}
                      className="flex-1 py-2 px-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium tap-active transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
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
                  С инженером: @{selectedTeacher.profile?.name}
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
                    className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-sans"
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
                      className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
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
                      className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
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
                    className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
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
                    placeholder="например: Хочу разобрать реализацию алгоритма, профилирование памяти и код-ревью..."
                    className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-sans"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium tap-active transition-all"
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
