'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Users,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  X,
  Play,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function SeminarsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [seminars, setSeminars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('ALL');

  // Create Seminar Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [semCategory, setSemCategory] = useState('AI & MACHINE LEARNING');
  const [level, setLevel] = useState('Intermediate');
  const [date, setDate] = useState('Oct 10, 2026');
  const [time, setTime] = useState('18:00 CET');
  const [duration, setDuration] = useState('60');
  const [maxParticipants, setMaxParticipants] = useState('500');
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());

  // Helper to get persisted local seminars
  const getLocalSeminars = (): any[] => {
    try {
      const saved = localStorage.getItem('pixelmink_persisted_seminars');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const saveLocalSeminars = (list: any[]) => {
    try {
      localStorage.setItem('pixelmink_persisted_seminars', JSON.stringify(list));
    } catch {}
  };

  const mergeSeminars = (prevList: any[], incomingList: any[]) => {
    const map = new Map<string, any>();
    prevList.forEach((s) => map.set(s.id || s.title, s));
    incomingList.forEach((s) => map.set(s.id || s.title, { ...(map.get(s.id || s.title) || {}), ...s }));
    return Array.from(map.values());
  };

  const fetchSeminars = async () => {
    setLoading(true);
    try {
      const localList = getLocalSeminars();
      const res = await fetch(`/api/seminars${category !== 'ALL' ? `?category=${category}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        const serverList = data.seminars || [];
        const merged = mergeSeminars(serverList, localList);
        setSeminars(merged);
        saveLocalSeminars(merged);
      } else if (localList.length > 0) {
        setSeminars(localList);
      }
    } catch (err) {
      console.error(err);
      const localList = getLocalSeminars();
      if (localList.length > 0) setSeminars(localList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeminars();
  }, [category, user]);

  // Real-time global SSE synchronization across all laptops/browsers
  useEffect(() => {
    let sseSource: EventSource | null = null;
    try {
      sseSource = new EventSource(`https://ntfy.sh/pixelmink_global_seminars_v1/sse?since=24h`);
      sseSource.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const data = typeof raw.message === 'string' ? JSON.parse(raw.message) : raw;
          if (data && data.type === 'new_seminar' && data.seminar) {
            setSeminars((prev) => {
              const updated = mergeSeminars(prev, [data.seminar]);
              saveLocalSeminars(updated);
              return updated;
            });
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (sseSource) sseSource.close();
    };
  }, []);

  const handleRegister = async (seminarId: string) => {
    try {
      const res = await fetch(`/api/seminars/${seminarId}/register`, { method: 'POST' });
      if (res.ok) {
        setRegisteredIds((prev) => new Set(prev).add(seminarId));
        fetchSeminars();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSeminar = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSeminar: any = {
      id: `sem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      description,
      category: semCategory,
      level,
      date,
      time,
      duration,
      maxParticipants,
      participantCount: 1,
      isLive: false,
      host: {
        profile: {
          name: user?.profile?.name || user?.email?.split('@')[0] || 'Инженер',
        },
      },
    };

    // Optimistically update locally and persist
    setSeminars((prev) => {
      const updated = [newSeminar, ...prev.filter((s) => s.id !== newSeminar.id)];
      saveLocalSeminars(updated);
      return updated;
    });
    setShowCreateModal(false);

    // Broadcast in real-time to all other computers on Vercel via cloud SSE
    try {
      fetch('https://ntfy.sh/pixelmink_global_seminars_v1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_seminar',
          seminar: newSeminar,
        }),
      }).catch(() => {});
    } catch {}

    try {
      const res = await fetch('/api/seminars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category: semCategory,
          level,
          date,
          time,
          duration,
          maxParticipants,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.seminar) {
          setSeminars((prev) => {
            const updated = mergeSeminars(prev, [data.seminar]);
            saveLocalSeminars(updated);
            return updated;
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            {lang === 'kz' ? 'Тікелей SFU тарату архитектурасы (500+ қатысушы)' : lang === 'en' ? 'Broadcast SFU Architecture (Up to 500+ peers)' : 'Архитектура SFU видеотрансляций (до 500+ слушателей)'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {lang === 'kz' ? 'Ауқымды техникалық семинарлар' : lang === 'en' ? 'Massive Technical Seminars' : 'Масштабные технические семинары'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {lang === 'kz'
              ? 'Қоғамдастық көшбасшыларының тікелей эфирдегі шеберлік сабақтары, модерацияланатын чат және сұрақ-жауап сессиялары.'
              : lang === 'en'
              ? 'Live masterclasses hosted by community leaders with live stage broadcasting, moderated chat and Q&A.'
              : 'Живые мастер-классы от лидеров сообщества с видеотрансляцией, модерацией чата и Q&A сессиями.'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold tap-active transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'kz' ? 'Семинар өткізу' : lang === 'en' ? 'Host a Seminar' : 'Провести семинар'}</span>
        </button>
      </div>

      {/* Filter Categories */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono text-zinc-500 mr-2 flex items-center gap-1">
          <Filter className="w-3 h-3" /> {lang === 'kz' ? 'Бағыт:' : lang === 'en' ? 'Track:' : 'Трек:'}
        </span>
        {[
          { id: 'ALL', ru: 'Все треки', kz: 'Барлық тректер', en: 'All Tracks' },
          { id: 'AI & MACHINE LEARNING', ru: 'AI & Машинное обучение', kz: 'AI & Машиналық оқыту', en: 'AI & Machine Learning' },
          { id: 'DESIGN & UI/UX', ru: 'Дизайн & UI/UX', kz: 'Дизайн & UI/UX', en: 'Design & UI/UX' },
          { id: 'SYSTEMS & CODING', ru: 'Системы & Кодинг', kz: 'Жүйелер & Кодинг', en: 'Systems & Coding' },
          { id: 'VIDEO EDITING & MEDIA', ru: 'Видео & Медиа', kz: 'Видео & Медиа', en: 'Video & Media' },
          { id: 'DEVOPS & CLOUD', ru: 'DevOps & Бұлт', kz: 'DevOps & Бұлт', en: 'DevOps & Cloud' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`drinkit-pill transition-all ${
              category === cat.id
                ? 'bg-blue-600 text-white border-blue-500 font-bold'
                : 'text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            {cat[lang] || cat.ru}
          </button>
        ))}
      </div>

      {/* Seminars List */}
      {loading ? (
        <div className="py-24 text-center font-mono text-xs text-zinc-500">
          {lang === 'kz' ? 'Семинарлар тізілімі жүктелуде...' : lang === 'en' ? 'Loading live seminar registry...' : 'Загрузка реестра семинаров...'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {seminars.map((sem) => {
            const isRegistered =
              registeredIds.has(sem.id) ||
              sem.participants?.some((p: any) => p.userId === user?.id);

            return (
              <div
                key={sem.id}
                className="drinkit-card p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
                      {sem.category}
                    </span>

                    {sem.isLive ? (
                      <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {lang === 'kz' ? 'ТІКЕЛЕЙ ЭФИР' : lang === 'en' ? 'BROADCASTING LIVE' : 'ПРЯМОЙ ЭФИР'}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-zinc-500">
                        {sem.level}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                    {sem.title}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                    {sem.description}
                  </p>

                  {/* Metadata Info */}
                  <div className="bg-black/40 p-3 rounded-xl border border-white/[0.04] space-y-2 text-xs font-mono text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span>{lang === 'kz' ? 'Жүргізуші:' : lang === 'en' ? 'Host:' : 'Ведущий:'}</span>
                      <span className="text-white font-medium">{sem.host?.profile?.name || (lang === 'kz' ? 'Инженер' : lang === 'en' ? 'Peer Engineer' : 'Инженер')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{lang === 'kz' ? 'Уақыты:' : lang === 'en' ? 'Schedule:' : 'Время:'}</span>
                      <span className="text-zinc-300">{sem.date} at {sem.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{lang === 'kz' ? 'Қатысушылар:' : lang === 'en' ? 'Capacity:' : 'Места:'}</span>
                      <span className="text-blue-400 font-bold">
                        {sem.participantCount || 1} / {sem.maxParticipants || 500} {lang === 'kz' ? 'тіркелді' : lang === 'en' ? 'Registered' : 'занято'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
                  {sem.isLive ? (
                    <Link
                      href={`/seminars/${sem.id}/live`}
                      className="flex-1 py-2.5 px-4 rounded-full bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-semibold text-center tap-active transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{lang === 'kz' ? 'Тікелей эфирге кіру' : lang === 'en' ? 'Enter Live Stage Room' : 'Войти в зал трансляции'}</span>
                    </Link>
                  ) : isRegistered ? (
                    <div className="flex-1 flex items-center justify-between px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {lang === 'kz' ? 'Сіз тіркелдіңіз' : lang === 'en' ? "You're Registered" : 'Вы зарегистрированы'}
                      </span>
                      <Link
                        href={`/seminars/${sem.id}/live`}
                        className="underline hover:text-white"
                      >
                        {lang === 'kz' ? 'Залға қарау' : lang === 'en' ? 'Preview Room' : 'Просмотр комнаты'}
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRegister(sem.id)}
                      className="flex-1 py-2.5 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold tap-active transition-all shadow-md shadow-blue-600/20"
                    >
                      {lang === 'kz' ? 'Тегін тіркелу' : lang === 'en' ? 'Register for Free' : 'Зарегистрироваться бесплатно'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Seminar Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#121217] border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white tracking-tight">
                {lang === 'kz' ? 'Техникалық семинар өткізу' : lang === 'en' ? 'Host Technical Seminar' : 'Провести технический семинар'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSeminar} className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  {lang === 'kz' ? 'Семинар атауы' : lang === 'en' ? 'Seminar Title' : 'Название семинара'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'kz' ? 'мысалы: Fine-Tuning LLM үлгілері' : lang === 'en' ? 'e.g. Fine-Tuning Transformers on Consumer GPUs' : 'например: Архитектура распределенных систем на Go'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  {lang === 'kz' ? 'Сипаттамасы мен жоспары' : lang === 'en' ? 'Description & Syllabus' : 'Описание и план тем'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={lang === 'kz' ? 'Қатысушылар нені үйренеді? Код мысалдары...' : lang === 'en' ? 'What will attendees learn? Provide code references...' : 'Чему научатся слушатели? Ключевые тезисы...'}
                  className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    {lang === 'kz' ? 'Бағыт' : lang === 'en' ? 'Category' : 'Категория'}
                  </label>
                  <select
                    value={semCategory}
                    onChange={(e) => setSemCategory(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                  >
                    <option value="AI & MACHINE LEARNING">{lang === 'kz' ? 'AI & Машиналық оқыту' : lang === 'en' ? 'AI & Machine Learning' : 'AI & Машинное обучение'}</option>
                    <option value="SYSTEMS & CODING">{lang === 'kz' ? 'Жүйелер & Кодинг' : lang === 'en' ? 'Systems & Coding' : 'Системы & Кодинг'}</option>
                    <option value="DESIGN & UI/UX">{lang === 'kz' ? 'Дизайн & UI/UX' : lang === 'en' ? 'Design & UI/UX' : 'Дизайн & UI/UX'}</option>
                    <option value="VIDEO EDITING & MEDIA">{lang === 'kz' ? 'Видео & Медиа' : lang === 'en' ? 'Video Editing & Media' : 'Видео & Медиа'}</option>
                    <option value="DEVOPS & CLOUD">{lang === 'kz' ? 'DevOps & Бұлт' : lang === 'en' ? 'DevOps & Cloud' : 'DevOps & Cloud'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    {lang === 'kz' ? 'Деңгей' : lang === 'en' ? 'Target Level' : 'Целевой уровень'}
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                  >
                    <option value="All Levels">{lang === 'kz' ? 'Барлық деңгейлер' : lang === 'en' ? 'All Levels' : 'Любой уровень'}</option>
                    <option value="Intermediate">{lang === 'kz' ? 'Орташа' : lang === 'en' ? 'Intermediate' : 'Средний'}</option>
                    <option value="Advanced">{lang === 'kz' ? 'Жоғары' : lang === 'en' ? 'Advanced' : 'Продвинутый'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    {lang === 'kz' ? 'Күні' : lang === 'en' ? 'Date' : 'Дата'}
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    {lang === 'kz' ? 'Уақыты' : lang === 'en' ? 'Time' : 'Время'}
                  </label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono"
                >
                  {lang === 'kz' ? 'Бас тарту' : lang === 'en' ? 'Cancel' : 'Отмена'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium tap-active transition-all"
                >
                  {lang === 'kz' ? 'Семинарды жариялау' : lang === 'en' ? 'Publish Seminar' : 'Опубликовать семинар'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
