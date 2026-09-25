'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import Logo from '@/components/ui/Logo';
import Identicon from '@/components/ui/Identicon';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import {
  ArrowRight,
  Sparkles,
  Terminal,
  Cpu,
  Shield,
  Video,
  Layers,
  Users,
  CheckCircle2,
  Database,
  Binary,
  GitBranch,
  Code2,
  Radio,
  Clock,
  ArrowUpRight,
  Flame,
  Check,
  Globe,
} from 'lucide-react';

const CS_DOMAINS = [
  {
    code: '01',
    title: {
      en: 'Low-Level Systems & OS',
      ru: 'Низкоуровневые системы и ОС',
      kz: 'Төменгі деңгейлі жүйелер мен ОЖ',
    },
    skills: ['Rust', 'C/C++', 'Linux Kernel', 'Concurrency', 'Memory Safety'],
    desc: {
      en: 'Systems programming, OS internals, zero-cost abstractions and lock-free data structures.',
      ru: 'Системное программирование, ядро ОС, zero-cost абстракции и lock-free структуры данных.',
      kz: 'Жүйелік бағдарламалау, ОЖ өзегі, нөлдік құнды абстракциялар және lock-free құрылымдар.',
    },
    peers: 14,
  },
  {
    code: '02',
    title: {
      en: 'Artificial Intelligence & ML',
      ru: 'Искусственный интеллект и ML',
      kz: 'Жасанды интеллект және ML',
    },
    skills: ['PyTorch', 'LLMs & RAG', 'Computer Vision', 'LoRA Fine-tuning', 'Vector DBs'],
    desc: {
      en: 'Deep learning frameworks, training custom models, tensor math and autonomous agents.',
      ru: 'Фреймворки глубокого обучения, обучение нейросетей, тензорная математика и AI-агенты.',
      kz: 'Терең оқыту фреймворктері, нейрожүйелерді үйрету, тензорлық математика және AI-агенттер.',
    },
    peers: 22,
  },
  {
    code: '03',
    title: {
      en: 'Distributed Systems & Data',
      ru: 'Распределенные системы и базы данных',
      kz: 'Үлестірілген жүйелер мен деректер қоры',
    },
    skills: ['PostgreSQL & SQL', 'Raft Consensus', 'Redis', 'Microservices', 'Kafka'],
    desc: {
      en: 'High-throughput architectures, fault tolerance, transaction isolation and query optimization.',
      ru: 'Высоконагруженные архитектуры, отказоустойчивость, изоляция транзакций и оптимизация SQL.',
      kz: 'Жоғары жүктемелі сәулеттер, ақауларға төзімділік, транзакциялар оқшаулауы және SQL оңтайландыру.',
    },
    peers: 18,
  },
  {
    code: '04',
    title: {
      en: 'DevOps & Infrastructure',
      ru: 'DevOps и инфраструктура',
      kz: 'DevOps және инфрақұрылым',
    },
    skills: ['Docker', 'Kubernetes', 'CI/CD Pipelines', 'Git Workflows', 'Rootless Containers'],
    desc: {
      en: 'Containerization, cloud infrastructure orchestration, automated builds and observability.',
      ru: 'Контейнеризация, оркестрация облачной инфраструктуры, автоматические пайплайны и мониторинг.',
      kz: 'Контейнерлеу, бұлтты инфрақұрылымды оркестрлеу, автоматтандырылған құрастыру және мониторинг.',
    },
    peers: 16,
  },
  {
    code: '05',
    title: {
      en: 'Algorithms & Core Theory',
      ru: 'Алгоритмы и теория CS',
      kz: 'Алгоритмдер мен CS теориясы',
    },
    skills: ['Data Structures', 'Dynamic Programming', 'Linear Algebra', 'Graph Theory'],
    desc: {
      en: 'Algorithmic complexity, mathematical foundations of graphics, cryptography and games.',
      ru: 'Сложность алгоритмов, структуры данных, математика для 3D графики и криптографии.',
      kz: 'Алгоритмдік күрделілік, деректер құрылымы, 3D графика мен криптография математикасы.',
    },
    peers: 19,
  },
  {
    code: '06',
    title: {
      en: 'Cybersecurity & AppSec',
      ru: 'Информационная безопасность',
      kz: 'Ақпараттық қауіпсіздік',
    },
    skills: ['Pentest', 'Web Security', 'Reverse Engineering', 'Cryptography', 'Audit'],
    desc: {
      en: 'Vulnerability assessment, exploit analysis, secure code reviews and hardened protocols.',
      ru: 'Поиск уязвимостей, анализ эксплойтов, безопасное ревью кода и защита протоколов.',
      kz: 'Әлсіздіктерді табу, эксплойттарды талдау, қауіпсіз код ревьюі және хаттамаларды қорғау.',
    },
    peers: 11,
  },
];

