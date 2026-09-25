'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import Logo from '@/components/ui/Logo';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import {
  Scale,
  Clock,
  CheckCircle,
  FileCode2,
  Users2,
  Star,
  ArrowLeft,
  Shield,
} from 'lucide-react';

export default function TermsPage() {
  const { t } = useLanguage();

  const RULES = [
    {
      num: '01',
      icon: Scale,
      title: t('terms_r1_title'),
      desc: t('terms_r1_desc'),
      badge: 'Zero Money',
    },
    {
      num: '02',
      icon: Clock,
      title: t('terms_r2_title'),
      desc: t('terms_r2_desc'),
      badge: '2h Notice',
    },
    {
      num: '03',
      icon: CheckCircle,
      title: t('terms_r3_title'),
      desc: t('terms_r3_desc'),
      badge: 'Production-tested',
    },
    {
      num: '04',
      icon: FileCode2,
      title: t('terms_r4_title'),
      desc: t('terms_r4_desc'),
      badge: 'Strict NDA',
    },
    {
      num: '05',
      icon: Users2,
      title: t('terms_r5_title'),
      desc: t('terms_r5_desc'),
      badge: 'Zero Toxicity',
    },
    {
      num: '06',
      icon: Star,
      title: t('terms_r6_title'),
      desc: t('terms_r6_desc'),
      badge: 'Reciprocal Feedback',
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300">
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('terms_last_updated')}</span>
          </div>

          <h1 className="text-lg sm:text-xl md:text-2xl font-pixel text-white leading-relaxed pt-2">
            {t('terms_title')}
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed max-w-2xl">
            {t('terms_subtitle')}
          </p>
        </div>

        {/* 6 Structured Platform Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RULES.map((rule) => {
            const Icon = rule.icon;
            return (
              <div
                key={rule.num}
                className="drinkit-card p-6 bg-[#0e0e13] border border-white/[0.08] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-400">{rule.num}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                      {rule.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold text-white font-mono tracking-tight">
                      {rule.title}
                    </h2>
                  </div>

                  <p className="text-xs font-mono text-zinc-400 leading-relaxed">
                    {rule.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Link to Privacy Policy */}
        <div className="p-5 rounded-xl bg-[#0e0e13] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('privacy_title')}</span>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-1">{t('privacy_subtitle')}</p>
          </div>
          <Link
            href="/privacy"
            className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs font-bold transition-all shrink-0"
          >
            {t('footer_privacy')} →
          </Link>
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
            <Link href="/privacy" className="hover:text-white transition-colors">{t('footer_privacy')}</Link>
            <span>•</span>
            <Link href="/auth/register" className="text-blue-400 hover:underline">{t('nav_register')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
