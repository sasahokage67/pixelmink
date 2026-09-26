'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Users,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  X,
  Play,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SeminarsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [seminars, setSeminars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('ALL');

  // Create Seminar Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [semCategory, setSemCategory] = useState('AI & MACHINE LEARNING');
  const [level, setLevel] = useState('Intermediate');
  const [date, setDate] = useState('Oct 10, 2026');
  const [time, setTime] = useState('18:00 CET');
  const [duration, setDuration] = useState('60');
  const [maxParticipants, setMaxParticipants] = useState('500');
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());

  const fetchSeminars = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seminars${category !== 'ALL' ? `?category=${category}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setSeminars(data.seminars || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeminars();
  }, [category, user]);

  const handleRegister = async (seminarId: string) => {
    try {
      const res = await fetch(`/api/seminars/${seminarId}/register`, { method: 'POST' });
      if (res.ok) {
        setRegisteredIds((prev) => new Set(prev).add(seminarId));
        fetchSeminars();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSeminar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/seminars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category: semCategory,
          level,
          date,
          time,
          duration,
          maxParticipants,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        fetchSeminars();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            Broadcast SFU Architecture (Up to 500+ peers)
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Massive Technical Seminars
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Live masterclasses hosted by community leaders with live stage broadcasting, moderated chat and Q&A.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold tap-active transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Host a Seminar</span>
        </button>
      </div>

      {/* Filter Categories */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono text-zinc-500 mr-2 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Track:
        </span>
        {['ALL', 'AI & MACHINE LEARNING', 'DESIGN & UI/UX', 'SYSTEMS & CODING', 'VIDEO EDITING & MEDIA', 'DEVOPS & CLOUD'].map(
          (cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`drinkit-pill transition-all ${
                category === cat
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'text-zinc-400 hover:text-white hover:border-white/20'
              }`}
            >
              {cat === 'ALL' ? 'All Tracks' : cat}
            </button>
          )
        )}
      </div>

      {/* Seminars List */}
      {loading ? (
        <div className="py-24 text-center font-mono text-xs text-zinc-500">
          Loading live seminar registry...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {seminars.map((sem) => {
            const isRegistered =
              registeredIds.has(sem.id) ||
              sem.participants?.some((p: any) => p.userId === user?.id);

            return (
              <div
                key={sem.id}
                className="drinkit-card p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
                      {sem.category}
                    </span>

                    {sem.isLive ? (
                      <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        BROADCASTING LIVE
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-zinc-500">
                        {sem.level}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                    {sem.title}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                    {sem.description}
                  </p>

                  {/* Metadata Info */}
                  <div className="bg-black/40 p-3 rounded-xl border border-white/[0.04] space-y-2 text-xs font-mono text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span>Host:</span>
                      <span className="text-white font-medium">{sem.host?.profile?.name || 'Lead Architect'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Schedule:</span>
                      <span className="text-zinc-300">{sem.date} at {sem.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Capacity:</span>
                      <span className="text-blue-400 font-bold">{sem.participantCount} / {sem.maxParticipants} Registered</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
                  {sem.isLive ? (
                    <Link
                      href={`/seminars/${sem.id}/live`}
                      className="flex-1 py-2.5 px-4 rounded-full bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-semibold text-center tap-active transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Enter Live Stage Room</span>
                    </Link>
                  ) : isRegistered ? (
                    <div className="flex-1 flex items-center justify-between px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        You're Registered
                      </span>
                      <Link
                        href={`/seminars/${sem.id}/live`}
                        className="underline hover:text-white"
                      >
                        Preview Room
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRegister(sem.id)}
                      className="flex-1 py-2.5 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold tap-active transition-all shadow-md shadow-blue-600/20"
                    >
                      Register for Free
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Seminar Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#121217] border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white tracking-tight">Host Technical Seminar</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSeminar} className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Seminar Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fine-Tuning Transformers on Consumer GPUs"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Description & Syllabus</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will attendees learn? Provide code references..."
                  className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Category</label>
                  <select
                    value={semCategory}
                    onChange={(e) => setSemCategory(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                  >
                    <option value="AI & MACHINE LEARNING">AI & Machine Learning</option>
                    <option value="SYSTEMS & CODING">Systems & Coding</option>
                    <option value="DESIGN & UI/UX">Design & UI/UX</option>
                    <option value="VIDEO EDITING & MEDIA">Video Editing & Media</option>
                    <option value="DEVOPS & CLOUD">DevOps & Cloud</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Target Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                  >
                    <option value="All Levels">All Levels</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Date</label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Time</label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium tap-active transition-all"
                >
                  Publish Seminar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