const RECENT_EXCHANGES = [
  {
    userA: 'Alex Voronov',
    skillA: 'Python & AI',
    userB: 'Amina Al-Mansoor',
    skillB: 'Prompt Engineering',
    status: 'LIVE CALL',
    score: '96%',
  },
  {
    userA: 'Daniel Richter',
    skillA: 'Rust Systems',
    userB: 'Elena Rostova',
    skillB: 'React & Next.js',
    status: 'COMPLETED',
    score: '94%',
  },
  {
    userA: 'Marcus Brody',
    skillA: 'DaVinci Resolve',
    userB: 'Sara Lindqvist',
    skillB: 'UI/UX Design Systems',
    status: 'SCHEDULED',
    score: '92%',
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [selectedDemoSkill, setSelectedDemoSkill] = useState<'rust' | 'ai' | 'systems'>('rust');

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* DRINKIT-STYLE LANDING NAVBAR */}
      <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-white/[0.08] px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={28} />
            <span className="font-pixel text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
              pixelmink
            </span>
          </Link>
          <span className="hidden lg:inline text-xs font-mono text-zinc-500 border-l border-white/10 pl-4">
            {t('slogan')}
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-zinc-400">
          <a href="#simulator" className="hover:text-white transition-colors">{t('nav_simulator')}</a>
          <a href="#disciplines" className="hover:text-white transition-colors">{t('nav_matrix')}</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">{t('nav_rules')}</a>
          <a href="#activity" className="hover:text-white transition-colors">{t('nav_activity')}</a>
        </nav>

        <div className="flex items-center gap-3 font-mono text-xs">
          {/* Language Switcher RU / KZ / EN */}
          <LanguageSwitcher />

          {user ? (
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5"
            >
              <span>{t('nav_workspace')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="px-2.5 py-1.5 text-zinc-400 hover:text-white transition-colors"
              >
                {t('nav_signin')}
              </Link>
              <Link
                href="/auth/register"
                className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-600/20"
              >
                {t('nav_register')}
              </Link>
            </>
          )}
        </div>
      </header>

      {/* MAIN LANDING BODY */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-24 py-8">
        {/* 1. HERO SECTION: DRINKIT-STYLE EDITORIAL TYPOGRAPHY & ZERO SLOP */}
        <section className="relative pt-6 pb-16 border-b border-white/[0.08]">
          <div className="max-w-4xl space-y-6">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#111115] border border-white/10 text-xs font-mono text-zinc-300">
              <Logo size={18} />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-white font-bold tracking-tight">pixelmink</span>
              <span className="text-zinc-600">•</span>
              <span className="text-blue-400">{t('protocol_tag')}</span>
            </div>

            {/* Slogan & Bold Statement */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-pixel font-bold text-white tracking-tight leading-tight">
                {t('hero_title_1')}
              </h1>
              <p className="text-2xl sm:text-4xl md:text-5xl font-pixel text-zinc-500 tracking-tight">
                {t('hero_title_2')}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-zinc-400 font-mono max-w-2xl leading-relaxed pt-2">
              {t('hero_desc')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-5 py-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold tap-active transition-all shadow-lg shadow-blue-600/20"
              >
                <span>{t('hero_btn_register')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href="/discover"
                className="inline-flex items-center gap-2 px-5 py-3 rounded bg-[#131318] hover:bg-[#181820] border border-white/[0.12] text-zinc-300 font-mono text-xs tap-active transition-all"
              >
                <span>{t('hero_btn_explore')}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
              </Link>

              <Link
                href="/matches"
                className="inline-flex items-center gap-2 px-4 py-3 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white font-mono text-xs transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('hero_btn_matches')}</span>
              </Link>
            </div>

            {/* Protocol Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/[0.06]">
              <div className="p-3 rounded bg-[#111114] border border-white/[0.06]">
                <div className="text-[10px] font-mono uppercase text-zinc-500">{t('metric_exchanged')}</div>
                <div className="text-lg font-mono font-bold text-white mt-0.5">1,420+ hrs</div>
              </div>
              <div className="p-3 rounded bg-[#111114] border border-white/[0.06]">
                <div className="text-[10px] font-mono uppercase text-zinc-500">{t('metric_accuracy')}</div>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">97.8%</div>
              </div>
              <div className="p-3 rounded bg-[#111114] border border-white/[0.06]">
                <div className="text-[10px] font-mono uppercase text-zinc-500">{t('metric_cost')}</div>
                <div className="text-lg font-mono font-bold text-blue-400 mt-0.5">{t('metric_free')}</div>
              </div>
              <div className="p-3 rounded bg-[#111114] border border-white/[0.06]">
                <div className="text-[10px] font-mono uppercase text-zinc-500">{t('metric_infra')}</div>
                <div className="text-lg font-mono font-bold text-zinc-300 mt-0.5">P2P WebRTC</div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. INTERACTIVE MATCHING SIMULATOR BENTO */}
        <section id="simulator" className="space-y-6 scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="text-[10px] font-mono uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                {t('sim_badge')}
              </div>
              <h2 className="text-xl sm:text-2xl font-pixel font-bold text-white tracking-tight mt-1">
                {t('sim_title')}
              </h2>
            </div>
            <p className="text-xs font-mono text-zinc-400 max-w-md">
              {t('sim_desc')}
            </p>
          </div>

          {/* Interactive Simulator Shell */}
          <div className="drinkit-card p-6 md:p-8 bg-[#0c0c10] border border-white/10 space-y-6">
            {/* Skill Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-mono text-zinc-500 shrink-0 mr-2">{t('sim_scenario_label')}</span>
              <button
                onClick={() => setSelectedDemoSkill('rust')}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  selectedDemoSkill === 'rust'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-[#141419] text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                {t('sim_scen_1')}
              </button>
              <button
                onClick={() => setSelectedDemoSkill('ai')}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  selectedDemoSkill === 'ai'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-[#141419] text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                {t('sim_scen_2')}
              </button>
              <button
                onClick={() => setSelectedDemoSkill('systems')}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  selectedDemoSkill === 'systems'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-[#141419] text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                {t('sim_scen_3')}
              </button>
            </div>

            {/* Interactive Simulation Diagram */}
            {selectedDemoSkill !== 'systems' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Peer A Card */}
                <div className="p-5 rounded-lg bg-[#111116] border border-white/[0.08] space-y-4">
                  <div className="flex items-center gap-3">
                    <Identicon name="Peer_A_Linus" size={44} />
                    <div>
                      <div className="text-xs font-bold text-white">Linus (You)</div>
                      <div className="text-[10px] font-mono text-zinc-500">Remote • 4.98 Rating</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-mono pt-1">
                    <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <span className="text-[10px] uppercase block text-emerald-500 font-semibold">{t('reg_can_teach')}:</span>
                      {selectedDemoSkill === 'rust' ? 'Rust & Concurrency' : 'LLMs & Prompt Engineering'}
                    </div>
                    <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <span className="text-[10px] uppercase block text-blue-500 font-semibold">{t('reg_want_learn')}:</span>
                      {selectedDemoSkill === 'rust' ? 'PyTorch & AI' : 'PostgreSQL & Distributed SQL'}
                    </div>
                  </div>
                </div>

                {/* Central Matching Logic Gauge */}
                <div className="text-center p-5 rounded-lg bg-[#14141c] border border-blue-500/30 space-y-3">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono">
                    <Flame className="w-3 h-3 text-blue-400" />
                    {t('sim_match_tag')}
                  </div>

                  <div className="text-4xl font-mono font-bold text-white tracking-tight">
                    98<span className="text-blue-400">%</span>
                  </div>

                  <div className="text-[11px] font-mono text-zinc-400 leading-snug">
                    {t('sim_match_detail')}
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-zinc-500 pt-1">
                    <span className="px-1.5 py-0.5 rounded bg-white/5">#zero-money</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5">#webrtc</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5">#code-share</span>
                  </div>
                </div>

                {/* Peer B Card */}
                <div className="p-5 rounded-lg bg-[#111116] border border-white/[0.08] space-y-4">
                  <div className="flex items-center gap-3">
                    <Identicon name="Peer_B_Amina" size={44} />
                    <div>
                      <div className="text-xs font-bold text-white">Amina (Matched Peer)</div>
                      <div className="text-[10px] font-mono text-zinc-500">London • 4.95 Rating</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-mono pt-1">
                    <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <span className="text-[10px] uppercase block text-emerald-500 font-semibold">{t('reg_can_teach')}:</span>
                      {selectedDemoSkill === 'rust' ? 'PyTorch & AI' : 'PostgreSQL & Distributed SQL'}
                    </div>
                    <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <span className="text-[10px] uppercase block text-blue-500 font-semibold">{t('reg_want_learn')}:</span>
                      {selectedDemoSkill === 'rust' ? 'Rust & Concurrency' : 'LLMs & Prompt Engineering'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* 3-Way Loop Visualization */
              <div className="p-6 rounded-lg bg-[#111116] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-purple-400" />
                    {t('sim_circular_title')}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {t('sim_circular_badge')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded bg-black/40 border border-white/[0.06] text-xs font-mono space-y-1">
                    <div className="text-blue-400 font-bold">Node A (You)</div>
                    <div className="text-zinc-400">Teaches Rust → to Node B</div>
                    <div className="text-emerald-400">Receives AI from Node C</div>
                  </div>

                  <div className="p-4 rounded bg-black/40 border border-white/[0.06] text-xs font-mono space-y-1">
                    <div className="text-purple-400 font-bold">Node B (Daniel)</div>
                    <div className="text-zinc-400">Teaches DevOps → to Node C</div>
                    <div className="text-emerald-400">Receives Rust from Node A</div>
                  </div>

                  <div className="p-4 rounded bg-black/40 border border-white/[0.06] text-xs font-mono space-y-1">
                    <div className="text-pink-400 font-bold">Node C (Sara)</div>
                    <div className="text-zinc-400">Teaches AI/Design → to Node A</div>
                    <div className="text-emerald-400">Receives DevOps from Node B</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 3. COMPUTER SCIENCE DISCIPLINE MATRIX (BENTO GRID) */}
        <section id="disciplines" className="space-y-6 scroll-mt-20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider">
                {t('cat_tag')}
              </div>
              <h2 className="text-xl sm:text-2xl font-pixel font-bold text-white tracking-tight mt-1">
                {t('cat_title')}
              </h2>
            </div>
            <Link
              href="/skills"
              className="text-xs font-mono text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>{t('cat_view_all')}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CS_DOMAINS.map((domain) => (
              <div
                key={domain.code}
                className="drinkit-card p-5 space-y-3 flex flex-col justify-between hover:border-white/20 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-blue-500 font-bold">{domain.code} //</span>
                    <span className="text-[10px] text-zinc-500 px-2 py-0.5 rounded bg-white/5">
                      {domain.peers} {t('cat_active_peers')}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight">{domain.title[lang] || domain.title['en']}</h3>
                  <p className="text-[11px] font-mono text-zinc-400 leading-relaxed">
                    {domain.desc[lang] || domain.desc['en']}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/[0.06]">
                  <div className="flex flex-wrap gap-1">
                    {domain.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181820] text-zinc-300 border border-white/5"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. PROTOCOL ARCHITECTURE (HOW IT WORKS) */}
        <section id="how-it-works" className="space-y-6 scroll-mt-20">
          <div>
            <div className="text-[10px] font-mono uppercase text-blue-400 tracking-wider">
              {t('rules_tag')}
            </div>
            <h2 className="text-xl sm:text-2xl font-pixel font-bold text-white tracking-tight mt-1">
              {t('rules_title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: '01',
                title: t('rule_1_title'),
                desc: t('rule_1_desc'),
                icon: Terminal,
              },
              {
                step: '02',
                title: t('rule_2_title'),
                desc: t('rule_2_desc'),
                icon: Sparkles,
              },
              {
                step: '03',
                title: t('rule_3_title'),
                desc: t('rule_3_desc'),
                icon: Video,
              },
              {
                step: '04',
                title: t('rule_4_title'),
                desc: t('rule_4_desc'),
                icon: CheckCircle2,
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
                      <span className="font-mono text-xs font-bold text-blue-400">{item.step}</span>
                      <Icon className="w-4 h-4 text-zinc-500" />
                    </div>
                    <h3 className="text-sm font-bold text-white mt-3 tracking-tight">{item.title}</h3>
                    <p className="text-xs font-mono text-zinc-400 mt-1.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. LIVE NETWORK ACTIVITY TICKER */}
        <section id="activity" className="space-y-4 scroll-mt-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                {t('ticker_title')}
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">{t('ticker_sub')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {RECENT_EXCHANGES.map((ex, idx) => (
              <div
                key={idx}
                className="drinkit-card p-4 space-y-2.5 bg-[#0e0e12] border border-white/[0.08]"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-semibold">{ex.userA} ⇄ {ex.userB}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {ex.status}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                  <span>{ex.skillA} ↔ {ex.skillB}</span>
                  <span className="text-blue-400 font-bold">{ex.score}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. CALL TO ACTION MANIFESTO */}
        <section className="drinkit-card p-8 md:p-12 text-center space-y-6 bg-gradient-to-b from-[#111116] to-[#09090b] border border-white/10">
          <div className="max-w-xl mx-auto space-y-3">
            <div className="flex justify-center">
              <Logo size={42} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-pixel font-bold text-white tracking-tight">
              {t('manifesto_title_1')}<br />
              {t('manifesto_title_2')}
            </h2>
            <p className="text-xs font-mono text-zinc-400 leading-relaxed">
              {t('manifesto_desc')}
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <Link
              href="/auth/register"
              className="px-6 py-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
            >
              {t('manifesto_btn')}
            </Link>
            <Link
              href="/discover"
              className="px-6 py-3 rounded bg-[#16161c] hover:bg-[#1c1c24] border border-white/10 text-zinc-300 font-mono text-xs transition-all"
            >
              {t('manifesto_browse')}
            </Link>
          </div>
        </section>

        {/* 7. FOOTER */}
        <footer className="pt-8 pb-12 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Logo size={18} />
            <span className="text-white font-bold tracking-tight">pixelmink</span>
            <span>•</span>
            <span>{t('slogan')}</span>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <span>•</span>
            <a
              href="https://github.com/sasahokage67/pixelmink"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
            <span>•</span>
            <Link href="/auth/login" className="text-zinc-400 hover:text-white transition-colors">
              {t('nav_signin')}
            </Link>
            <span>•</span>
            <Link href="/auth/register" className="text-blue-400 hover:underline">
              {t('nav_register')}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
