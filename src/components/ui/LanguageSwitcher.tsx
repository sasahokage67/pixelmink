'use client';

import React from 'react';
import { useLanguage, Language } from '@/context/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'ru', label: 'RU', flag: '🇷🇺' },
    { code: 'kz', label: 'KZ', flag: '🇰🇿' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
  ];

  return (
    <div className={`inline-flex items-center gap-1 p-0.5 rounded bg-[#141419] border border-white/10 ${className}`}>
      {languages.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          className={`px-2 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
            lang === l.code
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
          title={l.label}
        >
          <span>{l.flag}</span>
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}
