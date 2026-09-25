'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/ui/Logo';
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
} from 'lucide-react';

interface SkillOption {
  name: string;
  category: string;
  badge: string;
}

const CS_SKILL_CATALOG: SkillOption[] = [
  // Algorithms & Theory
  { name: 'Algorithms & Data Structures', category: 'Theory & Core', badge: 'O(log N)' },
  { name: 'Linear Algebra & 3D Math', category: 'Theory & Core', badge: 'Matrix' },

  // Systems & Low-Level
  { name: 'Rust', category: 'Systems & OS', badge: 'Memory-Safe' },
  { name: 'Golang', category: 'Systems & OS', badge: 'Concurrency' },
  { name: 'C/C++ & Systems', category: 'Systems & OS', badge: 'Kernel' },

  // AI & Machine Learning
  { name: 'PyTorch & AI', category: 'AI & Data Science', badge: 'Neural Nets' },
  { name: 'Prompt Engineering & LLMs', category: 'AI & Data Science', badge: 'RAG & Agents' },
  { name: 'Computer Vision & OpenCV', category: 'AI & Data Science', badge: 'YOLO/Tensors' },

  // DevOps & Distributed Systems
  { name: 'Docker & Containers', category: 'DevOps & Infra', badge: 'Rootless' },
  { name: 'Kubernetes', category: 'DevOps & Infra', badge: 'Cluster' },
  { name: 'Git & GitHub Workflows', category: 'DevOps & Infra', badge: 'CI/CD' },

  // Databases & Security
  { name: 'PostgreSQL & SQL', category: 'Data & Security', badge: 'ACID' },
  { name: 'Cybersecurity & Pentest', category: 'Data & Security', badge: 'AppSec' },

  // Languages & Full-Stack
  { name: 'Python', category: 'Languages', badge: 'Backend' },
  { name: 'TypeScript', category: 'Languages', badge: 'Strict Types' },
  { name: 'React & Next.js', category: 'Languages', badge: 'App Router' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState(
    'Systems programmer focusing on high-throughput services, concurrency, and distributed databases.'
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
  const estimateMatchScore = () => {
    const base = 40;
    const teachCount = teachSkills.length;
    const learnCount = learnSkills.length;
    const bioLength = bio.trim().length;

    let score = base + teachCount * 8 + learnCount * 8;
    if (bioLength > 30) score += 12;
    if (teachSkills.includes('Rust') || teachSkills.includes('Python')) score += 6;
    if (learnSkills.includes('PyTorch & AI') || learnSkills.includes('Kubernetes')) score += 6;

    return Math.min(score, 97);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teachSkills.length === 0 || learnSkills.length === 0) {
      setError('Please select at least one skill to teach and one to learn.');
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
    <div className="min-h-[90vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-2xl font-bold text-white tracking-tight group"
          >
            <Logo size={34} />
            <span>
              pixelmink<span className="text-blue-500">.</span>
            </span>
          </Link>
          <div className="text-xs font-mono text-zinc-400">
            “Your skills for theirs. No money, just knowledge.”
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-white/10 bg-[#121217] text-[10px] font-mono text-zinc-300">
            <Binary className="w-3 h-3 text-blue-400" />
            <span>Computer Science Peer Exchange Network</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono text-center">
            {error}
          </div>
        )}

        {/* Multi-step Form Container */}
        <div className="drinkit-card p-6 border border-white/10 bg-[#0d0d12] shadow-2xl space-y-6">
          {/* Step indicator */}
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-white/[0.08]">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`py-2 px-3 text-left rounded text-xs font-mono transition-all flex items-center gap-2 ${
                step === 1
                  ? 'bg-blue-600/20 border border-blue-500/50 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-400 text-[10px] flex items-center justify-center">
                1
              </span>
              <span>Credentials</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (name && email && password) setStep(2);
                else setError('Please fill in your name, email and password first.');
              }}
              className={`py-2 px-3 text-left rounded text-xs font-mono transition-all flex items-center gap-2 ${
                step === 2
                  ? 'bg-blue-600/20 border border-blue-500/50 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-400 text-[10px] flex items-center justify-center">
                2
              </span>
              <span>CS Skills & Matching</span>
            </button>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white tracking-tight">Step 1: Developer Account</h2>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Full Name or Handle</label>
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
                <label className="block text-xs font-mono text-zinc-400 mb-1">Email Address</label>
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
                <label className="block text-xs font-mono text-zinc-400 mb-1">Password</label>
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

              <button
                type="button"
                onClick={() => {
                  if (!name || !email || !password) {
                    setError('Please complete all credential fields.');
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
                className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold transition-all flex items-center justify-center gap-2"
              >
                <span>Continue to Computer Science Skills</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white tracking-tight">Step 2: Computer Science Skills</h2>
                  <div className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Est. Match: {estimateMatchScore()}%
                  </div>
                </div>
                <p className="text-[11px] font-mono text-zinc-400 mt-1">
                  Select your core topics. Reciprocal skill intersections and your engineering bio determine match
                  percentages with other peers.
                </p>
              </div>

              {/* Skills Selector Tabs */}
              <div className="flex gap-2 p-1 bg-[#141419] rounded border border-white/5">
                <button
                  type="button"
                  onClick={() => setActiveSkillTab('TEACH')}
                  className={`flex-1 py-1.5 px-3 rounded text-xs font-mono font-medium transition-all flex items-center justify-center gap-2 ${
                    activeSkillTab === 'TEACH'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Terminal className="w-3 h-3 text-emerald-400" />
                  <span>I Can Teach ({teachSkills.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSkillTab('LEARN')}
                  className={`flex-1 py-1.5 px-3 rounded text-xs font-mono font-medium transition-all flex items-center justify-center gap-2 ${
                    activeSkillTab === 'LEARN'
                      ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Cpu className="w-3 h-3 text-blue-400" />
                  <span>I Want to Learn ({learnSkills.length})</span>
                </button>
              </div>

              {/* Active Skill Category Grid */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  {activeSkillTab === 'TEACH' ? 'Select CS Skills You Can Mentor:' : 'Select CS Skills You Want to Learn:'}
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {CS_SKILL_CATALOG.map((skill) => {
                    const isSelected =
                      activeSkillTab === 'TEACH'
                        ? teachSkills.includes(skill.name)
                        : learnSkills.includes(skill.name);

                    return (
                      <button
                        type="button"
                        key={skill.name}
                        onClick={() =>
                          activeSkillTab === 'TEACH'
                            ? toggleTeachSkill(skill.name)
                            : toggleLearnSkill(skill.name)
                        }
                        className={`p-2 rounded text-left border transition-all text-xs font-mono flex flex-col justify-between ${
                          isSelected
                            ? activeSkillTab === 'TEACH'
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                              : 'bg-blue-500/15 border-blue-500/50 text-white'
                            : 'bg-[#141419] border-white/[0.06] text-zinc-400 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-semibold leading-snug line-clamp-1">{skill.name}</span>
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
                          <span>{skill.category}</span>
                          <span className="px-1 py-0.2 rounded bg-white/5 text-zinc-400">
                            {skill.badge}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bio & Semantic Matching Field */}
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  Engineering Bio & Research Focus
                  <span className="text-zinc-500 text-[10px] ml-1.5">(keywords used in match % calculation)</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your current tech stack, architectures you build, or CS papers you want to study..."
                  className="w-full bg-[#16161c] border border-white/[0.1] focus:border-blue-500 rounded p-2.5 text-xs text-white outline-none font-mono resize-none"
                />
              </div>

              {/* Match Percentage Simulation Bar */}
              <div className="p-3 rounded border border-white/10 bg-[#121217] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    Calculated Peer Match Power:
                  </span>
                  <span className="font-bold text-blue-400">{estimateMatchScore()}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${estimateMatchScore()}%` }}
                  />
                </div>
                <div className="text-[10px] font-mono text-zinc-500">
                  Matches on: {teachSkills.length} teaching skills ↔ {learnSkills.length} learning skills + bio keyword
                  entropy.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
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
                  {loading ? 'Creating Peer Profile...' : 'Complete Registration & Claim 5 XC'}
                </button>
              </div>
            </form>
          )}

          <div className="text-center text-xs font-mono text-zinc-400 pt-2 border-t border-white/[0.06]">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-400 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
