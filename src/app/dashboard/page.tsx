'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  ArrowRight,
  MessageSquare,
  Video,
  Calendar,
  GraduationCap,
  TrendingUp,
  Award,
  Zap,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [seminars, setSeminars] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [mRes, sRes, semRes, pRes, cRes] = await Promise.all([
          fetch('/api/matches'),
          fetch('/api/sessions'),
          fetch('/api/seminars'),
          fetch('/api/progress'),
          fetch('/api/conversations'),
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
        if (cRes.ok) {
          const c = await cRes.json();
          setConversations(c.conversations?.slice(0, 3) || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [user]);

  const startDirectSession = (teacherId: string, skillName: string) => {
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

  const userName = user?.profile?.name?.split(' ')[0] || 'Alex';

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Good evening, {userName} 👋
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
              Verified Mentor
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Learning Goal: <span className="text-white font-medium">English for IT</span> & <span className="text-white font-medium">Prompt Engineering</span> — Intermediate → Advanced
          </p>
        </div>

        {/* Quick Stats Pill Bar */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="drinkit-card px-3 py-2 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <div className="font-mono text-xs">
              <span className="text-zinc-500">Learned:</span> <span className="text-white font-semibold">{progressData?.stats?.learningHours ?? 12.5}h</span>
            </div>
          </div>
          <div className="drinkit-card px-3 py-2 flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            <div className="font-mono text-xs">
              <span className="text-zinc-500">Taught:</span> <span className="text-white font-semibold">{progressData?.stats?.teachingHours ?? 32.5}h</span>
            </div>
          </div>
          <div className="drinkit-card px-3 py-2 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <div className="font-mono text-xs">
              <span className="text-zinc-500">Credits:</span> <span className="text-blue-400 font-bold">{user?.profile?.xCredits ?? 12} XC</span>
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
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                🔥 Your Knowledge Matches
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Live Algorithm
              </span>
            </div>
            <Link
              href="/matches"
              className="text-xs font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              <span>View all ({matches.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((m, idx) => {
              const candidate = m.candidateUser;
              return (
                <div
                  key={candidate?.id || idx}
                  className="drinkit-card p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
                          {candidate?.profile?.avatar ? (
                            <img src={candidate.profile.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-mono font-bold text-blue-400">
                              {candidate?.profile?.name?.charAt(0) || 'P'}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5">
                            {candidate?.profile?.name}
                            {candidate?.profile?.verified && (
                              <CheckCircle2 className="w-3 h-3 text-blue-400" />
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500">
                            ⭐️ {candidate?.profile?.rating || '4.9'} • {candidate?.profile?.location || 'Remote'}
                          </div>
                        </div>
                      </div>

                      {/* Match Score Badge */}
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                          {m.score}% MATCH
                        </span>
                      </div>
                    </div>

                    {/* Exchange Flow */}
                    <div className="space-y-1 text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-white/[0.04]">
                      <div className="text-zinc-400">
                        Teaches: <span className="text-emerald-400 font-semibold">{m.skillsOfferedToYou?.join(', ') || 'English, LLMs'}</span>
                      </div>
                      <div className="text-zinc-400">
                        Wants: <span className="text-blue-400 font-semibold">{m.skillsWantedFromYou?.join(', ') || 'Python, AI'}</span>
                      </div>
                    </div>

                    {/* Reason */}
                    <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                      {m.reasons?.[0] || 'Direct reciprocal skill exchange match with compatible timezone.'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1 border-t border-white/[0.06]">
                    <button
                      onClick={() => startChat(candidate?.id)}
                      className="flex-1 py-1.5 px-3 rounded-full bg-[#18181f] hover:bg-zinc-800 text-zinc-200 text-xs font-mono tap-active transition-all flex items-center justify-center gap-1.5 border border-white/[0.08]"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Message</span>
                    </button>
                    <button
                      onClick={() => startDirectSession(candidate?.id, m.skillsOfferedToYou?.[0] || 'Topic')}
                      className="flex-1 py-1.5 px-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium tap-active transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Start Session</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Sessions & Live Calls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-400" />
              Upcoming Sessions
            </span>
            <Link href="/calendar" className="text-xs font-mono text-zinc-400 hover:text-white">
              Calendar
            </Link>
          </div>

          <div className="space-y-3">
            {sessions.length === 0 ? (
              <div className="drinkit-card p-6 text-center text-zinc-500 text-xs font-mono">
                No sessions booked yet. Request an exchange from your matches!
              </div>
            ) : (
              sessions.map((s) => (
                <div key={s.id} className="drinkit-card p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white tracking-tight">{s.title}</div>
                      <div className="text-[11px] font-mono text-blue-400 mt-0.5">
                        With {s.teacherId === user?.id ? s.student?.profile?.name : s.teacher?.profile?.name}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {s.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {new Date(s.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>{s.duration} min ({s.format})</span>
                  </div>

                  <Link
                    href={`/calls/${s.meetingLink || 'room_default'}`}
                    className="mt-2 w-full py-1.5 px-3 rounded-full bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-xs font-mono text-center block transition-colors"
                  >
                    Enter WebRTC Room
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recommended Seminars & Active Chats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommended Seminars */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-400" />
              Recommended Seminars & Workshops
            </span>
            <Link href="/seminars" className="text-xs font-mono text-blue-400 hover:text-blue-300">
              All Seminars
            </Link>
          </div>

          <div className="space-y-3">
            {seminars.map((sem) => (
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
                        LIVE NOW
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">{sem.title}</h3>
                  <div className="text-xs font-mono text-zinc-400">
                    Host: <span className="text-zinc-200">{sem.host?.profile?.name}</span> • {sem.date} at {sem.time} • {sem.participantCount} / {sem.maxParticipants} peers
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/seminars/${sem.id}/live`}
                    className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium tap-active transition-all"
                  >
                    {sem.isLive ? 'Join Live Stage' : 'View Details'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skill Progress Summary */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Learning Progress
            </span>
            <Link href="/progress" className="text-xs font-mono text-zinc-400 hover:text-white">
              Details
            </Link>
          </div>

          <div className="drinkit-card p-5 space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-zinc-300">Python Mastery</span>
                  <span className="text-blue-400 font-bold">92%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-zinc-300">PyTorch & Transformers</span>
                  <span className="text-blue-400 font-bold">78%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '78%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-zinc-300">English for IT</span>
                  <span className="text-blue-400 font-bold">64%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '64%' }} />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
              <span className="font-mono text-xs text-zinc-500">Streak: 8 Days 🔥</span>
              <Link
                href="/tests"
                className="text-xs font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <span>Take Proof Test (+8%)</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
