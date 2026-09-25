'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import Logo from '@/components/ui/Logo';
import Identicon from '@/components/ui/Identicon';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import {
  Lock,
  Mail,
  User,
  Cpu,
  Terminal,
  Database,
  Shield,
  Layers,
  Sparkles,
  Check,
  Plus,
  ArrowRight,
  ArrowLeft,
  Binary,
  Flame,
  Search,
  CheckCircle2,
  Zap,
  Globe,
} from 'lucide-react';

interface SkillItem {
  name: string;
  category: 'Coding' | 'Design' | 'Video' | 'AI';
  popularityRank: number;
  tag: string;
}

const CS_SKILL_CATALOG: SkillItem[] = [
  // 1. ЯЗЫКИ И КОДИНГ (от самых популярных к нишевым)
  { name: 'Python', category: 'Coding', popularityRank: 1, tag: '#1 Топ • AI & Backend' },
  { name: 'JavaScript', category: 'Coding', popularityRank: 2, tag: '#2 Топ • Web & Frontend' },
  { name: 'TypeScript', category: 'Coding', popularityRank: 3, tag: '#3 Топ • React & Next.js' },
  { name: 'C++', category: 'Coding', popularityRank: 4, tag: '#4 Популярно • GameDev & Speed' },
  { name: 'C# / .NET', category: 'Coding', popularityRank: 5, tag: '#5 Популярно • Unity & Backend' },
  { name: 'Java', category: 'Coding', popularityRank: 6, tag: '#6 Популярно • Enterprise & Android' },
  { name: 'Golang', category: 'Coding', popularityRank: 7, tag: '#7 Популярно • Микросервисы' },
  { name: 'Rust', category: 'Coding', popularityRank: 8, tag: '#8 Трендовый • Systems & Safety' },
  { name: 'PHP', category: 'Coding', popularityRank: 9, tag: '#9 Популярно • Web & Laravel' },
  { name: 'Kotlin / Swift', category: 'Coding', popularityRank: 10, tag: '#10 Mobile • iOS & Android' },
  { name: 'SQL & Базы данных', category: 'Coding', popularityRank: 11, tag: '#11 База • PostgreSQL & Data' },
  { name: 'Docker & DevOps', category: 'Coding', popularityRank: 12, tag: '#12 Инфраструктура • CI/CD' },
  { name: 'HTML & CSS / Tailwind', category: 'Coding', popularityRank: 13, tag: '#13 Верстка • Адаптивный веб' },
  { name: 'Алгоритмы и структуры данных', category: 'Coding', popularityRank: 14, tag: '#14 Фундамент • LeetCode & Big O' },
  { name: 'Linux Kernel & Bash', category: 'Coding', popularityRank: 15, tag: '#15 Системное • Терминал & OS' },
  { name: 'Low-Level & Ассемблер', category: 'Coding', popularityRank: 16, tag: '#16 Нишевое • Reverse & Ядро' },

  // 2. ДИЗАЙН И 3D (от самых популярных к нишевым)
  { name: 'Figma', category: 'Design', popularityRank: 1, tag: '#1 Топ • UI/UX & Прототипы' },
  { name: 'UI/UX Дизайн', category: 'Design', popularityRank: 2, tag: '#2 Топ • Исследования & Сетки' },
  { name: 'Photoshop', category: 'Design', popularityRank: 3, tag: '#3 Топ • Растр & Графика' },
  { name: 'Blender 3D', category: 'Design', popularityRank: 4, tag: '#4 Трендовый • 3D Модели & Рендер' },
  { name: 'Illustrator', category: 'Design', popularityRank: 5, tag: '#5 Популярно • Вектор & Логотипы' },
  { name: 'Веб-дизайн & Тильда', category: 'Design', popularityRank: 6, tag: '#6 Популярно • Лендинги & Типографика' },
  { name: 'Motion Design', category: 'Design', popularityRank: 7, tag: '#7 Популярно • Анимация интерфейсов' },
  { name: 'Cinema 4D & Octane', category: 'Design', popularityRank: 8, tag: '#8 Pro • 3D Motion & VFX' },
  { name: '3D Скульптинг (ZBrush)', category: 'Design', popularityRank: 9, tag: '#9 Нишевое • Персонажи & HighPoly' },

  // 3. МОНТАЖ И ВИДЕО (от самых популярных к нишевым)
  { name: 'Premiere Pro', category: 'Video', popularityRank: 1, tag: '#1 Топ • Видеомонтаж & YouTube' },
  { name: 'After Effects', category: 'Video', popularityRank: 2, tag: '#2 Топ • VFX & Моушн-графика' },
  { name: 'DaVinci Resolve', category: 'Video', popularityRank: 3, tag: '#3 Трендовый • Цветокор & Монтаж' },
  { name: 'CapCut / Reels / Shorts', category: 'Video', popularityRank: 4, tag: '#4 Топ • Вертикальный контент' },
  { name: 'FL Studio & Звук (SFX)', category: 'Video', popularityRank: 5, tag: '#5 Популярно • Саунд-дизайн & Голос' },
  { name: 'Сценарии & Сторителлинг', category: 'Video', popularityRank: 6, tag: '#6 База • Режиссура & Драматургия' },
  { name: 'Color Grading & LUTs', category: 'Video', popularityRank: 7, tag: '#7 Pro • Кинематографичный цвет' },
  { name: '3D Трекинг & Кеинг', category: 'Video', popularityRank: 8, tag: '#8 Нишевое • Хромакей & Композитинг' },

  // 4. ИИ И НЕЙРОСЕТИ (от самых популярных к нишевым)
  { name: 'Prompt Engineering & ChatGPT', category: 'AI', popularityRank: 1, tag: '#1 Топ • Промпты & GPT-4' },
  { name: 'Midjourney & Stable Diffusion', category: 'AI', popularityRank: 2, tag: '#2 Топ • Генерация & ComfyUI' },
  { name: 'PyTorch & Deep Learning', category: 'AI', popularityRank: 3, tag: '#3 Pro • Обучение нейросетей' },
  { name: 'AI Агенты & RAG Архитектура', category: 'AI', popularityRank: 4, tag: '#4 Трендовый • LLM & Векторные БД' },
  { name: 'Computer Vision & OpenCV', category: 'AI', popularityRank: 5, tag: '#5 Нишевое • Распознавание объектов' },
];

