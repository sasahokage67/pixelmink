'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Video, Plus, ArrowRight, Shield, Mic, Monitor, Link2, Users, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function CallsOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [customRoom, setCustomRoom] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleStartInstantCall = () => {
    // Generate clean human-readable room id
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const roomId = `room-${randomSuffix}`;
    router.push(`/calls/${roomId}`);
  };

  const handleJoinCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoom.trim()) return;
    
    // Support either room ID (e.g. room-abc) or full URL (e.g. http://localhost:3000/calls/room-abc)
    let parsedRoom = customRoom.trim();
    if (parsedRoom.includes('/calls/')) {
      parsedRoom = parsedRoom.split('/calls/')[1].split('?')[0].split('#')[0];
    }
    if (parsedRoom) {
      router.push(`/calls/${parsedRoom}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-5xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs mb-2">
            <Video className="w-3.5 h-3.5" />
            <span>P2P WebRTC Direct Audio / Video</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white font-mono">
            {lang === 'ru'
              ? 'Видеосозвоны и шеринг экрана 1-на-1'
              : lang === 'kz'
              ? '1-ге-1 бейнеқоңыраулар және экран бөлісу'
              : 'Direct 1-on-1 Calls & Screen Sharing'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-mono">
            {lang === 'ru'
              ? 'Прямое зашифрованное WebRTC-соединение в браузере без записи на серверах и сторонних приложений.'
              : lang === 'kz'
              ? 'Серверде жазылмайтын және бөтен қосымшасыз тікелей браузердегі шифрланған WebRTC байланысы.'
              : 'End-to-end encrypted direct peer-to-peer browser video stream with zero server recording.'}
          </p>
        </div>

        <button
          onClick={handleStartInstantCall}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold tap-active transition-all shadow-lg shadow-blue-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>
            {lang === 'ru'
              ? 'Создать комнату для созвона'
              : lang === 'kz'
              ? 'Қоңырау бөлмесін ашу'
              : 'Create Instant Call Room'}
          </span>
        </button>
      </div>

      {/* Main 2-Column Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Create & Invite Peer */}
        <div className="drinkit-card p-6 bg-[#0e0e13] border border-white/10 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Video className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white font-mono">
              {lang === 'ru' ? 'Быстрый созвон с другом' : lang === 'kz' ? 'Досыңмен жылдам қоңырау' : 'Instant Peer Call'}
            </h2>
            <p className="text-xs font-mono text-zinc-400 leading-relaxed">
              {lang === 'ru'
                ? 'Создайте уникальную P2P-комнату в один клик. Ссылка генерируется мгновенно — скопируйте ее и отправьте кенту в Telegram, WhatsApp или Discord.'
                : lang === 'kz'
                ? 'Бір басу арқылы бірегей P2P бөлме жасаңыз. Сілтеме бірден пайда болады — оны көшіріп, досыңызға жіберіңіз.'
                : 'Generate a dedicated peer-to-peer media room in one click. Share the invite URL directly with your peer.'}
            </p>
          </div>

          <button
            onClick={handleStartInstantCall}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
          >
            <span>{lang === 'ru' ? 'Открыть комнату сейчас' : lang === 'kz' ? 'Бөлмені қазір ашу' : 'Launch Call Room Now'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: Join by ID or URL */}
        <div className="drinkit-card p-6 bg-[#0e0e13] border border-white/10 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Link2 className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white font-mono">
              {lang === 'ru' ? 'Присоединиться по ссылке или коду' : lang === 'kz' ? 'Сілтеме немесе кодпен қосылу' : 'Join by Link or Code'}
            </h2>
            <p className="text-xs font-mono text-zinc-400 leading-relaxed">
              {lang === 'ru'
                ? 'Если друг уже скинул вам ссылку на комнату или код — вставьте его сюда для моментального входа в видеосессию.'
                : lang === 'kz'
                ? 'Егер досыңыз сізге бөлме сілтемесін немесе кодын жіберген болса — бейнебайланысқа кіру үшін осында қойыңыз.'
                : 'Paste the invite link or room ID provided by your peer to immediately establish the WebRTC peer connection.'}
            </p>
          </div>

          <form onSubmit={handleJoinCustom} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={customRoom}
                onChange={(e) => setCustomRoom(e.target.value)}
                placeholder="e.g. room-abc123 or https://..."
                className="flex-1 bg-[#16161c] border border-white/[0.1] focus:border-blue-500 rounded-lg px-3 py-2.5 text-xs text-white outline-none font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-mono font-bold transition-all shrink-0"
              >
                {lang === 'ru' ? 'Войти' : lang === 'kz' ? 'Кіру' : 'Join'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Clear 3-Step Instruction Guide */}
      <div className="drinkit-card p-6 md:p-8 bg-[#0b0b0e] border border-white/[0.08] space-y-5">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            {lang === 'ru'
              ? 'Как созвониться с кентом (Инструкция в 3 шага)'
              : lang === 'kz'
              ? 'Досыңмен қалай байланысуға болады (3 қадамдық нұсқаулық)'
              : 'How to Connect with a Peer (3-Step Guide)'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-[#121217] border border-white/[0.06] space-y-2">
            <div className="text-blue-400 font-bold">01. {lang === 'ru' ? 'Создайте комнату' : lang === 'kz' ? 'Бөлме ашыңыз' : 'Create Room'}</div>
            <p className="text-zinc-400 leading-relaxed">
              {lang === 'ru'
                ? 'Нажмите кнопку «Создать комнату». Откроется ваш персональный видеоэкран.'
                : lang === 'kz'
                ? '«Бөлме ашу» батырмасын басыңыз. Жеке бейнеэкран ашылады.'
                : 'Click "Create Room". Your personal video stream starts.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#121217] border border-white/[0.06] space-y-2">
            <div className="text-emerald-400 font-bold">02. {lang === 'ru' ? 'Отправьте ссылку' : lang === 'kz' ? 'Сілтемені жіберіңіз' : 'Share Link'}</div>
            <p className="text-zinc-400 leading-relaxed">
              {lang === 'ru'
                ? 'Скопируйте ссылку нажатием кнопки в комнате и скиньте другу в любой мессенджер.'
                : lang === 'kz'
                ? 'Бөлмедегі батырманы басып сілтемені көшіріңіз де, досыңызға жіберіңіз.'
                : 'Copy the invite URL in one click and send it to your friend.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#121217] border border-white/[0.06] space-y-2">
            <div className="text-purple-400 font-bold">03. {lang === 'ru' ? 'Прямой P2P звонок' : lang === 'kz' ? 'Тікелей P2P қоңырау' : 'Direct P2P Stream'}</div>
            <p className="text-zinc-400 leading-relaxed">
              {lang === 'ru'
                ? 'Кент открывает ссылку в браузере, и WebRTC автоматически запускает живой видеопоток, микрофон и чат.'
                : lang === 'kz'
                ? 'Досыңыз сілтемені браузерде ашқан сәтте, WebRTC тікелей дыбыс, бейне және чатты қосады.'
                : 'Your peer opens the link, and WebRTC connects your camera, audio, screen share, and chat.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
