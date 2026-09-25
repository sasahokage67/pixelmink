'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Plus, CheckCircle2, BookOpen, Clock, Target, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function MySkillsPage() {
  const { user, refreshUser } = useAuth();
  const [skillsList, setSkillsList] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [skillName, setSkillName] = useState('');
  const [category, setCategory] = useState('CODING');
  const [type, setType] = useState<'TEACH' | 'LEARN'>('TEACH');
  const [level, setLevel] = useState('INTERMEDIATE');
  const [description, setDescription] = useState('');
  const [teachingAvailability, setTeachingAvailability] = useState('Weekday evenings');
  const [learningGoal, setLearningGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.userSkills) {
      setSkillsList(user.userSkills);
    }
  }, [user]);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillName: skillName.trim(),
          category,
          type,
          level,
          description,
          teachingAvailability,
          learningGoal,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setSkillName('');
        setDescription('');
        setLearningGoal('');
        await refreshUser();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const teachSkills = skillsList.filter((s) => s.type === 'TEACH');
  const learnSkills = skillsList.filter((s) => s.type === 'LEARN');

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs mb-2">
            <Layers className="w-3.5 h-3.5" />
            Knowledge Inventory
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            My Skills & Competencies
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Specify what you can teach to earn XCredits and what you want to learn from verified peers.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold tap-active transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Skill</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Skills I Can Teach */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Skills I Can Teach ({teachSkills.length})
              </h2>
            </div>
            <span className="font-mono text-xs text-emerald-400">+1 XCredit / hour</span>
          </div>

          <div className="space-y-3">
            {teachSkills.length === 0 ? (
              <div className="drinkit-card p-8 text-center text-zinc-500 font-mono text-xs">
                No teaching skills registered. Add a skill to get matched with learners!
              </div>
            ) : (
              teachSkills.map((ts) => (
                <div key={ts.id} className="drinkit-card p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-white tracking-tight">
                        {ts.skill?.name}
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500 uppercase">
                        {ts.skill?.category}
                      </span>
                    </div>

                    <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                      {ts.level}
                    </span>
                  </div>

                  {ts.description && (
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {ts.description}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 pt-1 border-t border-white/[0.04]">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>Availability: {ts.teachingAvailability || 'Flexible'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Skills I Want to Learn */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Skills I Want to Learn ({learnSkills.length})
              </h2>
            </div>
            <span className="font-mono text-xs text-blue-400">-1 XCredit / hour</span>
          </div>

          <div className="space-y-3">
            {learnSkills.length === 0 ? (
              <div className="drinkit-card p-8 text-center text-zinc-500 font-mono text-xs">
                No learning goals registered. Add what topics you want to explore!
              </div>
            ) : (
              learnSkills.map((ls) => (
                <div key={ls.id} className="drinkit-card p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-white tracking-tight">
                        {ls.skill?.name}
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500 uppercase">
                        {ls.skill?.category}
                      </span>
                    </div>

                    <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                      Target: {ls.level}
                    </span>
                  </div>

                  {ls.learningGoal && (
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {ls.learningGoal}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 pt-1 border-t border-white/[0.04]">
                    <Target className="w-3 h-3 text-blue-400" />
                    <span>Looking for senior mentors with verified rating</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Skill Modal (Requirement 8) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#121217] border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white tracking-tight">Add Skill Competency</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-3">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#18181f] rounded-xl border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setType('TEACH')}
                  className={`py-2 rounded-lg text-xs font-mono font-medium transition-all ${
                    type === 'TEACH' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  I Can Teach (Earn XC)
                </button>
                <button
                  type="button"
                  onClick={() => setType('LEARN')}
                  className={`py-2 rounded-lg text-xs font-mono font-medium transition-all ${
                    type === 'LEARN' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  I Want to Learn (Spend XC)
                </button>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Skill Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python, Blender 3D, Rust, DaVinci Resolve..."
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                  >
                    <option value="CODING">Coding & Software</option>
                    <option value="AI_ML">AI & Machine Learning</option>
                    <option value="DESIGN">UI/UX & Product Design</option>
                    <option value="VIDEO_EDITING">Video Editing & Media</option>
                    <option value="DEVOPS">DevOps & Cloud</option>
                    <option value="MATH">Math & Computer Science</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Proficiency Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="EXPERT">Expert</option>
                  </select>
                </div>
              </div>

              {type === 'TEACH' ? (
                <>
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">Teaching Syllabus / Description</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Profiling asyncio code, memory debugging, metaclasses..."
                      className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">Availability Window</label>
                    <input
                      type="text"
                      value={teachingAvailability}
                      onChange={(e) => setTeachingAvailability(e.target.value)}
                      placeholder="e.g. Tue, Thu 18:00 - 21:00 CET"
                      className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Learning Target / Goal</label>
                  <textarea
                    rows={3}
                    value={learningGoal}
                    onChange={(e) => setLearningGoal(e.target.value)}
                    placeholder="e.g. Master LoRA fine-tuning and write local evaluation pipelines..."
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium tap-active transition-all"
                >
                  {isSubmitting ? 'Saving...' : 'Save Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