const STOPWORDS = new Set([
  'and', 'the', 'for', 'with', 'from', 'this', 'that', 'have', 'want', 'what', 'like', 'good', 'will',
  'into', 'some', 'your', 'about', 'also', 'over', 'both', 'their', 'been', 'were', 'which', 'where',
  'after', 'before', 'more', 'most', 'very', 'just', 'when', 'then', 'than', 'them', 'these', 'those',
  'и', 'в', 'на', 'с', 'по', 'к', 'для', 'от', 'до', 'из', 'у', 'о', 'об', 'за', 'при', 'что', 'как', 'так'
]);

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { t, lang } = useLanguage();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState(
    'Systems programmer building high-throughput microservices and distributed databases. Looking to exchange Rust knowledge for PyTorch deep learning architecture.'
  );

  const [teachSkills, setTeachSkills] = useState<string[]>([
    'Python',
    'Algorithms & Data Structures',
  ]);
  const [learnSkills, setLearnSkills] = useState<string[]>([
    'Rust',
    'PyTorch & AI',
  ]);

  const [activeSkillTab, setActiveSkillTab] = useState<'TEACH' | 'LEARN'>('TEACH');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'Coding' | 'Design' | 'Video' | 'AI'>('ALL');
  const [skillSearch, setSkillSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Extract keywords dynamically from bio
  const extractedKeywords = useMemo(() => {
    if (!bio) return [];
    const words = bio
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\u0400-\u04FF]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w));
    return Array.from(new Set(words)).slice(0, 6);
  }, [bio]);

  // Filter skills by category and search, strictly sorted by popularity rank (1 to N)
  const filteredSkills = useMemo(() => {
    let list = CS_SKILL_CATALOG;
    if (selectedCategory !== 'ALL') {
      list = list.filter((s) => s.category === selectedCategory);
    }
    if (skillSearch.trim()) {
      const query = skillSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.category.toLowerCase().includes(query) ||
          s.tag.toLowerCase().includes(query)
      );
    }
    return list.slice().sort((a, b) => a.popularityRank - b.popularityRank);
  }, [selectedCategory, skillSearch]);

  const toggleTeachSkill = (skillName: string) => {
    if (teachSkills.includes(skillName)) {
      setTeachSkills(teachSkills.filter((s) => s !== skillName));
    } else {
      setTeachSkills([...teachSkills, skillName]);
    }
  };

  const toggleLearnSkill = (skillName: string) => {
    if (learnSkills.includes(skillName)) {
      setLearnSkills(learnSkills.filter((s) => s !== skillName));
    } else {
      setLearnSkills([...learnSkills, skillName]);
    }
  };

  // Real-time match estimation
  const matchScore = useMemo(() => {
    const base = 45;
    const teachBonus = Math.min(teachSkills.length * 9, 27);
    const learnBonus = Math.min(learnSkills.length * 9, 27);
    const kwBonus = Math.min(extractedKeywords.length * 3, 15);
    return Math.min(base + teachBonus + learnBonus + kwBonus, 98);
  }, [teachSkills, learnSkills, extractedKeywords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teachSkills.length === 0 || learnSkills.length === 0) {
      setError(
        lang === 'ru'
          ? 'Выберите как минимум 1 навык для обучения и 1 для изучения.'
          : lang === 'kz'
          ? 'Кем дегенде 1 үйрететін және 1 оқитын дағдыны таңдаңыз.'
          : 'Select at least one skill to teach and one to learn.'
      );
      return;
    }

    setLoading(true);
    setError('');

    const ok = await register({
      name,
      email,
      password,
      bio,
      teachSkills,
      learnSkills,
      teachSkill: teachSkills[0],
      learnSkill: learnSkills[0],
    });

    if (ok) {
      router.push('/dashboard');
    } else {
      setError(
        lang === 'ru'
          ? 'Ошибка регистрации. Возможно, email уже используется.'
          : lang === 'kz'
          ? 'Тіркелу қатесі. Бұл email әлдеқашан тіркелген болуы мүмкін.'
          : 'Registration failed. Email may already be in use.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#09090b]">
      {/* Top minimal bar with Language Switcher & Home link */}
      <header className="px-4 md:px-8 py-3.5 border-b border-white/[0.08] flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <Logo size={24} />
          <span className="font-pixel text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
            pixelmink
          </span>
          <span className="hidden sm:inline text-xs font-mono text-zinc-500 border-l border-white/10 pl-3 ml-1">
            {t('slogan')}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/"
            className="text-xs font-mono text-zinc-400 hover:text-white transition-colors"
          >
            ← {t('nav_landing')}
          </Link>
        </div>
      </header>

      {/* Main split-screen registration canvas */}
      <div className="flex-1 flex items-center justify-center py-8 px-4">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: BRAND MANIFESTO & LIVE MATCH PREVIEW (DRINKIT MINIMALISM) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#111115] border border-white/10 text-xs font-mono text-blue-400">
                <Binary className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('protocol_tag')}</span>
              </div>

              <div className="text-xl sm:text-2xl font-pixel font-bold text-white leading-tight">
                {t('hero_title_1')}<br />
                <span className="text-zinc-500">{t('hero_title_2')}</span>
              </div>

              <p className="text-xs font-mono text-zinc-400 leading-relaxed pt-1">
                {t('hero_desc')}
              </p>
            </div>

            {/* Real-time Match Radar Card */}
            <div className="drinkit-card p-5 bg-[#0e0e13] border border-white/10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <Identicon name={name || 'you'} size={36} />
                  <div>
                    <div className="text-xs font-bold text-white font-mono">
                      {name || 'Kim Alexandr'}
                    </div>
                    <div className="text-[10px] font-mono text-blue-400">
                      {t('reg_identicon_preview')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    {matchScore}% Match
                  </span>
                </div>
              </div>

              {/* Match Power Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1 text-zinc-300">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    {t('reg_calc_power')}
                  </span>
                  <span className="font-bold text-blue-400">{matchScore}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${matchScore}%` }}
                  />
                </div>
              </div>

              {/* Instant Peer Overlap Teaser */}
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
                  {t('reg_instant_overlap')}
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-zinc-300">{t('reg_can_teach')} ({teachSkills.length}):</span>
                    <span className="text-emerald-400 font-semibold truncate max-w-[170px]">
                      {teachSkills.slice(0, 2).join(', ') || 'Select skills'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-zinc-300">{t('reg_want_learn')} ({learnSkills.length}):</span>
                    <span className="text-blue-400 font-semibold truncate max-w-[170px]">
                      {learnSkills.slice(0, 2).join(', ') || 'Select skills'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Extracted Bio Keywords Preview */}
              {extractedKeywords.length > 0 && (
                <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                  <div className="text-[10px] font-mono text-zinc-500">
                    {t('reg_extracted_keywords')}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {extractedKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Protocol Welcome Perk */}
              <div className="flex items-center gap-2 p-2.5 rounded bg-blue-600/10 border border-blue-500/20 text-xs font-mono text-blue-300">
                <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{t('reg_bonus_badge')}</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: STEPPED REGISTRATION FORM */}
          <div className="lg:col-span-7">
            <div className="drinkit-card p-6 md:p-8 bg-[#0d0d12] border border-white/10 shadow-2xl space-y-6">
              {/* Step Selector Bar */}
              <div className="grid grid-cols-3 gap-2 pb-4 border-b border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`py-2 px-2 text-center rounded text-xs font-mono transition-all ${
                    step === 1
                      ? 'bg-blue-600 text-white font-bold border border-blue-400'
                      : 'text-zinc-400 hover:text-white bg-[#141419]'
                  }`}
                >
                  {t('reg_identity_step')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (name && email && password) setStep(2);
                    else setError(lang === 'ru' ? 'Заполните учетные данные.' : 'Fill in credentials first.');
                  }}
                  className={`py-2 px-2 text-center rounded text-xs font-mono transition-all ${
                    step === 2
                      ? 'bg-blue-600 text-white font-bold border border-blue-400'
                      : 'text-zinc-400 hover:text-white bg-[#141419]'
                  }`}
                >
                  {t('reg_skills_step')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (name && email && password) setStep(3);
                    else setError(lang === 'ru' ? 'Заполните учетные данные.' : 'Fill in credentials first.');
                  }}
                  className={`py-2 px-2 text-center rounded text-xs font-mono transition-all ${
                    step === 3
                      ? 'bg-blue-600 text-white font-bold border border-blue-400'
                      : 'text-zinc-400 hover:text-white bg-[#141419]'
                  }`}
                >
                  {t('reg_bio_step')}
                </button>
              </div>

              {error && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono text-center">
                  {error}
                </div>
              )}

              {/* STEP 1: CREDENTIALS */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-white font-mono tracking-tight">
                      {t('reg_cred_title')}
                    </h2>
                    <p className="text-xs font-mono text-zinc-400 mt-0.5">
                      {t('reg_cred_desc')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                      {t('reg_name_label')}
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kim Alexandr"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#16161c] border border-white/[0.1] focus:border-blue-500 rounded px-3 py-2.5 pl-9 text-xs text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                      {t('reg_email_label')}
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="email"
                        required
                        placeholder="alex@domain.dev"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#16161c] border border-white/[0.1] focus:border-blue-500 rounded px-3 py-2.5 pl-9 text-xs text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                      {t('reg_pass_label')}
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#16161c] border border-white/[0.1] focus:border-blue-500 rounded px-3 py-2.5 pl-9 text-xs text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!name.trim() || !email.trim() || !password.trim()) {
                          setError(lang === 'ru' ? 'Заполните все поля учетных данных.' : 'Fill in all credential fields.');
                          return;
                        }
                        setError('');
                        setStep(2);
                      }}
                      className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
                    >
                      <span>{t('reg_btn_to_skills')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CS SKILLS SELECTION */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-white font-mono tracking-tight">
                      {t('reg_matrix_title')}
                    </h2>
                    <p className="text-xs font-mono text-zinc-400 mt-0.5">
                      {t('reg_matrix_desc')}
                    </p>
                  </div>

                  {/* Sub-tab Switcher: Teach vs Learn */}
                  <div className="flex gap-2 p-1 bg-[#141419] rounded border border-white/5">
                    <button
                      type="button"
                      onClick={() => setActiveSkillTab('TEACH')}
                      className={`flex-1 py-2 px-3 rounded text-xs font-mono font-medium transition-all flex items-center justify-center gap-2 ${
                        activeSkillTab === 'TEACH'
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t('reg_can_teach')} ({teachSkills.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSkillTab('LEARN')}
                      className={`flex-1 py-2 px-3 rounded text-xs font-mono font-medium transition-all flex items-center justify-center gap-2 ${
                        activeSkillTab === 'LEARN'
                          ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5 text-blue-400" />
                      <span>{t('reg_want_learn')} ({learnSkills.length})</span>
                    </button>
                  </div>

                  {/* Category Filter Pills (Coding, Design, Video, AI) */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'ALL', label: t('filter_all'), count: CS_SKILL_CATALOG.length },
                      { id: 'Coding', label: t('filter_coding'), count: CS_SKILL_CATALOG.filter((s) => s.category === 'Coding').length },
                      { id: 'Design', label: t('filter_design'), count: CS_SKILL_CATALOG.filter((s) => s.category === 'Design').length },
                      { id: 'Video', label: t('filter_video'), count: CS_SKILL_CATALOG.filter((s) => s.category === 'Video').length },
                      { id: 'AI', label: t('filter_ai'), count: CS_SKILL_CATALOG.filter((s) => s.category === 'AI').length },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id as any)}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                          selectedCategory === cat.id
                            ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20'
                            : 'bg-[#141419] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span className={`text-[9px] px-1 rounded ${selectedCategory === cat.id ? 'bg-black/20 text-white' : 'bg-white/5 text-zinc-500'}`}>
                          {cat.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Search Filter */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      placeholder={t('reg_search_placeholder')}
                      className="w-full bg-[#16161c] border border-white/[0.08] focus:border-blue-500 rounded px-3 py-2 pl-9 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  {/* Skills Grid */}
                  <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {filteredSkills.map((s) => {
                      const isSelected =
                        activeSkillTab === 'TEACH'
                          ? teachSkills.includes(s.name)
                          : learnSkills.includes(s.name);

                      const categoryColors = {
                        Coding: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                        Design: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                        Video: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                        AI: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
                      };

                      return (
                        <button
                          type="button"
                          key={s.name}
                          onClick={() =>
                            activeSkillTab === 'TEACH'
                              ? toggleTeachSkill(s.name)
                              : toggleLearnSkill(s.name)
                          }
                          className={`p-2.5 rounded text-left border transition-all text-xs font-mono flex flex-col justify-between ${
                            isSelected
                              ? activeSkillTab === 'TEACH'
                                ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm shadow-emerald-500/10'
                                : 'bg-blue-500/15 border-blue-500/50 text-white shadow-sm shadow-blue-500/10'
                              : 'bg-[#141419] border-white/[0.06] text-zinc-400 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-semibold leading-snug line-clamp-1">{s.name}</span>
                            {isSelected ? (
                              <Check
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  activeSkillTab === 'TEACH' ? 'text-emerald-400' : 'text-blue-400'
                                }`}
                              />
                            ) : (
                              <Plus className="w-3.5 h-3.5 shrink-0 text-zinc-600" />
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[9px]">
                            <span className={`px-1.5 py-0.5 rounded border text-[9px] ${categoryColors[s.category]}`}>
                              {s.category}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5 truncate max-w-[130px]">
                              {s.tag}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs transition-all flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{t('btn_back')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (teachSkills.length === 0 || learnSkills.length === 0) {
                          setError(lang === 'ru' ? 'Выберите 1 навык для обучения и 1 для изучения.' : 'Pick at least 1 teaching and 1 learning skill.');
                          return;
                        }
                        setError('');
                        setStep(3);
                      }}
                      className="flex-1 py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <span>{t('reg_btn_to_bio')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: BIO & CONFIRMATION */}
              {step === 3 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-white font-mono tracking-tight">
                      {t('reg_bio_title')}
                    </h2>
                    <p className="text-xs font-mono text-zinc-400 mt-0.5">
                      {t('reg_bio_desc')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                      {t('reg_bio_label')}
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t('reg_bio_placeholder')}
                      className="w-full bg-[#16161c] border border-white/[0.1] focus:border-blue-500 rounded p-3 text-xs text-white outline-none font-mono resize-none leading-relaxed"
                    />
                  </div>

                  {/* Summary Box (Calculated Peer Match line deleted as requested) */}
                  <div className="p-4 rounded bg-[#111116] border border-white/[0.08] space-y-2 text-xs font-mono">
                    <div className="text-zinc-400">
                      {t('reg_can_teach')}:{' '}
                      <span className="text-emerald-400 font-semibold">
                        {teachSkills.join(', ')}
                      </span>
                    </div>
                    <div className="text-zinc-400">
                      {t('reg_want_learn')}:{' '}
                      <span className="text-blue-400 font-semibold">
                        {learnSkills.join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs transition-all flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{t('btn_back')}</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                    >
                      {loading ? 'Creating Account...' : t('reg_submit_btn')}
                    </button>
                  </div>
                </form>
              )}

              <div className="text-center text-xs font-mono text-zinc-500 pt-2 border-t border-white/[0.06]">
                {t('reg_already_have')}{' '}
                <Link href="/auth/login" className="text-blue-400 hover:underline">
                  {t('nav_signin')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
