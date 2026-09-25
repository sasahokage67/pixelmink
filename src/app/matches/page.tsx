'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function MatchesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestTeacherId = searchParams.get('requestTeacherId');
  const { user } = useAuth();

  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal for Request Session
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [sessionTitle, setSessionTitle] = useState('1-on-1 Knowledge Exchange');
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
        setSuccessMessage('✅ Session request sent! The peer has been notified.');
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
            Knowledge Exchange Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Matches & Reciprocal Chains
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Zero financial transactions. Teach what you excel at, learn what you desire.
          </p>
        </div>
      </div>

      {/* Circular Chains Section (A -> B -> C -> A) */}
      {chainMatches.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Multi-Hop Knowledge Chains (A → B → C → A)
            </h2>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Unique Feature
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
                      3-Peer Exchange Chain
                    </span>
                    <div className="text-sm font-semibold text-white mt-1">
                      {chain.chainDetails?.exchangeFlow}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                    {chain.score}% Loop Synergy
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
                    Initiate Chain Step
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
              Direct Peer Matches
            </h2>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {directMatches.length} Found
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center font-mono text-xs text-zinc-500">
            Calculating skill permutations & reciprocal compatibility...
          </div>
        ) : directMatches.length === 0 ? (
          <div className="drinkit-card p-12 text-center text-zinc-400 font-mono text-xs">
            No matches found yet. Add more skills to your profile to expand compatibility!
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
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
                          {candidate?.profile?.avatar ? (
                            <img src={candidate.profile.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-mono font-bold text-blue-400">
                              {candidate?.profile?.name?.charAt(0) || 'P'}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
                            {candidate?.profile?.name}
                            {candidate?.profile?.verified && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500">
                            ⭐️ {candidate?.profile?.rating || '4.9'} • {candidate?.profile?.location || 'Remote'}
                          </div>
                        </div>
                      </div>

                      <div className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
                        {m.score}% MATCH
                      </div>
                    </div>

                    {/* Skill Exchange Summary Box */}
                    <div className="bg-black/40 p-3 rounded-xl border border-white/[0.04] space-y-1.5 text-xs font-mono">
                      <div className="text-zinc-400">
                        Teaches you: <span className="text-emerald-400 font-semibold">{m.skillsOfferedToYou?.join(', ') || 'Domain Skill'}</span>
                      </div>
                      <div className="text-zinc-400">
                        Wants from you: <span className="text-blue-400 font-semibold">{m.skillsWantedFromYou?.join(', ') || 'Your Expertise'}</span>
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
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
                    <button
                      onClick={async () => {
                        const res = await fetch('/api/conversations', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ targetUserId: candidate?.id }),
                        });
                        const data = await res.json();
                        router.push(`/chats?convId=${data.conversation?.id || ''}`);
                      }}
                      className="flex-1 py-2 px-3 rounded-full bg-[#18181f] hover:bg-zinc-800 text-zinc-200 text-xs font-mono tap-active transition-all flex items-center justify-center gap-1.5 border border-white/[0.08]"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Chat</span>
                    </button>

                    <button
                      onClick={() => handleOpenRequest(candidate)}
                      className="flex-1 py-2 px-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium tap-active transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Request Session</span>
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
                  Request Knowledge Exchange Session
                </h3>
                <p className="text-xs font-mono text-zinc-400 mt-0.5">
                  With {selectedTeacher.profile?.name}
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
                    Session Topic / Title
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
                      Duration
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                    >
                      <option value="30">30 min (0.5 XC)</option>
                      <option value="60">60 min (1.0 XC)</option>
                      <option value="90">90 min (1.5 XC)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Format
                    </label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                    >
                      <option value="VIDEO">Video Call + Screen Share</option>
                      <option value="AUDIO">Audio Only</option>
                      <option value="CHAT">Live Code Chat</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Proposed Date & Time
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
                    Topics / Questions to cover
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. I want to review my asyncio implementation and verify memory bottlenecks..."
                    className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-sans"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium tap-active transition-all"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Request'}
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
