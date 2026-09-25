'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Clock,
  Award,
  Flame,
  CheckCircle2,
  Lock,
  ArrowRight,
  BookOpen,
  Calendar,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ProgressPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await fetch('/api/progress');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProgress();
  }, []);

  const stats = data?.stats || {
    learningHours: 12.5,
    teachingHours: 32.5,
    sessionsCompleted: 17,
    testsCompleted: 12,
    streakDays: 8,
    skillsImproved: 4,
    xCredits: 12,
  };

  const skills = [
    { name: 'Python', percent: 92, hours: 32.5 },
    { name: 'PyTorch & AI', percent: 78, hours: 18.0 },
    { name: 'English for IT', percent: 64, hours: 12.0 },
    { name: 'Prompt Engineering & LLMs', percent: 55, hours: 8.5 },
    { name: 'PostgreSQL & SQL', percent: 40, hours: 6.0 },
  ];

  const skillTree = data?.skillTree || [
    { id: '1', title: 'Basics & Syntax', status: 'COMPLETED', desc: 'Control flow, primitive types and functions' },
    { id: '2', title: 'Variables & Memory Model', status: 'COMPLETED', desc: 'Namespaces, reference counting, mutable vs immutable' },
    { id: '3', title: 'Async Coroutines & Event Loops', status: 'IN_PROGRESS', desc: 'AsyncIO, tasks, futures and network concurrency' },
    { id: '4', title: 'OOP & Metaclasses', status: 'LOCKED', desc: 'Custom descriptors, dunder protocols, __init_subclass__' },
    { id: '5', title: 'Real-world Applied Projects', status: 'LOCKED', desc: 'Full-stack WebSockets, high-throughput microservices' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Verifiable Learning Metrics
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Knowledge Progress & Skill Tree
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Real hours exchanged, tests passed and mastery levels unlocked across your technical domains.
          </p>
        </div>
      </div>

      {/* Top 5 Stat Bento Grid (Requirement 24) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="drinkit-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Learning Hours</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white tracking-tight">
            {stats.learningHours} <span className="text-xs text-zinc-500 font-normal">hrs</span>
          </div>
          <div className="text-[10px] font-mono text-emerald-400">+2.5 hrs this week</div>
        </div>

        <div className="drinkit-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Skills Improved</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white tracking-tight">
            +{stats.skillsImproved}
          </div>
          <div className="text-[10px] font-mono text-blue-400">Mastery advancing</div>
        </div>

        <div className="drinkit-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Sessions</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white tracking-tight">
            {stats.sessionsCompleted}
          </div>
          <div className="text-[10px] font-mono text-zinc-400">100% attendance</div>
        </div>

        <div className="drinkit-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Tests Completed</span>
            <Award className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white tracking-tight">
            {stats.testsCompleted}
          </div>
          <div className="text-[10px] font-mono text-emerald-400">Avg Score: 94%</div>
        </div>

        <div className="drinkit-card p-5 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Learning Streak</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white tracking-tight flex items-center gap-1">
            {stats.streakDays} <span className="text-xs text-zinc-500 font-normal">days</span>
          </div>
          <div className="text-[10px] font-mono text-amber-400">Top 5% consistency 🔥</div>
        </div>
      </div>

      {/* Two Column Section: Skill Mastery Bars (Left) and Weekly Activity Graph (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requirement 24: Skill Progress Bars */}
        <div className="drinkit-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">
              Skill Mastery Level
            </h2>
            <span className="font-mono text-xs text-zinc-500">Updated after each test</span>
          </div>

          <div className="space-y-4">
            {skills.map((s) => (
              <div key={s.name} className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white font-medium">{s.name}</span>
                  <span className="text-blue-400 font-bold">{s.percent}%</span>
                </div>
                <div className="h-2 w-full bg-[#18181f] rounded-full overflow-hidden border border-white/[0.04]">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${s.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>{s.hours} hours logged</span>
                  <span>{s.percent >= 80 ? 'Advanced' : s.percent >= 60 ? 'Intermediate' : 'Foundational'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Activity Matrix Graph */}
        <div className="drinkit-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">
              Weekly Knowledge Flow
            </h2>
            <span className="font-mono text-xs text-zinc-500">Hours Taught vs Learned</span>
          </div>

          {/* Minimalist Bar Chart Representation */}
          <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
            {[
              { day: 'Mon', taught: 2.0, learned: 1.0 },
              { day: 'Tue', taught: 1.5, learned: 1.5 },
              { day: 'Wed', taught: 3.0, learned: 2.0 },
              { day: 'Thu', taught: 0.0, learned: 1.0 },
              { day: 'Fri', taught: 2.5, learned: 2.5 },
              { day: 'Sat', taught: 4.0, learned: 1.0 },
              { day: 'Sun', taught: 1.0, learned: 0.5 },
            ].map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 h-44">
                  {/* Taught Bar */}
                  <div
                    className="w-1/2 bg-blue-500 rounded-t transition-all hover:bg-blue-400"
                    style={{ height: `${(d.taught / 4.5) * 100}%` }}
                    title={`Taught: ${d.taught}h`}
                  />
                  {/* Learned Bar */}
                  <div
                    className="w-1/2 bg-zinc-700 rounded-t transition-all hover:bg-zinc-600"
                    style={{ height: `${(d.learned / 4.5) * 100}%` }}
                    title={`Learned: ${d.learned}h`}
                  />
                </div>
                <span className="text-[10px] font-mono text-zinc-500">{d.day}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6 pt-2 border-t border-white/[0.04] text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-zinc-300">Taught (Credits Earned)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-zinc-700 rounded" />
              <span className="text-zinc-400">Learned (Credits Spent)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Interactive Skill Tree (Requirement 25) */}
      <div className="drinkit-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Python Specialization Skill Tree</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Level 3 Active
              </span>
            </h2>
            <p className="text-xs font-mono text-zinc-400 mt-0.5">
              Nodes unlock sequentially as you complete peer sessions and verify mastery via Proof of Learning tests.
            </p>
          </div>
          <Link
            href="/tests"
            className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium tap-active transition-all"
          >
            Unlock Next Node (+8%)
          </Link>
        </div>

        {/* Tree Visual Flow */}
        <div className="space-y-4 max-w-2xl mx-auto py-4">
          {skillTree.map((node: any, idx: number) => {
            const isCompleted = node.status === 'COMPLETED';
            const isInProgress = node.status === 'IN_PROGRESS';
            const isLocked = node.status === 'LOCKED';

            return (
              <div key={node.id} className="relative">
                {idx > 0 && (
                  <div className="w-0.5 h-6 bg-white/10 mx-auto my-1" />
                )}

                <div
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    isCompleted
                      ? 'bg-blue-950/20 border-blue-500/40 text-white'
                      : isInProgress
                      ? 'bg-[#18181f] border-blue-500/80 ring-1 ring-blue-500/30'
                      : 'bg-[#111114] border-white/[0.04] text-zinc-600 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                        isCompleted
                          ? 'bg-blue-600 text-white'
                          : isInProgress
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isLocked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        `0${idx + 1}`
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-white tracking-tight">
                        {node.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-sans mt-0.5">
                        {node.desc}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded-full uppercase ${
                      isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : isInProgress
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {node.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
