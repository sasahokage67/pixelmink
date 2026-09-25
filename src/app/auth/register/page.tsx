'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/ui/Logo';
import { ArrowRight, Lock, Mail, User, Code2, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teachSkill, setTeachSkill] = useState('Python');
  const [learnSkill, setLearnSkill] = useState('Rust');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const ok = await register({
      name,
      email,
      password,
      teachSkill,
      learnSkill,
    });

    if (ok) {
      router.push('/dashboard');
    } else {
      setError('Registration failed. Email may already be registered.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-2xl font-bold text-white tracking-tight group">
            <Logo size={32} />
            <span>pixelmink<span className="text-blue-500">.</span></span>
          </Link>
          <div className="text-xs font-mono text-zinc-400">
            “Your skills for theirs. No money, just knowledge.”
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white pt-1">Create your developer profile</h1>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="drinkit-card p-6 space-y-4 shadow-2xl">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Full Name</label>
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                required
                placeholder="e.g. Alex Voronov"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none"
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
                placeholder="alex@xchange.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none font-mono"
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
                className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/[0.06]">
            <div>
              <label className="block text-xs font-mono text-emerald-400 mb-1">I Can Teach</label>
              <input
                type="text"
                value={teachSkill}
                onChange={(e) => setTeachSkill(e.target.value)}
                placeholder="e.g. Python"
                className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-blue-400 mb-1">I Want To Learn</label>
              <input
                type="text"
                value={learnSkill}
                onChange={(e) => setLearnSkill(e.target.value)}
                placeholder="e.g. English for IT"
                className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold tap-active transition-all shadow-md shadow-blue-600/20"
          >
            {loading ? 'Creating Account...' : 'Create Account & Claim 5 XC'}
          </button>
        </form>

        <div className="text-center text-xs font-mono text-zinc-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-400 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
