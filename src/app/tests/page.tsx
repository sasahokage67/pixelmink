'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award, CheckCircle2, ArrowRight, BookOpen, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function TestsCatalogPage() {
  const { user } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTests() {
      try {
        const res = await fetch('/api/tests');
        if (res.ok) {
          const data = await res.json();
          setTests(data.tests || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTests();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs mb-2">
            <Award className="w-3.5 h-3.5" />
            Proof of Learning Protocol
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Technical Skill Assessments
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Validate what you learned in 1-on-1 sessions. Passing tests increases your verifiable knowledge progress (+8%).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center font-mono text-xs text-zinc-500">
          Loading test modules...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tests.map((t) => (
            <div
              key={t.id}
              className="drinkit-card p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {t.skill?.category || 'CODING'}
                  </span>
                  <span className="font-mono text-xs text-zinc-500">{t.level}</span>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">{t.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{t.description}</p>

                <div className="bg-black/40 p-3 rounded-lg border border-white/[0.04] text-xs font-mono text-zinc-400 flex items-center justify-between">
                  <span>Questions: {t.questions?.length || 5}</span>
                  <span className="text-emerald-400 font-semibold">+8% Skill Progress</span>
                </div>
              </div>

              <Link
                href={`/tests/${t.id}`}
                className="w-full py-2.5 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold text-center tap-active transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <span>Start Assessment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
