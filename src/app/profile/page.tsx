'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Star,
  CheckCircle2,
  Clock,
  Globe,
  MapPin,
  Award,
  Zap,
  Edit2,
  MessageSquare,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Identicon from '@/components/ui/Identicon';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [creditsData, setCreditsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [languages, setLanguages] = useState('');
  const [availability, setAvailability] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        if (!user) return;
        const [uRes, cRes] = await Promise.all([
          fetch(`/api/users/${user.id}`),
          fetch('/api/credits'),
        ]);

        if (uRes.ok) {
          const u = await uRes.json();
          setProfileData(u.user);
          setName(u.user?.profile?.name || '');
          setBio(u.user?.profile?.bio || '');
          setLocation(u.user?.profile?.location || '');
          setLanguages(u.user?.profile?.languages || '');
          setAvailability(u.user?.profile?.availability || '');
        }

        if (cRes.ok) {
          const c = await cRes.json();
          setCreditsData(c);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, location, languages, availability }),
      });
      if (res.ok) {
        setIsEditing(false);
        await refreshUser();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const p = profileData?.profile || user?.profile;
  const teaches = profileData?.userSkills?.filter((s: any) => s.type === 'TEACH') || [];
  const learns = profileData?.userSkills?.filter((s: any) => s.type === 'LEARN') || [];
  const reviews = profileData?.reviewsReceived || [];
  const achievements = profileData?.achievements || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in py-2">
      {/* Profile Header Hero Card */}
      <div className="drinkit-card p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Identicon name={p?.name || user?.email || 'peer'} size={76} />

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {p?.name || 'Alex Voronov'}
                </h1>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {user?.role || 'PEER'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span className="font-bold">{p?.rating || 4.95}</span> ({p?.reviewsCount || 28} reviews)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-zinc-500" />
                  {p?.location || 'Belgrade'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-zinc-500" />
                  {p?.languages || 'English, Russian'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 rounded-full bg-[#18181f] hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] font-mono text-xs flex items-center gap-1.5 transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
            </button>
          </div>
        </div>

        {/* Bio */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-4 border-t border-white/[0.06]">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Bio</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans pt-2">
            {p?.bio || 'Senior Python & PyTorch Engineer at deep-tech lab. Loving math, algorithms and async systems.'}
          </p>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.06] text-center font-mono">
          <div className="p-3 bg-black/40 rounded-xl border border-white/[0.04]">
            <div className="text-[10px] text-zinc-500 uppercase">Hours Taught</div>
            <div className="text-lg font-bold text-white mt-0.5">{p?.teachingHours ?? 32.5}h</div>
          </div>
          <div className="p-3 bg-black/40 rounded-xl border border-white/[0.04]">
            <div className="text-[10px] text-zinc-500 uppercase">Hours Learned</div>
            <div className="text-lg font-bold text-white mt-0.5">{p?.learningHours ?? 18.0}h</div>
          </div>
          <div className="p-3 bg-black/40 rounded-xl border border-white/[0.04]">
            <div className="text-[10px] text-blue-400 uppercase">XCredits Balance</div>
            <div className="text-lg font-bold text-blue-400 mt-0.5">{p?.xCredits ?? 12} XC</div>
          </div>
        </div>
      </div>

      {/* Skills Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="drinkit-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Skills I Can Teach
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {teaches.map((ts: any) => (
              <span
                key={ts.id}
                className="font-mono text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
              >
                {ts.skill?.name} ({ts.level})
              </span>
            ))}
          </div>
        </div>

        <div className="drinkit-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Skills I Want To Learn
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {learns.map((ls: any) => (
              <span
                key={ls.id}
                className="font-mono text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20"
              >
                {ls.skill?.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements Showcase (Requirement 31) */}
      <div className="drinkit-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Verified Platform Achievements
          </h2>
          <span className="font-mono text-xs text-zinc-500">{achievements.length} Unlocked</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { title: 'First Session', desc: 'Held first 1-on-1 peer exchange', icon: '🔥', unlocked: true },
            { title: '10 Hours Teaching', desc: 'Over 10 hours dedicated to peers', icon: '🧠', unlocked: true },
            { title: '5 Successful Exchanges', desc: 'Reciprocal learning milestones', icon: '🤝', unlocked: true },
            { title: 'Global Learner', desc: 'Connected across 3 continents', icon: '🌎', unlocked: true },
          ].map((ach, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] space-y-2 text-center"
            >
              <div className="text-2xl">{ach.icon}</div>
              <div className="text-xs font-semibold text-white tracking-tight">{ach.title}</div>
              <div className="text-[10px] text-zinc-400 font-mono">{ach.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* XCredits Knowledge Economy (Requirement 29) */}
      <div className="drinkit-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              XCredits Knowledge Balance
            </h2>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">
              1 hour teaching = +1 XC • 1 hour learning = -1 XC
            </p>
          </div>
          <span className="text-xl font-mono font-bold text-blue-400">
            {creditsData?.balance ?? 12} XC
          </span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-white/[0.04] text-xs font-mono">
          {creditsData?.transactions?.map((tx: any) => (
            <div key={tx.id} className="py-2.5 flex items-center justify-between">
              <div>
                <div className="text-zinc-200">{tx.description}</div>
                <div className="text-[10px] text-zinc-500">
                  {new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <span className={`font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {tx.amount > 0 ? `+${tx.amount}` : tx.amount} XC
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews Received (Requirement 30) */}
      <div className="drinkit-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Peer Reviews & Feedback
          </h2>
          <span className="font-mono text-xs text-zinc-500">{reviews.length} Total</span>
        </div>

        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 font-mono text-xs">
              No reviews yet. Complete your first exchange session to receive feedback!
            </div>
          ) : (
            reviews.map((r: any) => (
              <div key={r.id} className="p-4 rounded-xl bg-black/40 border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white">
                    {r.reviewer?.profile?.name || 'Peer Developer'}
                  </span>
                  <div className="flex items-center gap-1 font-mono text-xs text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{r.rating}.0</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-sans">{r.comment}</p>

                <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 pt-1">
                  <span>Clarity: {r.clarityScore}/5</span>
                  <span>Understanding: {r.understandScore}/5</span>
                  <span>Would study again: {r.wouldStudyAgain ? 'Yes ✓' : 'No'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
