'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  ArrowRight,
  MessageSquare,
  Video,
  Calendar,
  GraduationCap,
  Award,
  Zap,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Identicon from '@/components/ui/Identicon';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [seminars, setSeminars] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [mRes, sRes, semRes, pRes] = await Promise.all([
          fetch('/api/matches'),
          fetch('/api/sessions'),
          fetch('/api/seminars'),
          fetch('/api/progress'),
        ]);

        if (mRes.ok) {
          const m = await mRes.json();
          setMatches(m.matches?.slice(0, 3) || []);
        }
        if (sRes.ok) {
          const s = await sRes.json();
          setSessions(s.sessions?.slice(0, 3) || []);
        }
        if (semRes.ok) {
          const sem = await semRes.json();
          setSeminars(sem.seminars?.slice(0, 3) || []);
        }
        if (pRes.ok) {
          const p = await pRes.json();
          setProgressData(p);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [user]);

  const startDirectSession = (teacherId: string) => {
    router.push(`/matches?requestTeacherId=${teacherId}`);
  };

  const startChat = async (targetUserId: string) => {
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

  const userName = user?.profile?.name || user?.email?.split('@')[0] || 'Инженер';

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Рабочее пространство: {userName}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Платформа прямого бартера инженерных знаний • 30/30 мин взаимно
          </p>
        </div>

        {/* Quick Stats Pill Bar */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="drinkit-card px-3 py-2 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <div className="font-mono text-xs">
              <span className="text-zinc-500">Изучено:</span>{' '}
              <span className="text-white font-semibold">
                {user?.profile?.learningHours ?? progressData?.stats?.learningHours ?? 0}ч
              </span>
            </div>
          </div>
          <div className="drinkit-card px-3 py-2 flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            <div className="font-mono text-xs">
              <span className="text-zinc-500">Обучено:</span>{' '}
              <span className="text-white font-semibold">
                {user?.profile?.teachingHours ?? progressData?.stats?.teachingHours ?? 0}ч
              </span>
            </div>
          </div>
          <div className="drinkit-card px-3 py-2 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <div className="font-mono text-xs">
              <span className="text-zinc-500">Формат:</span>{' '}
              <span className="text-blue-400 font-bold">
                Бартер 1-на-1
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Matches (Left 2 cols) & Upcoming Sessions (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Your Matches Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-base font-bold text-white tracking-tight">
                Взаимные мэтчи знаний
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Алгоритм совместимости
              </span>
            </div>
            <Link
              href="/matches"
              className="text-xs font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              <span>Все инженеры ({matches.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.length === 0 ? (
              <div className="col-span-2 drinkit-card p-8 text-center text-zinc-500 font-mono text-xs space-y-2">
                <div>Алгоритмические пары пока рассчитываются.</div>
                <Link
                  href="/matches"
                  className="inline-block text-blue-400 hover:underline pt-1"
                >
                  Перейти в общий каталог инженеров →
                </Link>
              </div>
            ) : (
              matches.map((m, idx) => {
                const candidate = m.candidateUser;
                const pName = candidate?.profile?.name || candidate?.email?.split('@')[0] || 'Инженер';
                return (
                  <div
                    key={candidate?.id || idx}
                    className="drinkit-card p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <Link
                          href={`/profile?userId=${candidate?.id}`}
                          className="flex items-center gap-3 group"
                          title="Перейти в профиль"
                        >
                          <Identicon name={pName} size={40} />
                          <div>
                            <div className="text-xs font-semibold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                              @{pName}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500">
                              ⭐️ {candidate?.profile?.rating || '5.0'} •{' '}
                              {candidate?.profile?.location || 'Remote'}
                            </div>
                          </div>
                        </Link>

                        {/* Match Score Badge */}
                        <div className="text-right">
                          <span
                            className={`font-mono text-xs font-bold border px-2 py-0.5 rounded-full ${
                              m.score >= 80
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                : m.score >= 50
                                ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                                : 'text-zinc-400 bg-zinc-800 border-zinc-700'
                            }`}
                          >
                            {m.score}% Мэтч ролей
                          </span>
                          {m.candidateRole && (
                            <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                              {m.candidateRole}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Exchange Flow */}
                      <div className="space-y-1 text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-white/[0.04]">
                        <div className="text-zinc-400">
                          Обучает:{' '}
                          <span className="text-emerald-400 font-semibold">
                            {m.skillsOfferedToYou?.join(', ') || 'Разработка'}
                          </span>
                        </div>
                        <div className="text-zinc-400">
                          Изучает:{' '}
                          <span className="text-blue-400 font-semibold">
                            {m.skillsWantedFromYou?.join(', ') || 'AI / ML'}
                          </span>
                        </div>
                      </div>

                      {/* Reason */}
                      <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                        {m.reasons?.[0] || 'Двустороннее пересечение компетенций и совместимый часовой пояс.'}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1 border-t border-white/[0.06]">
                      <button
                        onClick={() => startChat(candidate?.id)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-[#18181f] hover:bg-zinc-800 text-zinc-200 text-xs font-mono tap-active transition-all flex items-center justify-center gap-1.5 border border-white/[0.08]"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Чат</span>
                      </button>
                      <button
                        onClick={() => startDirectSession(candidate?.id)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium tap-active transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Обмен</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Upcoming Sessions & Live Calls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-400" />
              Ближайшие сессии
            </span>
            <Link href="/calendar" className="text-xs font-mono text-zinc-400 hover:text-white">
              Календарь
            </Link>
          </div>

          <div className="space-y-3">
            {sessions.length === 0 ? (
              <div className="drinkit-card p-6 text-center text-zinc-500 text-xs font-mono">
                Запланированных сессий нет. Предложите обмен инженеру из каталога!
              </div>
            ) : (
              sessions.map((s) => (
                <div key={s.id} className="drinkit-card p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white tracking-tight">{s.title}</div>
                      <div className="text-[11px] font-mono text-blue-400 mt-0.5">
                        С{' '}
                        {s.teacherId === user?.id
                          ? s.student?.profile?.name || 'студентом'
                          : s.teacher?.profile?.name || 'ментором'}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {s.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {new Date(s.scheduledAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>
                      {s.duration} мин ({s.format})
                    </span>
                  </div>

                  <Link
                    href={`/calls/${s.meetingLink || 'room_default'}`}
                    className="mt-2 w-full py-1.5 px-3 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-xs font-mono text-center block transition-colors"
                  >
                    Войти в комнату звонка
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recommended Seminars */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            Рекомендуемые воркшопы и семинары
          </span>
          <Link href="/seminars" className="text-xs font-mono text-blue-400 hover:text-blue-300">
            Все семинары
          </Link>
        </div>

        <div className="space-y-3">
          {seminars.length === 0 ? (
            <div className="drinkit-card p-6 text-center text-zinc-500 font-mono text-xs">
              Семинары запланированы на ближайшие дни.
            </div>
          ) : (
            seminars.map((sem) => (
              <div
                key={sem.id}
                className="drinkit-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
                      {sem.category}
                    </span>
                    {sem.isLive && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                        В ЭФИРЕ
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">{sem.title}</h3>
                  <div className="text-xs font-mono text-zinc-400">
                    Ведущий: <span className="text-zinc-200">{sem.host?.profile?.name}</span> •{' '}
                    {sem.date} в {sem.time} • {sem.participantCount} / {sem.maxParticipants} инженеров
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/seminars/${sem.id}/live`}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium tap-active transition-all"
                  >
                    {sem.isLive ? 'Подключиться к трансляции' : 'Подробнее'}
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
