'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { ArrowRight, Sparkles, Terminal, Code2, Shield, Video, Layers, Users, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  const [demoSkillA, setDemoSkillA] = useState('Python');
  const [demoSkillB, setDemoSkillB] = useState('English for IT');

  return (
    <div className="space-y-24 py-8">
      {/* Hero Section */}
      <section className="relative pt-6 pb-12 border-b border-white/[0.08]">
        <div className="max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs">
            <Logo size={16} />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-0.5" />
            PIXELMINK PROTOCOL v1.0 • COMPUTER SCIENCE & AI
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter text-white leading-tight">
            Your skills for theirs.<br />
            <span className="text-zinc-400 font-light">No money, just knowledge.</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 font-normal max-w-2xl leading-relaxed">
            Exchange skills directly with senior developers and creators. Learn from peers, teach what you master, and prove real progress through verified 1-on-1 calls, screen sharing, and high-density technical seminars.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/matches"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold tap-active transition-all shadow-lg shadow-blue-600/20"
            >
              <span>Find a Match</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/seminars"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#141418] hover:bg-[#1a1a20] border border-white/[0.12] text-zinc-200 font-mono text-xs tap-active transition-all"
            >
              <span>Explore Seminars</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 font-mono">
                Live Now
              </span>
            </Link>
          </div>
        </div>

        {/* Live Matching Simulation Bento Card */}
        <div className="mt-12 p-6 rounded-2xl bg-[#111115] border border-white/[0.08]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
            <div>
              <div className="font-mono text-xs uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                pixelmink Knowledge Exchange Simulator
              </div>
              <div className="text-sm font-semibold text-white mt-0.5">
                MATCH → CHAT → CALL → LEARN → PRACTICE → PROGRESS
              </div>
            </div>
            <div className="font-mono text-xs px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-zinc-400">
              Deterministic Matching Engine
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 items-center">
            {/* User A Box */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-950/60 border border-blue-500/30 flex items-center justify-center font-mono font-bold text-blue-400">
                  A
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Peer Alex</div>
                  <div className="text-[10px] font-mono text-zinc-500">Belgrade • Rating 4.95</div>
                </div>
              </div>
              <div className="space-y-1.5 pt-2 text-xs font-mono">
                <div className="text-zinc-400">Teaches: <span className="text-blue-400 font-semibold">{demoSkillA}</span></div>
                <div className="text-zinc-400">Wants: <span className="text-emerald-400 font-semibold">{demoSkillB}</span></div>
              </div>
            </div>

            {/* Central Score Card */}
            <div className="text-center p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-widest text-blue-400">
                🔥 Perfect Reciprocal Match
              </div>
              <div className="text-4xl font-mono font-bold tracking-tight text-white">
                96<span className="text-blue-400">%</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-sans">
                Zero currency needed. 1h teaching Python = 1h learning English via XCredits.
              </div>
              <Link
                href="/matches"
                className="inline-block mt-2 px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-[11px] font-medium transition-all"
              >
                Inspect Match Details
              </Link>
            </div>

            {/* User B Box */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-emerald-400">
                  B
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Peer Amina</div>
                  <div className="text-[10px] font-mono text-zinc-500">Dubai • Rating 4.98</div>
                </div>
              </div>
              <div className="space-y-1.5 pt-2 text-xs font-mono">
                <div className="text-zinc-400">Teaches: <span className="text-emerald-400 font-semibold">{demoSkillB}</span></div>
                <div className="text-zinc-400">Wants: <span className="text-blue-400 font-semibold">{demoSkillA}</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="space-y-8">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-blue-400">The Loop</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
            How Knowledge Exchange Works
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              step: '01',
              title: 'Define Skills',
              desc: 'Declare what CS & Tech skills you can teach and what topics you aim to master.',
              icon: Code2,
            },
            {
              step: '02',
              title: 'Get Matched',
              desc: 'Algorithm finds direct 2-way matches or 3-way circular exchange loops (A→B→C→A).',
              icon: Users,
            },
            {
              step: '03',
              title: 'Live Call & Screen',
              desc: 'Ultra low-latency WebRTC calls with screen sharing to review code and debug.',
              icon: Video,
            },
            {
              step: '04',
              title: 'Proof of Learning',
              desc: 'Take instant technical quizzes after sessions to earn verifiable skill progress (+8%).',
              icon: CheckCircle2,
            },
            {
              step: '05',
              title: 'Earn XCredits',
              desc: '1 hour teaching = 1 XCredit earned to unlock learning from any senior peer.',
              icon: Shield,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="drinkit-card p-5 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-500">{item.step}</span>
                    <Icon className="w-4 h-4 text-zinc-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mt-4 tracking-tight">{item.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tech Focus Domains Bento Grid */}
      <section className="space-y-8">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-blue-400">Curriculum</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
            Pure Computer Science & Digital Craft
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="drinkit-card p-6 md:col-span-2 space-y-4">
            <div className="font-mono text-xs text-blue-400">01 / AI & MACHINE LEARNING</div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              PyTorch, Transformers, LLM Fine-Tuning & Quantization
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
              Exchange experience on fine-tuning Llama and Qwen models with LoRA, setting up local inference servers, vector databases (pgvector) and structured output agents.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {['PyTorch', 'HuggingFace', 'LoRA / QLoRA', 'DSPy', 'Ollama', 'vLLM'].map((t) => (
                <span key={t} className="drinkit-pill text-zinc-300">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="drinkit-card p-6 space-y-4">
            <div className="font-mono text-xs text-blue-400">02 / SYSTEMS PROGRAMMING</div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Rust & High-Concurrency Golang
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Ownership lifetimes, lock-free queues, Tokio async runtime, eBPF network taps and sub-millisecond servers.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {['Rust', 'Tokio', 'Golang', 'C++', 'Linux Kernel'].map((t) => (
                <span key={t} className="drinkit-pill text-zinc-300">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="drinkit-card p-6 space-y-4">
            <div className="font-mono text-xs text-blue-400">03 / VIDEO EDITING & 3D</div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              DaVinci Resolve & Blender 3D
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              ACES color grading, hard-surface geometry nodes, motion graphics, and audio mastering in Fairlight.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {['DaVinci Resolve', 'Blender', 'Unreal Engine 5', 'Shader Math'].map((t) => (
                <span key={t} className="drinkit-pill text-zinc-300">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="drinkit-card p-6 md:col-span-2 space-y-4">
            <div className="font-mono text-xs text-blue-400">04 / PRODUCT & FRONTEND DESIGN</div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Figma Design Systems & Next.js App Router
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
              Drinkit minimalist ergonomics, variable design tokens, micro-interactions, TypeScript strict gymnastics, and zero-slop component architectures.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {['Design Systems', 'Figma Tokens', 'Next.js 14', 'TypeScript', 'Tailwind'].map((t) => (
                <span key={t} className="drinkit-pill text-zinc-300">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="p-8 md:p-12 rounded-2xl bg-[#111115] border border-blue-500/30 text-center space-y-5">
        <div className="flex items-center justify-center gap-3">
          <Logo size={36} />
          <span className="font-mono text-2xl font-bold text-white tracking-tight">pixelmink</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white">
          Your skills for theirs. No money, just knowledge.
        </h2>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Join Alex, Amina, Daniel, Sara and 20+ verified peers already running live WebRTC pair programming and seminars.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold tap-active transition-all shadow-xl shadow-blue-600/30"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
