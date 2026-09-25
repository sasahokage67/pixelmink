'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import Logo from '@/components/ui/Logo';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { Shield, Lock, EyeOff, Trash2, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function PrivacyPage() {
  const { t } = useLanguage();

  const SECTIONS = [
    {
      icon: Shield,
      title: t('privacy_sec1_title'),
      desc: t('privacy_sec1_desc'),
      badge: 'Zero Ad-Tracking',
    },
    {
      icon: Lock,
      title: t('privacy_sec2_title'),
      desc: t('privacy_sec2_desc'),
      badge: 'Minimal Metadata',
    },
    {
      icon: EyeOff,
      title: t('privacy_sec3_title'),
      desc: t('privacy_sec3_desc'),
      badge: 'P2P Encrypted',
    },
    {
      icon: Trash2,
      title: t('privacy_sec4_title'),
      desc: t('privacy_sec4_desc'),
      badge: 'GDPR & Privacy Compliant',
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-white/[0.08] px-4 md:px-8 py-3.5 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <Logo size={26} />
          <span className="font-pixel text-xs sm:text-sm text-white group-hover:text-blue-400 transition-colors">
            pixelmink
          </span>
          <span className="hidden sm:inline text-xs font-mono text-zinc-500 border-l border-white/10 pl-3 ml-1">
            {t('slogan')}
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link
            href="/"
            className="text-xs font-mono text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('nav_landing')}</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 md:px-8 py-12 space-y-10 flex-1 w-full">
        {/* Editorial Heading */}
        <div className="space-y-3 border-b border-white/[0.08] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-300">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>{t('privacy_last_updated')}</span>
          </div>

          <h1 className="text-lg sm:text-xl md:text-2xl font-pixel text-white leading-relaxed pt-2">
            {t('privacy_title')}
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed max-w-2xl">
            {t('privacy_subtitle')}
          </p>
        </div>

        {/* Structured Legal & Architecture Cards */}
        <div className="space-y-4">
          {SECTIONS.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <div
                key={idx}
                className="drinkit-card p-6 bg-[#0e0e13] border border-white/[0.08] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold text-white font-mono tracking-tight">
                      {sec.title}
                    </h2>
                  </div>
                  <span className="self-start sm:self-auto text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                    {sec.badge}
                  </span>
                </div>

                <p className="text-xs font-mono text-zinc-400 leading-relaxed pl-0 sm:pl-11">
                  {sec.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Commitment Statement */}
        <div className="p-6 rounded-xl bg-gradient-to-r from-blue-950/20 via-[#101016] to-emerald-950/20 border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Protocol Commitment: 100% Peer-to-Peer</span>
          </div>
          <p className="text-xs font-mono text-zinc-400 leading-relaxed">
            {t('footer_brand_desc')}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#09090b] px-4 md:px-8 py-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <Logo size={18} />
            <span className="text-white font-semibold">pixelmink</span>
            <span>•</span>
            <span>{t('slogan')}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:text-white transition-colors">{t('nav_landing')}</Link>
            <span>•</span>
            <Link href="/auth/register" className="text-blue-400 hover:underline">{t('nav_register')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
