'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import Logo from '@/components/ui/Logo';
import { ArrowRight, Lock, Mail, User, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const ok = await login(email, password);
    if (ok) {
      router.push('/dashboard');
    } else {
      setError('Invalid email or password.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col justify-center items-center py-12 px-4 relative">
      {/* Top Bar with Return to Landing & Language Switcher */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-auto">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <Logo size={20} />
          <span>pixelmink</span>
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-2xl font-bold text-white tracking-tight group">
            <Logo size={32} />
            <span>pixelmink<span className="text-blue-500">.</span></span>
          </Link>
          <div className="text-xs font-mono text-zinc-400">
            {t('slogan')}
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white pt-1">{t('login_heading')}</h1>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="drinkit-card p-6 space-y-4 shadow-2xl">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Никнейм или Email</label>
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                required
                placeholder="e.g. kent, linus или почта"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">{t('login_password')}</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold tap-active transition-all shadow-md shadow-blue-600/20"
          >
            {loading ? t('login_authenticating') : t('login_submit')}
          </button>
        </form>


        <div className="text-center text-xs font-mono text-zinc-400">
          {t('login_dont_have')}{' '}
          <Link href="/auth/register" className="text-blue-400 hover:underline">
            {t('login_register_link')}
          </Link>
        </div>
      </div>
    </div>
  );
}
