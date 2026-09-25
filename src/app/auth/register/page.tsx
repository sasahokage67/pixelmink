'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/ui/Logo';
import Identicon from '@/components/ui/Identicon';
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
  category: 'Systems' | 'AI & ML' | 'Theory' | 'DevOps' | 'Data' | 'Languages';
  tag: string;
}

const CS_SKILL_CATALOG: SkillItem[] = [
  // Low-Level Systems
  { name: 'Rust', category: 'Systems', tag: 'Memory Safe' },
  { name: 'Golang', category: 'Systems', tag: 'Concurrency' },
  { name: 'C/C++ & Systems', category: 'Systems', tag: 'Kernel / OS' },
  { name: 'Linux Kernel & OS', category: 'Systems', tag: 'eBPF / POSIX' },

  // AI & ML
  { name: 'PyTorch & AI', category: 'AI & ML', tag: 'Deep Learning' },
  { name: 'Prompt Engineering & LLMs', category: 'AI & ML', tag: 'RAG & Agents' },
  { name: 'Computer Vision & OpenCV', category: 'AI & ML', tag: 'YOLO / Tensors' },

  // Theory & Algorithms
  { name: 'Algorithms & Data Structures', category: 'Theory', tag: 'O(log N)' },
  { name: 'Linear Algebra & 3D Math', category: 'Theory', tag: 'Tensors' },

  // DevOps & Cloud
  { name: 'Docker & Containers', category: 'DevOps', tag: 'Rootless' },
  { name: 'Kubernetes', category: 'DevOps', tag: 'Cluster' },
  { name: 'Git & GitHub Workflows', category: 'DevOps', tag: 'CI/CD' },

  // Databases & Security
  { name: 'PostgreSQL & SQL', category: 'Data', tag: 'ACID / Index' },
  { name: 'Distributed Systems', category: 'Data', tag: 'Consensus' },
  { name: 'Cybersecurity & Pentest', category: 'Data', tag: 'AppSec' },

  // Languages
  { name: 'Python', category: 'Languages', tag: 'Backend' },
  { name: 'TypeScript', category: 'Languages', tag: 'Strict Types' },
  { name: 'React & Next.js', category: 'Languages', tag: 'App Router' },
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

  // Filter skills by category or search
  const filteredSkills = useMemo(() => {
    if (!skillSearch.trim()) return CS_SKILL_CATALOG;
    const query = skillSearch.toLowerCase();
    return CS_SKILL_CATALOG.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query) ||
        s.tag.toLowerCase().includes(query)
    );
  }, [skillSearch]);

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
      setError('Select at least one skill to teach and one to learn.');
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
      setError('Registration failed. Email may already be in use.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[92vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: BRAND MANIFESTO & LIVE MATCH PREVIEW (DRINKIT MINIMALISM) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="space-y-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 font-pixel text-xl font-bold text-white group tracking-tight"
            >
              <Logo size={32} />
              <span>
                pixelmink<span className="text-blue-500">.</span>
              </span>
            </Link>

            <div className="text-xs font-mono text-zinc-400">
              “Your skills for theirs. No money, just knowledge.”
            </div>

            <p className="text-xs font-mono text-zinc-500 leading-relaxed pt-1">
              Join the barter protocol for Computer Science & Engineering. Zero fiat currency, zero platform cuts.
              1 hour of deep technical mentorship earned = 1 hour unlocked across the peer network.
            </p>
          </div>

          {/* Real-time Match Radar Card */}
          <div className="drinkit-card p-5 bg-[#0e0e13] border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Identicon name={name || 'you'} size={32} />
                <div>
                  <div className="text-xs font-bold text-white font-mono">
                    {name || 'New Peer'}
                  </div>
                  <div className="text-[10px] font-mono text-blue-400">
                    Live Identicon Preview
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
                  Calculated Peer Match Power
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
                Instant Network Overlap:
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-zinc-300">Teaching ({teachSkills.length}):</span>
                  <span className="text-emerald-400 font-semibold truncate max-w-[160px]">
                    {teachSkills.slice(0, 2).join(', ') || 'Select skills'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-zinc-300">Learning ({learnSkills.length}):</span>
                  <span className="text-blue-400 font-semibold truncate max-w-[160px]">
                    {learnSkills.slice(0, 2).join(', ') || 'Select skills'}
                  </span>
                </div>
              </div>
            </div>

            {/* Extracted Bio Keywords Preview */}
            {extractedKeywords.length > 0 && (
              <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                <div className="text-[10px] font-mono text-zinc-500">
                  Extracted Bio Keywords (used in matching):
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
              <span>Includes +5 XCredits to immediately book your first 1-on-1 session.</span>
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
                01 // Identity
              </button>
              <button
                type="button"
                onClick={() => {
                  if (name && email && password) setStep(2);
                  else setError('Please fill in your credentials first.');
                }}
                className={`py-2 px-2 text-center rounded text-xs font-mono transition-all ${
                  step === 2
                    ? 'bg-blue-600 text-white font-bold border border-blue-400'
                    : 'text-zinc-400 hover:text-white bg-[#141419]'
                }`}
              >
                02 // CS Skills
              </button>
              <button
                type="button"
                onClick={() => {
                  if (name && email && password) setStep(3);
                  else setError('Please fill in your credentials first.');
                }}
                className={`py-2 px-2 text-center rounded text-xs font-mono transition-all ${
                  step === 3
                    ? 'bg-blue-600 text-white font-bold border border-blue-400'
                    : 'text-zinc-400 hover:text-white bg-[#141419]'
                }`}
              >
                03 // Bio & Match
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
                    Developer Credentials
                  </h2>
                  <p className="text-xs font-mono text-zinc-400 mt-0.5">
                    Your handle is paired with a GitHub-style Identicon. No real photo required.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                    Full Name or Engineering Handle
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Linus Chen"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#16161c] border border-white/[0.1] focus:border-blue-500 rounded px-3 py-2.5 pl-9 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="email"
                      required
                      placeholder="linus@domain.dev"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#16161c] border border-white/[0.1] focus:border-blue-500 rounded px-3 py-2.5 pl-9 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                    Password
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
                        setError('Fill in all credential fields before continuing.');
                        return;
                      }
                      setError('');
                      setStep(2);
                    }}
                    className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
                  >
                    <span>Proceed to CS Topics (02)</span>
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
                    Computer Science Matrix
                  </h2>
                  <p className="text-xs font-mono text-zinc-400 mt-0.5">
                    Select the topics you can mentor in, and the skills you want to learn.
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
                    <span>I Can Teach ({teachSkills.length})</span>
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
                    <span>I Want to Learn ({learnSkills.length})</span>
                  </button>
                </div>

                {/* Search Filter */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Search CS skills (e.g. Rust, PyTorch, Concurrency)..."
                    className="w-full bg-[#16161c] border border-white/[0.08] focus:border-blue-500 rounded px-3 py-2 pl-9 text-xs text-white outline-none font-mono"
                  />
                </div>

                {/* Skills Grid */}
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {filteredSkills.map((s) => {
                    const isSelected =
                      activeSkillTab === 'TEACH'
                        ? teachSkills.includes(s.name)
                        : learnSkills.includes(s.name);

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
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                              : 'bg-blue-500/15 border-blue-500/50 text-white'
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
                        <div className="mt-1 flex items-center justify-between text-[9px] text-zinc-500">
                          <span>{s.category}</span>
                          <span className="px-1 py-0.2 rounded bg-white/5 text-zinc-400">
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
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (teachSkills.length === 0 || learnSkills.length === 0) {
                        setError('Pick at least 1 teaching skill and 1 learning skill.');
                        return;
                      }
                      setError('');
                      setStep(3);
                    }}
                    className="flex-1 py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Bio & Matching (03)</span>
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
                    Engineering Bio & Semantic Match
                  </h2>
                  <p className="text-xs font-mono text-zinc-400 mt-0.5">
                    Describe your tech background. The engine performs token intersection against other peers.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                    Engineering Bio / Current Focus
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe what you are engineering or studying (e.g. distributed Raft consensus in Rust, PyTorch transformer fine-tuning)..."
                    className="w-full bg-[#16161c] border border-white/[0.1] focus:border-blue-500 rounded p-3 text-xs text-white outline-none font-mono resize-none leading-relaxed"
                  />
                </div>

                {/* Summary Box */}
                <div className="p-4 rounded bg-[#111116] border border-white/[0.08] space-y-2 text-xs font-mono">
                  <div className="text-zinc-400">
                    Teaching:{' '}
                    <span className="text-emerald-400 font-semibold">
                      {teachSkills.join(', ')}
                    </span>
                  </div>
                  <div className="text-zinc-400">
                    Learning:{' '}
                    <span className="text-blue-400 font-semibold">
                      {learnSkills.join(', ')}
                    </span>
                  </div>
                  <div className="text-zinc-400">
                    Calculated Peer Match:{' '}
                    <span className="text-white font-bold">{matchScore}%</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs transition-all flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                  >
                    {loading ? 'Creating Account...' : 'Complete Profile & Claim 5 XC'}
                  </button>
                </div>
              </form>
            )}

            <div className="text-center text-xs font-mono text-zinc-500 pt-2 border-t border-white/[0.06]">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-400 hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
