'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Award, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function TestDetailPage() {
  const params = useParams();
  const testId = params.id as string;
  const router = useRouter();

  const [test, setTest] = useState<any>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTest() {
      try {
        const res = await fetch(`/api/tests/${testId}`);
        if (res.ok) {
          const data = await res.json();
          setTest(data.test);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTest();
  }, [testId]);

  const handleSelect = (questionId: string, option: string) => {
    if (result) return; // locked after submission
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tests/${testId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: selectedAnswers }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-24 text-center font-mono text-xs text-zinc-500">Loading test...</div>;
  }

  if (!test) {
    return <div className="py-24 text-center font-mono text-xs text-zinc-500">Test not found.</div>;
  }

  const allAnswered = test.questions?.every((q: any) => selectedAnswers[q.id]);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in py-4">
      {/* Top Header */}
      <div className="space-y-3 pb-6 border-b border-white/[0.08]">
        <Link
          href="/tests"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tests</span>
        </Link>

        <div>
          <div className="font-mono text-xs text-blue-400 uppercase tracking-wider">
            Proof of Learning • {test.skill?.name}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
            {test.title}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">{test.description}</p>
        </div>
      </div>

      {/* Result Celebration Banner (Requirement 23: Score: 4/5, Knowledge progress +8%) */}
      {result && (
        <div className="drinkit-card p-6 border-blue-500/40 bg-blue-950/20 text-center space-y-4 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/40 mx-auto flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>

          <div className="space-y-1">
            <div className="text-3xl font-mono font-bold text-white tracking-tight">
              Score: {result.score} / {result.maxScore}
            </div>
            <div className="text-sm font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Knowledge progress +{result.progressGain}% verified!
            </div>
            <p className="text-xs font-mono text-zinc-400">
              New skill mastery in {test.skill?.name}: {result.newProgressPercent}%
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/progress"
              className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium"
            >
              View Progress Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Questions Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {test.questions?.map((q: any, idx: number) => {
          const selected = selectedAnswers[q.id];
          const reviewItem = result?.breakdown?.find((b: any) => b.questionId === q.id);

          return (
            <div
              key={q.id}
              className={`drinkit-card p-6 space-y-4 ${
                reviewItem
                  ? reviewItem.isCorrect
                    ? 'border-emerald-500/40 bg-emerald-950/10'
                    : 'border-red-500/40 bg-red-950/10'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-xs text-blue-400 font-bold shrink-0">
                  Question {idx + 1}
                </span>
                {reviewItem && (
                  <span className="font-mono text-xs font-semibold">
                    {reviewItem.isCorrect ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+1)
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Incorrect (Answer: {reviewItem.correctOption})
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div className="text-sm font-semibold text-white tracking-tight leading-relaxed">
                {q.question}
              </div>

              {/* Options A, B, C, D */}
              <div className="space-y-2 pt-2">
                {[
                  { key: 'A', text: q.optionA },
                  { key: 'B', text: q.optionB },
                  { key: 'C', text: q.optionC },
                  { key: 'D', text: q.optionD },
                ].map((opt) => {
                  const isChecked = selected === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSelect(q.id, opt.key)}
                      className={`w-full p-3.5 rounded-xl text-left text-xs font-mono flex items-center gap-3 border transition-all ${
                        isChecked
                          ? 'bg-blue-600/20 text-white border-blue-500'
                          : 'bg-[#141418] text-zinc-300 border-white/[0.06] hover:bg-white/[0.04]'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isChecked ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {opt.key}
                      </span>
                      <span className="leading-snug">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation on result */}
              {reviewItem && (
                <div className="p-3 bg-black/40 rounded-xl border border-white/[0.04] text-xs font-sans text-zinc-300">
                  <span className="font-mono text-zinc-400 font-semibold">Explanation: </span>
                  {reviewItem.explanation}
                </div>
              )}
            </div>
          );
        })}

        {!result && (
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={!allAnswered || submitting}
              className={`px-8 py-3 rounded-full font-mono text-xs font-semibold tap-active transition-all ${
                allAnswered && !submitting
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {submitting ? 'Grading Assessment...' : 'Submit Answers & Calculate Progress'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
