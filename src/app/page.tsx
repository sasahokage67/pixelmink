'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import Logo from '@/components/ui/Logo';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import {
  ArrowRight,
  Terminal,
  Cpu,
  Shield,
  Video,
  Layers,
  Users,
  CheckCircle2,
  Database,
  ArrowUpRight,
  Check,
  Globe,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

const CS_DOMAINS = [
  {
    code: '01',
    title: {
      en: 'Coding & Languages',
      ru: 'Кодинг и языки программирования',
      kz: 'Кодинг және бағдарламалау тілдері',
    },
    skills: ['Python (#1)', 'JavaScript (#2)', 'TypeScript (#3)', 'C++', 'Golang', 'Rust'],
    desc: {
      en: 'Full-stack engineering, systems programming, game development, mobile apps and backend services.',
      ru: 'Бэкенд, веб-разработка, системный код, мобильные приложения и алгоритмы.',
      kz: 'Бэкенд, веб-әзірлеу, жүйелік код, мобильді қосымшалар және алгоритмдер.',
    },
    peers: 42,
  },
  {
    code: '02',
    title: {
      en: 'Design, UI/UX & 3D',
      ru: 'Дизайн, UI/UX и 3D',
      kz: 'Дизайн, UI/UX және 3D',
    },
    skills: ['Figma (#1)', 'UI/UX Design', 'Photoshop', 'Blender 3D', 'Illustrator', 'Motion'],
    desc: {
      en: 'Interface design, design systems, vector art, 3D modeling, rendering and interactive motion.',
      ru: 'Дизайн интерфейсов, дизайн-системы, векторная графика, 3D-моделирование и моушн.',
      kz: 'Интерфейс дизайны, дизайн-жүйелер, векторлық графика, 3D модельдеу және моушн.',
    },
    peers: 31,
  },
  {
    code: '03',
    title: {
      en: 'Video Editing & Motion',
      ru: 'Видеомонтаж и моушн-дизайн',
      kz: 'Бейнемонтаж және моушн-дизайн',
    },
    skills: ['Premiere Pro (#1)', 'After Effects (#2)', 'DaVinci Resolve', 'CapCut/Reels', 'FL Studio'],
    desc: {
      en: 'Video post-production, color grading, visual effects (VFX), vertical content and sound design.',
      ru: 'Монтаж видео для YouTube/клиентов, цветокоррекция, спецэффекты, Reels/Shorts и сведение звука.',
      kz: 'YouTube/клиенттерге арналған бейнемонтаж, түсті түзету, арнайы эффектілер және дыбыс өңдеу.',
    },
    peers: 28,
  },
  {
    code: '04',
    title: {
      en: 'Artificial Intelligence & ML',
      ru: 'Искусственный интеллект и нейросети',
      kz: 'Жасанды интеллект және нейрожүйелер',
    },
    skills: ['Prompt Eng & ChatGPT (#1)', 'Midjourney & SD', 'PyTorch', 'LLM Agents & RAG', 'Computer Vision'],
    desc: {
      en: 'Autonomous AI agents, prompt crafting, neural network fine-tuning, generative art and deep learning.',
      ru: 'AI-агенты, промпт-инжиниринг, дообучение нейросетей, генерация графики и компьютерное зрение.',
      kz: 'AI-агенттер, промпт жазу, нейрожүйелерді оқыту, графика генерациясы және машиналық көру.',
    },
    peers: 36,
  },
  {
    code: '05',
    title: {
      en: 'Data & Cloud Infrastructure',
      ru: 'Базы данных и облачная инфраструктура',
      kz: 'Деректер қоры және бұлтты инфрақұрылым',
    },
    skills: ['PostgreSQL & SQL', 'Docker & DevOps', 'Redis', 'Kubernetes', 'Linux Kernel'],
    desc: {
      en: 'Relational databases, container orchestration, microservices architecture and cloud pipelines.',
      ru: 'Реляционные базы данных, оркестрация контейнеров, микросервисы и CI/CD автоматизация.',
      kz: 'Реляциялық деректер қоры, контейнерлерді басқару, микросервистер және CI/CD автоматтандыру.',
    },
    peers: 24,
  },
  {
    code: '06',
    title: {
      en: 'Core Theory & Cybersecurity',
      ru: 'Алгоритмы и кибербезопасность',
      kz: 'Алгоритмдер және киберқауіпсіздік',
    },
    skills: ['Algorithms & Data Structures', 'LeetCode', 'AppSec', 'Web Pentest', 'Reverse Eng'],
    desc: {
      en: 'Computer science foundations, algorithmic problem solving, security audits and vulnerability research.',
      ru: 'Фундаментальные структуры данных, решение задач LeetCode, аудит безопасности и этичный хакинг.',
      kz: 'Деректер құрылымы, LeetCode есептерін шешу, қауіпсіздік аудиті және бағдарламалық қорғау.',
    },
    peers: 19,
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { lang, t } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  if (!authLoading && user) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center font-mono text-xs text-zinc-500">
        Перенаправление в рабочий кабинет...
      </div>
    );
  }

  const FAQ_ITEMS = [
    {
      q: t('faq_q1'),
      a: t('faq_a1'),
    },
    {
      q: t('faq_q2'),
      a: t('faq_a2'),
    },
    {
      q: t('faq_q3'),
      a: t('faq_a3'),
    },
    {
      q: t('faq_q4'),
      a: t('faq_a4'),
    },
    {
      q: t('faq_q5'),
      a: t('faq_a5'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* DRINKIT-STYLE LANDING NAVBAR */}
      <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-white/[0.08] px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6 z-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={28} />
            <span className="font-pixel text-xs sm:text-sm text-white group-hover:text-blue-400 transition-colors">
              pixelmink
            </span>
          </Link>
          <span className="hidden xl:inline text-xs font-mono text-zinc-500 border-l border-white/10 pl-4">
            {t('slogan')}
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-zinc-400 absolute left-1/2 -translate-x-1/2">
          <a href="#disciplines" className="hover:text-white transition-colors">{t('nav_matrix')}</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">{t('nav_rules')}</a>
          <a href="#faq" className="hover:text-white transition-colors">{t('footer_faq')}</a>
        </nav>

        <div className="flex items-center gap-3 font-mono text-xs z-10">
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

            {/* Slogan & Bold Statement (Press Start 2P Retro Pixel Typography) */}
            <div className="space-y-4">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-pixel text-white leading-relaxed">
                {t('hero_title_1')}
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl font-pixel text-zinc-500 leading-relaxed">
                {t('hero_title_2')}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-zinc-400 font-sans max-w-2xl leading-relaxed pt-1">
              {t('hero_desc')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold tap-active transition-all shadow-lg shadow-blue-600/20"
              >
                <span>{t('hero_btn_register')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href="/matches"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#131318] hover:bg-[#181820] border border-white/[0.12] text-zinc-300 font-mono text-xs tap-active transition-all"
              >
                <span>{t('hero_btn_explore')}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
              </Link>
            </div>

            {/* Protocol Startup Spec Bar (Authentic, 3-column) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-white/[0.08]">
              <div className="p-3.5 rounded-xl bg-[#111114] border border-white/[0.08]">
                <div className="text-[11px] font-mono uppercase text-zinc-500 tracking-wider">{t('spec_stage_title')}</div>
                <div className="text-sm font-mono font-bold text-white mt-1">{t('spec_stage_val')}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#111114] border border-white/[0.08]">
                <div className="text-[11px] font-mono uppercase text-zinc-500 tracking-wider">{t('spec_model_title')}</div>
                <div className="text-sm font-mono font-bold text-emerald-400 mt-1">{t('spec_model_val')}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#111114] border border-white/[0.08]">
                <div className="text-[11px] font-mono uppercase text-zinc-500 tracking-wider">{t('spec_cost_title')}</div>
                <div className="text-sm font-mono font-bold text-blue-400 mt-1">{t('spec_cost_val')}</div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. COMPUTER SCIENCE DISCIPLINE MATRIX (BENTO GRID) */}
        <section id="disciplines" className="space-y-6 scroll-mt-20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider">
                {t('cat_tag')}
              </div>
              <h2 className="text-sm sm:text-base md:text-lg font-pixel text-white leading-relaxed mt-1">
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
            <h2 className="text-sm sm:text-base md:text-lg font-pixel text-white leading-relaxed mt-1">
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

        {/* 5. FREQUENTLY ASKED QUESTIONS (FAQ) */}
        <section id="faq" className="space-y-6 scroll-mt-20">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <div className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider">
              {t('faq_tag')}
            </div>
            <h2 className="text-sm sm:text-base md:text-lg font-pixel text-white leading-relaxed mt-1">
              {t('faq_title')}
            </h2>
            <p className="text-xs font-mono text-zinc-400 pt-1">
              {t('faq_desc')}
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="drinkit-card overflow-hidden bg-[#0d0d12] border border-white/[0.08] transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 tap-active"
                  >
                    <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-2.5">
                      <span className="text-blue-400 text-xs">0{idx + 1}.</span>
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-blue-400' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs font-mono text-zinc-400 leading-relaxed border-t border-white/[0.04]">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. CALL TO ACTION MANIFESTO */}
        <section className="drinkit-card p-8 md:p-12 text-center space-y-6 bg-gradient-to-b from-[#111116] to-[#09090b] border border-white/10">
          <div className="max-w-xl mx-auto space-y-3">
            <div className="flex justify-center">
              <Logo size={42} />
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-pixel text-white leading-relaxed">
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
              href="/matches"
              className="px-6 py-3 rounded bg-[#16161c] hover:bg-[#1c1c24] border border-white/10 text-zinc-300 font-mono text-xs transition-all"
            >
              {t('manifesto_browse')}
            </Link>
          </div>
        </section>

        {/* 7. BOTTOM PANEL & COMPREHENSIVE FOOTER */}
        <footer className="pt-12 pb-16 border-t border-white/[0.08] space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-xs font-mono">
            {/* Brand Column */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <Logo size={26} />
                <span className="font-pixel text-xs sm:text-sm text-white">pixelmink</span>
              </div>
              <p className="text-zinc-400 font-sans leading-relaxed text-xs max-w-sm">
                {t('footer_brand_desc')}
              </p>
            </div>

            {/* Platform Navigation */}
            <div className="md:col-span-2 space-y-3">
              <div className="text-[10px] uppercase font-bold text-white tracking-wider">
                {t('footer_col_platform')}
              </div>
              <ul className="space-y-2 text-zinc-400">
                <li>
                  <a href="#disciplines" className="hover:text-white transition-colors">
                    {t('nav_matrix')}
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-white transition-colors">
                    {t('nav_rules')}
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">
                    {t('footer_faq')}
                  </a>
                </li>
                <li>
                  <Link href="/matches" className="hover:text-white transition-colors">
                    {t('hero_btn_explore')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal & Privacy */}
            <div className="md:col-span-3 space-y-3">
              <div className="text-[10px] uppercase font-bold text-white tracking-wider">
                {t('footer_col_legal')}
              </div>
              <ul className="space-y-2 text-zinc-400">
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-white text-zinc-300 font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    <span>{t('footer_privacy')}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    {t('footer_terms')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources & Language Switcher */}
            <div className="md:col-span-2 space-y-3">
              <div className="text-[10px] uppercase font-bold text-white tracking-wider">
                {t('footer_col_resources')}
              </div>
              <div className="space-y-2.5">
                <LanguageSwitcher />
                <a
                  href="https://github.com/sasahokage67/pixelmink"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors pt-1"
                >
                  <Globe className="w-3.5 h-3.5 text-zinc-400" />
                  <span>GitHub Repo</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-zinc-500">
            <div>
              © 2026 pixelmink. {t('footer_rights')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-600">Built for Computer Science Engineers</span>
              <span>•</span>
              <a
                href="https://github.com/sasahokage67/pixelmink"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                v1.0 Public Release
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
