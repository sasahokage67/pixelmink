'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Star,
  Clock,
  Globe,
  MapPin,
  Award,
  Zap,
  Edit2,
  MessageSquare,
  Video,
  Shield,
  Layers,
  PhoneCall,
  CheckCircle2,
  ThumbsUp,
  Send,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSocket } from '@/context/SocketContext';
import Identicon from '@/components/ui/Identicon';

function ProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: currentUser, loading: authLoading, refreshUser } = useAuth();
  const { socket } = useSocket();
  const { lang } = useLanguage();

  const queryUserId = searchParams.get('userId') || searchParams.get('id');
  const targetUserId = queryUserId || currentUser?.id;
  const isOwnProfile = !queryUserId || (currentUser && queryUserId === currentUser.id);

  const [profileData, setProfileData] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    callsCount: 0,
    totalHours: 0,
    peersTaught: 0,
    teachingHours: 0,
    learningHours: 0,
    xCredits: 5,
    rating: 5.0,
    reviewsCount: 0,
  });
  const [creditsData, setCreditsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [languages, setLanguages] = useState('');
  const [availability, setAvailability] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Peer review / comment form state
  const [commentRating, setCommentRating] = useState(5);
  const [commentClarity, setCommentClarity] = useState(5);
  const [commentUnderstand, setCommentUnderstand] = useState(5);
  const [wouldStudyAgain, setWouldStudyAgain] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const url = isOwnProfile ? '/api/users/me' : `/api/users/${targetUserId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const userData = data.user || data;
        setProfileData(userData);
        if (data.stats) {
          setStats(data.stats);
        }
        if (isOwnProfile) {
          setName(userData?.profile?.name || currentUser?.profile?.name || '');
          setBio(userData?.profile?.bio || currentUser?.profile?.bio || '');
          setLocation(userData?.profile?.location || currentUser?.profile?.location || '');
          setLanguages(userData?.profile?.languages || currentUser?.profile?.languages || '');
          setAvailability(userData?.profile?.availability || currentUser?.profile?.availability || '');
        }
      } else if (isOwnProfile && currentUser) {
        setProfileData(currentUser);
        setName(currentUser?.profile?.name || '');
        setBio(currentUser?.profile?.bio || '');
        setLocation(currentUser?.profile?.location || '');
        setLanguages(currentUser?.profile?.languages || '');
        setAvailability(currentUser?.profile?.availability || '');
      }

      if (isOwnProfile) {
        const cRes = await fetch('/api/credits');
        if (cRes.ok) {
          const c = await cRes.json();
          setCreditsData(c);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      if (isOwnProfile && currentUser) {
        setProfileData(currentUser);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser && !queryUserId) {
      router.push('/auth/login');
      return;
    }
    fetchUserData();
  }, [targetUserId, isOwnProfile, authLoading, currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, location, languages, availability }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token && typeof window !== 'undefined') {
          localStorage.setItem('pixelmink_token', data.token);
        }
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
        await refreshUser();
        await fetchUserData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) {
      setReviewError(lang === 'ru' ? 'Введите текст отзыва' : lang === 'kz' ? 'Пікір мәтінін енгізіңіз' : 'Enter review text');
      return;
    }

    setSubmittingReview(true);
    setReviewError('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revieweeId: targetUserId,
          rating: commentRating,
          comment: commentText.trim(),
          clarityScore: commentClarity,
          understandScore: commentUnderstand,
          wouldStudyAgain,
        }),
      });

      if (res.ok) {
        setCommentText('');
        setReviewSuccess(true);
        setTimeout(() => setReviewSuccess(false), 4000);
        await fetchUserData();
      } else {
        const errJson = await res.json();
        setReviewError(errJson.error || 'Failed to submit review');
      }
    } catch (err: any) {
      setReviewError(err.message || 'Error sending review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleStartCall = async () => {
    const roomId = `room_${Date.now()}`;
    try {
      if (targetUserId) {
        await fetch('/api/calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverId: targetUserId,
            roomId,
            type: 'VIDEO',
          }),
        });

        if (socket) {
          socket.emit('call:initiate', {
            callerId: currentUser?.id,
            callerName: currentUser?.profile?.name || currentUser?.email?.split('@')[0] || 'Peer',
            callerAvatar: currentUser?.profile?.avatar,
            receiverId: targetUserId,
            roomId,
            type: 'VIDEO',
          });
        }
      }
    } catch (e) {
      console.error('Call initiate error:', e);
    }
    router.push(`/calls/${roomId}`);
  };

  const p = profileData?.profile || (isOwnProfile ? currentUser?.profile : null);
  const allSkills = (profileData?.userSkills && profileData.userSkills.length > 0)
    ? profileData.userSkills
    : ((isOwnProfile ? currentUser?.userSkills : []) || []);
  const teaches = allSkills.filter((s: any) => s.type === 'TEACH');
  const learns = allSkills.filter((s: any) => s.type === 'LEARN');
  const reviews = profileData?.reviewsReceived || [];
  const achievements = profileData?.achievements || [];

  if (loading && !profileData && !currentUser) {
    return (
      <div className="max-w-4xl mx-auto py-16 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="font-mono text-xs text-zinc-400">
          Загрузка личного кабинета...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in py-2">
      {saveSuccess && (
        <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs flex items-center justify-between animate-in fade-in">
          <span>✓ Профиль и параметры обмена успешно сохранены</span>
          <span className="text-[10px] text-zinc-500">Автосинхронизация активна</span>
        </div>
      )}

      {/* Profile Header Hero Card */}
      <div className="drinkit-card p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Identicon name={p?.name || profileData?.email || 'peer'} size={76} />

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {p?.name || profileData?.email?.split('@')[0] || 'Инженер'}
                </h1>
                <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                  {isOwnProfile
                    ? lang === 'ru'
                      ? 'Личный кабинет'
                      : lang === 'kz'
                      ? 'Жеке кабинет'
                      : 'Personal Cabinet'
                    : lang === 'ru'
                    ? 'Профиль инженера'
                    : lang === 'kz'
                    ? 'Инженер профилі'
                    : 'Peer Profile'}
                </span>
                {profileData?.role && (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {profileData.role}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{stats.rating || p?.rating || 5.0}</span>
                  <span className="text-zinc-500 font-normal">
                    ({stats.reviewsCount || reviews.length} {lang === 'ru' ? 'отзывов' : lang === 'kz' ? 'пікір' : 'reviews'})
                  </span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  {p?.location || 'Remote'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-zinc-500" />
                  {p?.languages || 'English, Russian'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isOwnProfile ? (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 rounded-full bg-[#18181f] hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] font-mono text-xs flex items-center gap-2 transition-all tap-active"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  {isEditing
                    ? lang === 'ru' ? 'Отмена' : lang === 'kz' ? 'Бас тарту' : 'Cancel'
                    : lang === 'ru' ? 'Редактировать' : lang === 'kz' ? 'Өңдеу' : 'Edit Profile'}
                </span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleStartCall}
                  className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-600/20 tap-active"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{lang === 'ru' ? 'Созвониться (P2P)' : lang === 'kz' ? 'Қоңырау шалу' : 'Direct Call'}</span>
                </button>

                <Link
                  href="/chats"
                  className="px-4 py-2 rounded-full bg-[#18181f] hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] font-mono text-xs flex items-center gap-2 transition-all tap-active"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{lang === 'ru' ? 'Чат' : lang === 'kz' ? 'Чат' : 'Message'}</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-4 border-t border-white/[0.06]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                  {lang === 'ru' ? 'Имя / Никнейм' : lang === 'kz' ? 'Аты / Никнейм' : 'Full Name / Handle'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                  {lang === 'ru' ? 'Локация' : lang === 'kz' ? 'Орналасқан жері' : 'Location'}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Almaty, Moscow, Remote"
                  className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                  {lang === 'ru' ? 'Языки общения' : lang === 'kz' ? 'Қарым-қатынас тілдері' : 'Languages'}
                </label>
                <input
                  type="text"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="English, Russian, Kazakh..."
                  className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                  {lang === 'ru' ? 'Доступность для созвонов' : lang === 'kz' ? 'Қоңырау уақыты' : 'Availability'}
                </label>
                <input
                  type="text"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder="Mon-Fri 19:00-22:00"
                  className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                {lang === 'ru' ? 'О себе (стек, опыт, цели)' : lang === 'kz' ? 'Өзі туралы (стек, тәжірибе, мақсаттар)' : 'Bio / Focus Area'}
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Systems programming, algorithms, AI, WebRTC..."
                className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 font-mono text-xs hover:bg-zinc-700 transition-colors"
              >
                {lang === 'ru' ? 'Отмена' : lang === 'kz' ? 'Бас тарту' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saveLoading}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-blue-600/20"
              >
                {saveLoading ? 'Saving...' : lang === 'ru' ? 'Сохранить изменения' : lang === 'kz' ? 'Сақтау' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans pt-2 border-t border-white/[0.06]">
            {p?.bio || (lang === 'ru' ? 'Инженер платформы pixelmink. Готов к бартеру техническими знаниями и парному программированию.' : 'Engineer on pixelmink. Ready for peer knowledge exchange.')}
          </p>
        )}

        {/* 4 CORE METRIC CARDS (Bento Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/[0.06] font-mono">
          {/* 1. Сколько созвонов проведено */}
          <div className="p-4 bg-black/40 rounded-xl border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[10px] uppercase font-bold tracking-wider">
                {lang === 'ru' ? 'Созвонов' : lang === 'kz' ? 'Қоңыраулар' : 'Calls'}
              </span>
              <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats.callsCount}
            </div>
            <div className="text-[10px] text-zinc-500">
              {lang === 'ru' ? 'проведено созвонов' : lang === 'kz' ? 'өткізілген созвон' : 'sessions held'}
            </div>
          </div>

          {/* 2. Часов на сайте / в сессиях */}
          <div className="p-4 bg-black/40 rounded-xl border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[10px] uppercase font-bold tracking-wider">
                {lang === 'ru' ? 'Часов на сайте' : lang === 'kz' ? 'Сайттағы сағат' : 'Hours Total'}
              </span>
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              {stats.totalHours} <span className="text-xs font-normal text-zinc-500">ч</span>
            </div>
            <div className="text-[10px] text-zinc-500">
              {lang === 'ru' ? 'в сессиях и звонках' : lang === 'kz' ? 'сессия мен қоңырауда' : 'in active sessions'}
            </div>
          </div>

          {/* 3. Обучено типов / коллег */}
          <div className="p-4 bg-black/40 rounded-xl border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[10px] uppercase font-bold tracking-wider">
                {lang === 'ru' ? 'Обучено типов' : lang === 'kz' ? 'Оқытылған' : 'Peers Taught'}
              </span>
              <Award className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats.peersTaught}
            </div>
            <div className="text-[10px] text-zinc-500">
              {lang === 'ru' ? 'уникальных коллег' : lang === 'kz' ? 'әріптестер' : 'unique peers'}
            </div>
          </div>

          {/* 4. Изучено часов / XCredits balance */}
          <div className="p-4 bg-black/40 rounded-xl border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[10px] uppercase font-bold tracking-wider">
                {lang === 'ru' ? 'Баланс XC' : lang === 'kz' ? 'XC Балансы' : 'XCredits'}
              </span>
              <Zap className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400 tracking-tight">
              {stats.xCredits} <span className="text-xs font-normal text-zinc-500">XC</span>
            </div>
            <div className="text-[10px] text-zinc-500">
              {lang === 'ru' ? '1ч менторства = 1 XC' : lang === 'kz' ? '1сағ = 1 XC' : '1hr peer teach = 1 XC'}
            </div>
          </div>
        </div>
      </div>

      {/* Skills Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="drinkit-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              {lang === 'ru' ? 'Навыки, которым обучаю' : 'Skills I Can Teach'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-500">{teaches.length}</span>
              {isOwnProfile && (
                <Link
                  href="/skills"
                  className="font-mono text-[11px] text-blue-400 hover:text-blue-300 ml-2"
                >
                  + Настроить
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {teaches.length > 0 ? (
              teaches.map((ts: any, idx: number) => {
                const sName = ts.skill?.name || ts.name || (typeof ts === 'string' ? ts : 'Skill');
                const level = ts.level ? ` (${ts.level})` : '';
                return (
                  <span
                    key={ts.id || idx}
                    className="font-mono text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  >
                    {sName}{level}
                  </span>
                );
              })
            ) : (
              isOwnProfile ? (
                <Link href="/skills" className="text-xs font-mono text-blue-400 hover:underline">
                  + Добавить навыки преподавания в инвентарь
                </Link>
              ) : (
                <span className="text-xs font-mono text-zinc-500">Навыки пока не указаны</span>
              )
            )}
          </div>
        </div>

        <div className="drinkit-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Навыки, которые изучаю
            </h2>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-500">{learns.length}</span>
              {isOwnProfile && (
                <Link
                  href="/skills"
                  className="font-mono text-[11px] text-blue-400 hover:text-blue-300 ml-2"
                >
                  + Настроить
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {learns.length > 0 ? (
              learns.map((ls: any, idx: number) => {
                const sName = ls.skill?.name || ls.name || (typeof ls === 'string' ? ls : 'Skill');
                return (
                  <span
                    key={ls.id || idx}
                    className="font-mono text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20"
                  >
                    {sName}
                  </span>
                );
              })
            ) : (
              isOwnProfile ? (
                <Link href="/skills" className="text-xs font-mono text-blue-400 hover:underline">
                  + Указать цели обучения для подбора менторов
                </Link>
              ) : (
                <span className="text-xs font-mono text-zinc-500">Цели пока не указаны</span>
              )
            )}
          </div>
        </div>
      </div>

      {/* PEER REVIEWS & COMMENTS SECTION (Requirement: "оставлять комментарии другим типам") */}
      <div className="drinkit-card p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              {lang === 'ru' ? 'Комментарии и отзывы коллег' : lang === 'kz' ? 'Әріптестер пікірлері' : 'Peer Reviews & Comments'}
            </h2>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">
              {lang === 'ru'
                ? 'Реальные впечатления от совместных созвонов, парного программирования и код-ревью'
                : lang === 'kz'
                ? 'Бірлескен қоңыраулар, жұптық бағдарламалау және кодты қарау туралы нақты пікірлер'
                : 'Verified peer impressions from calls, pair programming, and code reviews'}
            </p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
            {reviews.length} {lang === 'ru' ? 'отзывов' : lang === 'kz' ? 'пікір' : 'reviews'}
          </span>
        </div>

        {/* Comment Form (when viewing another peer's profile) */}
        {!isOwnProfile && (
          <form onSubmit={handleAddReview} className="p-5 rounded-2xl bg-[#0c0c10] border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                {lang === 'ru' ? 'Оставить комментарий коллеге' : lang === 'kz' ? 'Әріптеске пікір қалдыру' : 'Leave a Peer Review'}
              </span>

              {/* Star Rating Picker */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setCommentRating(star)}
                    className="p-1 text-zinc-600 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        star <= commentRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="font-mono text-xs text-amber-400 font-bold ml-1">
                  {commentRating}.0
                </span>
              </div>
            </div>

            {/* Criteria Scores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                <span className="text-zinc-400">
                  {lang === 'ru' ? 'Ясность объяснения:' : lang === 'kz' ? 'Түсіндіру анықтығы:' : 'Clarity Score:'}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setCommentClarity(val)}
                      className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all ${
                        commentClarity === val
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/[0.04] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                <span className="text-zinc-400">
                  {lang === 'ru' ? 'Понимание темы:' : lang === 'kz' ? 'Тақырыпты түсінуі:' : 'Subject Mastery:'}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setCommentUnderstand(val)}
                      className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all ${
                        commentUnderstand === val
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white/[0.04] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Would study again toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-mono text-zinc-300 select-none">
              <input
                type="checkbox"
                checked={wouldStudyAgain}
                onChange={(e) => setWouldStudyAgain(e.target.checked)}
                className="w-4 h-4 rounded bg-[#18181f] border-white/20 text-blue-600 focus:ring-0"
              />
              <span>
                {lang === 'ru'
                  ? 'Рекомендую этого инженера для будущих созвонов и обмена'
                  : lang === 'kz'
                  ? 'Бұл инженерді болашақ қоңыраулар мен алмасуға ұсынамын'
                  : 'I recommend this engineer for future barter calls'}
              </span>
            </label>

            {/* Textarea */}
            <div>
              <textarea
                required
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  lang === 'ru'
                    ? 'Напишите отзыв: как прошел созвон, что полезного разобрали, насколько понятно коллега объяснял материал...'
                    : lang === 'kz'
                    ? 'Пікіріңізді жазыңыз: қоңырау қалай өтті, қандай мәселелер талқыланды...'
                    : 'Write your peer review: how was the call, depth of explanation, problem solving...'
                }
                className="w-full bg-[#16161c] border border-white/[0.08] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none font-sans leading-relaxed"
              />
            </div>

            {reviewError && (
              <div className="text-xs font-mono text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                {reviewError}
              </div>
            )}

            {reviewSuccess && (
              <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {lang === 'ru'
                    ? 'Ваш отзыв успешно опубликован!'
                    : lang === 'kz'
                    ? 'Пікіріңіз сәтті жарияланды!'
                    : 'Review successfully submitted!'}
                </span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingReview}
                className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
              >
                {submittingReview ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>
                  {lang === 'ru'
                    ? 'Опубликовать комментарий'
                    : lang === 'kz'
                    ? 'Пікірді жариялау'
                    : 'Post Comment'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Notice for own profile */}
        {isOwnProfile && (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <span className="text-zinc-400">
              {lang === 'ru'
                ? 'Хотите оставить отзыв коллеге после созвона? Перейдите на его профиль в поиске.'
                : lang === 'kz'
                ? 'Қоңыраудан кейін әріптеске пікір қалдырғыңыз келе ме? Іздеуден оның профиліне өтіңіз.'
                : 'Want to leave a review for a peer after a call? Navigate to their profile in Discover.'}
            </span>
            <Link
              href="/discover"
              className="px-4 py-1.5 rounded-full bg-[#18181f] hover:bg-zinc-800 text-blue-400 border border-blue-500/20 text-xs shrink-0 text-center transition-colors"
            >
              {lang === 'ru' ? 'Найти коллегу →' : lang === 'kz' ? 'Әріптесті табу →' : 'Discover Peers →'}
            </Link>
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 font-mono text-xs border border-dashed border-white/[0.06] rounded-2xl p-6">
              {lang === 'ru'
                ? 'Отзывов пока нет. Проведите первый созвон или взаимный разбор задач, чтобы получить фидбек!'
                : lang === 'kz'
                ? 'Әзірге пікірлер жоқ. Кері байланыс алу үшін алғашқы қоңырауды өткізіңіз!'
                : 'No reviews yet. Complete your first exchange session to receive peer feedback!'}
            </div>
          ) : (
            reviews.map((r: any) => (
              <div
                key={r.id}
                className="p-5 rounded-2xl bg-black/40 border border-white/[0.05] space-y-3 hover:border-white/[0.1] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Reviewer Avatar and Name - CLICKABLE TO OPEN THEIR PROFILE */}
                  <Link
                    href={`/profile?userId=${r.reviewerId}`}
                    className="flex items-center gap-3 group"
                    title="Перейти в личный кабинет автора"
                  >
                    <Identicon
                      name={r.reviewer?.profile?.name || r.reviewer?.email || 'peer'}
                      size={36}
                    />
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                        {r.reviewer?.profile?.name || r.reviewer?.email?.split('@')[0] || 'Коллега'}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {new Date(r.createdAt).toLocaleDateString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-1 font-mono text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 shrink-0">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span className="font-bold">{r.rating}.0</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                  {r.comment}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/[0.04]">
                  <span className="px-2 py-0.5 rounded bg-white/[0.02]">
                    {lang === 'ru' ? 'Ясность' : 'Clarity'}: {r.clarityScore ?? 5}/5
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.02]">
                    {lang === 'ru' ? 'Глубина' : 'Mastery'}: {r.understandScore ?? 5}/5
                  </span>
                  {r.wouldStudyAgain && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {lang === 'ru' ? 'Рекомендует коллегу' : lang === 'kz' ? 'Әріптесті ұсынады' : 'Recommends'}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto py-16 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="font-mono text-xs text-zinc-400">Loading profile...</span>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
