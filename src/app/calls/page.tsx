'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Video,
  Plus,
  ArrowRight,
  Shield,
  Mic,
  Monitor,
  Link2,
  Users,
  Check,
  Phone,
  PhoneCall,
  Globe,
  Radio,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSocket } from '@/context/SocketContext';
import Identicon from '@/components/ui/Identicon';

export default function CallsOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { socket, onlineUsers } = useSocket();

  const [customRoom, setCustomRoom] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [peers, setPeers] = useState<any[]>([]);
  const [loadingPeers, setLoadingPeers] = useState(true);

  // Fetch registered peers
  useEffect(() => {
    async function loadPeers() {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setPeers(data.users || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPeers(false);
      }
    }
    loadPeers();
  }, []);

  const handleStartInstantCall = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const roomId = `room-${randomSuffix}`;
    router.push(`/calls/${roomId}`);
  };

  const handleCallPeer = async (peer: any) => {
    const roomId = `call_${Date.now()}`;
    try {
      await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: peer.id,
          roomId,
          type: 'VIDEO',
        }),
      });

      if (socket) {
        socket.emit('call:initiate', {
          callerId: user?.id,
          callerName: user?.profile?.name || user?.email?.split('@')[0] || 'Peer Developer',
          callerAvatar: user?.profile?.avatar,
          receiverId: peer.id,
          roomId,
          type: 'VIDEO',
        });
      }
    } catch (e) {
      console.error(e);
    }
    router.push(`/calls/${roomId}`);
  };

  const handleJoinCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoom.trim()) return;
    
    let parsedRoom = customRoom.trim();
    if (parsedRoom.includes('/calls/')) {
      parsedRoom = parsedRoom.split('/calls/')[1].split('?')[0].split('#')[0];
    }
    if (parsedRoom) {
      router.push(`/calls/${parsedRoom}`);
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopySiteLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
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

      {/* Cross-Computer External Access Banner */}
      <div className="drinkit-card p-5 bg-gradient-to-r from-blue-950/30 to-[#0e0e13] border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
            <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>
              {lang === 'ru'
                ? 'Созвон с другом с другого компьютера'
                : lang === 'kz'
                ? 'Басқа компьютерден досыңмен байланысу'
                : 'Connect with a Friend from Another PC'}
            </span>
          </div>
          <p className="text-xs text-zinc-300 font-mono">
            {lang === 'ru'
              ? 'Отправьте ссылку на сайт другу. Он открывает ее в браузере — вы можете позвонить ему в 1 клик, а у него появится окно «Принять вызов»!'
              : lang === 'kz'
              ? 'Сайт сілтемесін досыңызға жіберіңіз. Ол браузерден кіргенде 1 басу арқылы қоңырау шаласыз, оған «Қабылдау» терезесі шығады!'
              : 'Share the live site link. When your friend is on the site, call them directly and they will receive an instant Answer Call popup!'}
          </p>
        </div>

        <button
          onClick={handleCopySiteLink}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            copiedLink
              ? 'bg-emerald-600 text-white border border-emerald-400 shadow-lg shadow-emerald-600/20'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
          }`}
        >
          {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedLink ? (lang === 'ru' ? 'Ссылка скопирована!' : 'Көшірілді!') : (lang === 'ru' ? 'Скопировать ссылку на сайт' : 'Сайт сілтемесін көшіру')}</span>
        </button>
      </div>

      {/* Online / Registered Peers Section for Direct Ringing */}
      <div className="drinkit-card p-6 bg-[#0e0e13] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              {lang === 'ru'
                ? 'Прямой вызов коллеги на сайте'
                : lang === 'kz'
                ? 'Сайттағы әріптеске тікелей қоңырау'
                : 'Direct Ring to Peer on Site'}
            </h2>
          </div>
          <span className="font-mono text-xs text-zinc-500">
            {peers.length} {lang === 'ru' ? 'пользователей' : 'users'}
          </span>
        </div>

        {peers.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 font-mono text-xs">
            {lang === 'ru'
              ? 'Пока нет других пользователей. Отправьте ссылку на сайт другу, чтобы он зарегистрировался!'
              : 'No other users registered yet. Send the site link to your friend!'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {peers.map((peer) => {
              const isOnline = onlineUsers.has(peer.id);

              return (
                <div
                  key={peer.id}
                  className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between gap-3 hover:border-white/[0.12] transition-colors"
                >
                  <Link
                    href={`/profile?userId=${peer.id}`}
                    className="flex items-center gap-2.5 min-w-0 group"
                    title="Перейти в личный кабинет"
                  >
                    <div className="relative">
                      <Identicon name={peer.profile?.name || peer.email} size={36} />
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                        {peer.profile?.name || peer.email?.split('@')[0]}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                        <span className={isOnline ? 'text-emerald-400' : 'text-zinc-500'}>
                          {isOnline ? (lang === 'ru' ? 'В сети' : 'Online') : (lang === 'ru' ? 'Не в сети' : 'Offline')}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={() => handleCallPeer(peer)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-[11px] font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm shadow-blue-600/30 tap-active"
                    title="Позвонить прямо сейчас"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{lang === 'ru' ? 'Вызов' : lang === 'kz' ? 'Қоңырау' : 'Call'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
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
            <div className="text-blue-400 font-bold">01. {lang === 'ru' ? 'Отправьте ссылку на сайт' : lang === 'kz' ? 'Сайт сілтемесін жіберіңіз' : 'Share Site Link'}</div>
            <p className="text-zinc-400 leading-relaxed">
              {lang === 'ru'
                ? 'Скиньте другу публичную ссылку (Cloudflare Tunnel). Он заходит с любого компа.'
                : lang === 'kz'
                ? 'Досыңызға жария сілтемені жіберіңіз (Cloudflare Tunnel). Ол кез келген компьютерден кіре алады.'
                : 'Send your friend the public HTTPS tunnel link to open on their PC.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#121217] border border-white/[0.06] space-y-2">
            <div className="text-emerald-400 font-bold">02. {lang === 'ru' ? 'Нажмите «Вызов»' : lang === 'kz' ? '«Қоңырау» батырмасын басыңыз' : 'Click Call'}</div>
            <p className="text-zinc-400 leading-relaxed">
              {lang === 'ru'
                ? 'Нажмите «Вызов» в списке коллег или на его странице — у друга заиграет звонок.'
                : lang === 'kz'
                ? 'Әріптестер тізімінде немесе оның парақшасында «Қоңырау» басыңыз — досыңызда қоңырау үні шығады.'
                : 'Click "Call" next to their name — an incoming ringtone sounds on their computer.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#121217] border border-white/[0.06] space-y-2">
            <div className="text-purple-400 font-bold">03. {lang === 'ru' ? 'Друг жмет «Принять»' : lang === 'kz' ? 'Досыңыз «Қабылдау» басады' : 'Peer Accepts'}</div>
            <p className="text-zinc-400 leading-relaxed">
              {lang === 'ru'
                ? 'Друг жмет зеленую кнопку «Принять вызов» прямо на сайте и мгновенно подключается к вашей камере.'
                : lang === 'kz'
                ? 'Досыңыз сайттағы жасыл «Қабылдау» батырмасын басып, бірден бейнебайланысқа қосылады.'
                : 'Your peer clicks "Answer Call" right on the site and WebRTC immediately starts video & screen sharing.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
