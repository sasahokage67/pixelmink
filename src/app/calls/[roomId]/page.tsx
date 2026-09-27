'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  PhoneOff,
  MessageSquare,
  Users,
  Copy,
  Check,
  Send,
  X,
  Volume2,
  Share2,
  Radio,
  User,
  AlertCircle,
  Terminal as TerminalIcon,
  ChevronUp,
  Camera,
  Repeat,
  CheckCircle2,
  Clock,
  Sparkles,
  Code2,
} from 'lucide-react';
import Identicon from '@/components/ui/Identicon';
import SharedCallTerminal from '@/components/call/SharedCallTerminal';
import CallAudio from '@/components/call/CallAudio';
import { useCallConnection } from '@/hooks/useCallConnection';
import { useCallMedia } from '@/hooks/useCallMedia';

const MAX_CALL_SECONDS = 3600; // 1 hour hard cap
const PHASE_1_SECONDS = 1800; // 30 minutes for Phase 1
const WARNING_SECONDS = 3480; // 58 minutes (2 min warning)

function playAlertChime(type: 'switch' | 'warning' | 'finish') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    osc.onended = () => { void ctx.close(); };
    const gain = ctx.createGain();

    if (type === 'switch') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } else if (type === 'warning') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'finish') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, ctx.currentTime);
      osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    }
  } catch {}
}

export default function CallRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { socket } = useSocket();
  const { t, lang } = useLanguage();

  // Guest name state if friend opens without logging in
  const [guestName, setGuestName] = useState<string>('');
  const [hasEnteredName, setHasEnteredName] = useState<boolean>(false);

  const [showCameraMenu, setShowCameraMenu] = useState(false);

  // UI & 1-Hour Call Reciprocal Mentoring state (30 min + 30 min)
  const [callDuration, setCallDuration] = useState(0);
  const [mentorRole, setMentorRole] = useState<'local' | 'remote'>('local');
  const [showRoleSwitchBanner, setShowRoleSwitchBanner] = useState(false);
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const [isCallFinished, setIsCallFinished] = useState(false);

  // Stable peer identity used by the shared editor.
  const myPeerIdRef = useRef<string>('');

  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [callMessages, setCallMessages] = useState<Array<{ id: string; sender: string; text: string; time: string }>>([]);
  const [chatInput, setChatInput] = useState('');

  // Terminal state (Mutual Consent & Collaborative IDE)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalProposal, setTerminalProposal] = useState<{ fromUserId: string; fromUserName: string } | null>(null);
  const [terminalRequestSent, setTerminalRequestSent] = useState(false);
  const [terminalDeclinedNotice, setTerminalDeclinedNotice] = useState<string | null>(null);

  const effectiveUserName = user?.profile?.name || guestName || 'Peer';
  const media = useCallMedia(hasEnteredName && !isCallFinished, searchParams.get('type') === 'AUDIO');
  const {
    stream: mediaStream, preview: localPreview, micMuted: isMicMuted, camOff: isCamOff,
    sharing: isScreenSharing, devices: videoDevices, cameraId: selectedCameraId,
    toggleMic, toggleCam, toggleScreenShare,
  } = media;
  const {
    remoteStream, remotePeerName, isPeerConnected, status: connectionStatus,
    connectionError, replaceVideo, stopConnection,
  } = useCallConnection(socket, roomId, mediaStream, hasEnteredName && !isCallFinished, effectiveUserName, user?.id);
  media.replaceVideoRef.current = replaceVideo;
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize unique peer ID on mount (session-isolated so 2 tabs/devices never clash)
  useEffect(() => {
    if (!myPeerIdRef.current) {
      const stored = typeof window !== 'undefined' ? sessionStorage.getItem('pixelmink_session_peer_id') : null;
      if (stored) {
        myPeerIdRef.current = stored;
      } else {
        const generated = (user?.id ? `${user.id}_` : 'peer_') + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36).slice(-4);
        myPeerIdRef.current = generated;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pixelmink_session_peer_id', generated);
        }
      }
    }
  }, [user]);

  // Check if we need guest prompt: authenticated users bypass immediately
  useEffect(() => {
    if (authLoading) return;

    if (user?.profile?.name) {
      setHasEnteredName(true);
    } else {
      const stored = localStorage.getItem('pixelmink_guest_name');
      if (stored) {
        setGuestName(stored);
        setHasEnteredName(true);
      }
    }
  }, [user, authLoading]);

  // Copy full invite link
  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleSwitchCamera = async (id: string) => {
    setShowCameraMenu(false);
    await media.switchCamera(id);
  };

  useEffect(() => {
    if (!hasEnteredName || isCallFinished) return;
    const timer = setInterval(() => setCallDuration((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [hasEnteredName, isCallFinished]);

  useEffect(() => {
    if (callDuration === PHASE_1_SECONDS) {
      playAlertChime('switch');
      setMentorRole((role) => role === 'local' ? 'remote' : 'local');
      setShowRoleSwitchBanner(true);
    }
    if (callDuration === WARNING_SECONDS) {
      playAlertChime('warning');
      setShowWarningBanner(true);
    }
    if (callDuration >= MAX_CALL_SECONDS && !isCallFinished) {
      playAlertChime('finish');
      setIsCallFinished(true);
    }
  }, [callDuration, isCallFinished]);

  useEffect(() => {
    if (!socket || !hasEnteredName || isCallFinished) return;
    const handleChatMessage = (msg: any) => {
      if (msg.roomId !== roomId) return;
      setCallMessages((prev) => prev.some((item) => item.id === msg.id) ? prev : [...prev, msg]);
    };
    const handleRoleSwitch = (data: any) => {
      if (data.roomId !== roomId) return;
      setMentorRole(data.mentorRole);
      playAlertChime('switch');
      setShowRoleSwitchBanner(true);
    };
    const handleRequest = (data: any) => {
      if (data.roomId === roomId) setTerminalProposal(data);
    };
    const handleOpened = (data: any) => {
      if (data.roomId !== roomId) return;
      setIsTerminalOpen(true);
      setTerminalProposal(null);
      setTerminalRequestSent(false);
    };
    const handleDeclined = (data: any) => {
      if (data.roomId !== roomId) return;
      setTerminalRequestSent(false);
      setTerminalDeclinedNotice(`${data.byUserName || 'Собеседник'} отклонил(а) предложение открыть терминал`);
    };
    const handleClosed = (data: any) => {
      if (data.roomId === roomId) setIsTerminalOpen(false);
    };
    socket.on('call:new_chat_message', handleChatMessage);
    socket.on('call:role_switch', handleRoleSwitch);
    socket.on('call:terminal_request', handleRequest);
    socket.on('call:terminal_opened', handleOpened);
    socket.on('call:terminal_declined', handleDeclined);
    socket.on('call:terminal_closed', handleClosed);
    return () => {
      socket.off('call:new_chat_message', handleChatMessage);
      socket.off('call:role_switch', handleRoleSwitch);
      socket.off('call:terminal_request', handleRequest);
      socket.off('call:terminal_opened', handleOpened);
      socket.off('call:terminal_declined', handleDeclined);
      socket.off('call:terminal_closed', handleClosed);
    };
  }, [socket, roomId, hasEnteredName, isCallFinished]);

  // Manual role swap handler
  const handleManualRoleSwitch = () => {
    const nextRole = mentorRole === 'local' ? 'remote' : 'local';
    setMentorRole(nextRole);
    playAlertChime('switch');
    setShowRoleSwitchBanner(true);
    setTimeout(() => setShowRoleSwitchBanner(false), 8000);

    socket?.emit('call:role_switch', {
      roomId,
      mentorRole: nextRole === 'local' ? 'remote' : 'local',
      byUserName: effectiveUserName,
    });
  };

  // Send In-call Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      sender: effectiveUserName,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (socket) {
      socket.emit('call:chat_message', { roomId, message: newMsg });
    }

    setCallMessages((prev) => prev.some((item) => item.id === newMsg.id) ? prev : [...prev, newMsg]);
    setChatInput('');
  };

  // Terminal Handlers (Instant Real-time Toggle)
  const handleToggleTerminal = () => {
    if (isTerminalOpen) {
      if (socket) {
        socket.emit('call:terminal_close', { roomId });
      }
      setIsTerminalOpen(false);
    } else {
      if (socket) {
        socket.emit('call:terminal_opened', { roomId, byUserName: effectiveUserName });
      }
      setIsTerminalOpen(true);
    }
  };

  const handleAcceptTerminal = () => {
    if (socket) {
      socket.emit('call:terminal_response', {
        roomId,
        accepted: true,
        fromUserName: effectiveUserName,
      });
    }
    setTerminalProposal(null);
    setIsTerminalOpen(true);
  };

  const handleDeclineTerminal = () => {
    if (socket) {
      socket.emit('call:terminal_response', {
        roomId,
        accepted: false,
        fromUserName: effectiveUserName,
      });
    }
    setTerminalProposal(null);
  };

  const handleLeaveCall = () => {
    stopConnection();
    media.stop();
    router.push('/matches');
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatCountdown = (secs: number) => {
    const s = Math.max(0, secs);
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // If auth is still checking, show clean connecting screen
  if (authLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-xs text-zinc-400">
          Подключение к сессии WebRTC...
        </span>
      </div>
    );
  }

  // If friend opened the link without logging in, show quick name prompt
  if (!hasEnteredName) {
    return (
      <div className="fixed inset-0 z-50 bg-[#09090b] flex items-center justify-center p-4">
        <div className="drinkit-card p-6 md:p-8 max-w-md w-full bg-[#0e0e13] border border-white/10 space-y-5 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
            <VideoIcon className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-white font-mono">
              Вход в видеокомнату
            </h2>
            <p className="text-xs font-mono text-zinc-400">
              Введите ваше имя, чтобы ваш собеседник видел, кто подключился
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (guestName.trim()) {
                localStorage.setItem('pixelmink_guest_name', guestName.trim());
                setHasEnteredName(true);
              }
            }}
            className="space-y-3"
          >
            <input
              type="text"
              required
              autoFocus
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. Кент, Alex, John..."
              className="w-full bg-[#16161c] border border-white/[0.1] focus:border-blue-500 rounded-lg px-4 py-3 text-xs text-white outline-none font-mono text-center"
            />
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
            >
              {lang === 'ru' ? 'Войти в созвон' : lang === 'kz' ? 'Қоңырауға кіру' : 'Enter Call'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isPhase1 = callDuration < PHASE_1_SECONDS;
  const isLocalMentor = mentorRole === 'local';
  const currentMentorName = isLocalMentor ? effectiveUserName : (remotePeerName || 'Собеседник');
  const currentStudentName = isLocalMentor ? (remotePeerName || 'Собеседник') : effectiveUserName;
  const phaseRemaining = isPhase1 ? PHASE_1_SECONDS - callDuration : MAX_CALL_SECONDS - callDuration;

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col justify-between overflow-hidden select-none">
      {/* Top Bar with 1-Hour Reciprocal Mentoring Status */}
      <header className="h-14 border-b border-white/[0.08] px-3 sm:px-6 flex items-center justify-between bg-[#0e0e13]/90 backdrop-blur-md shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-bold text-white tracking-wider uppercase hidden md:inline">
              {roomId}
            </span>
          </div>

          <span className="text-zinc-600 hidden md:inline">•</span>

          {/* Reciprocal Phase Badge & Timer */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-mono border transition-all ${
              isPhase1
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isPhase1 ? 'bg-blue-400' : 'bg-purple-400'} animate-pulse`} />
            <span className="font-bold whitespace-nowrap">
              {isPhase1 ? '1/2' : '2/2'}:
            </span>
            <span className="text-white hidden sm:inline">
              Ментор: <b className="text-blue-300">@{currentMentorName}</b>
            </span>
            <span className="text-zinc-500 hidden lg:inline">→</span>
            <span className="text-zinc-400 hidden lg:inline">
              Ученик: @{currentStudentName}
            </span>
            <span className="text-zinc-500 hidden sm:inline">•</span>
            <span className="text-zinc-200 font-bold whitespace-nowrap">
              {formatCountdown(phaseRemaining)}
            </span>
          </div>

          <span className="font-mono text-xs text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 hidden xl:inline">
            Всего: {formatDuration(callDuration)} / 60:00
          </span>
        </div>

        {/* Right Actions: Manual Role Swap & Copy Invite */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={handleManualRoleSwitch}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-[#181820] hover:bg-[#20202a] text-zinc-200 border border-white/10 text-xs font-mono font-medium transition-all tap-active"
            title="Поменяться ролями (ментор / ученик)"
          >
            <Repeat className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Сменить роли</span>
          </button>

          <button
            onClick={handleToggleTerminal}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-md ${
              isTerminalOpen
                ? 'bg-emerald-600 text-white border border-emerald-400 shadow-emerald-600/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 shadow-blue-600/20'
            }`}
            title="Открыть совместный редактор и компилятор кода (Python, C++, JS, Rust, Go)"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isTerminalOpen ? 'Закрыть компилятор' : 'Компилятор кода'}</span>
            <span className="sm:hidden">{isTerminalOpen ? 'Закрыть' : 'Код'}</span>
          </button>
        </div>
      </header>

      {/* Reciprocal Role Switch Banner Alert */}
      {showRoleSwitchBanner && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-blue-950 via-indigo-950 to-purple-950 border border-blue-500/50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-mono text-white animate-in fade-in slide-in-from-top-4 max-w-lg w-full">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Repeat className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-blue-300">
              {isPhase1 ? 'Смена ролей активирована!' : 'Смена ролей! Вторые 30 минут начались'}
            </div>
            <div className="text-[11px] text-zinc-300">
              Теперь <span className="text-white font-bold">@{currentMentorName}</span> обучает{' '}
              <span className="text-white font-bold">@{currentStudentName}</span>.
            </div>
          </div>
          <button
            onClick={() => setShowRoleSwitchBanner(false)}
            className="text-zinc-400 hover:text-white ml-2 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2-Minute Call Limit Warning Toast */}
      {showWarningBanner && !isCallFinished && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-amber-950/90 border border-amber-500/60 px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-mono text-amber-200 animate-in fade-in slide-in-from-top-4 max-w-lg w-full">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span className="flex-1">
            <b>Внимание:</b> До завершения 1-часовой сессии осталось 2 минуты! Завершайте разбор темы и подводите итоги.
          </span>
          <button
            onClick={() => setShowWarningBanner(false)}
            className="text-amber-400 hover:text-white ml-2 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mutual Consent Proposal Modal for Shared Terminal */}
      {terminalProposal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0e0e14] border border-blue-500/30 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <TerminalIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  {lang === 'ru' ? 'Запрос на совместный терминал' : lang === 'kz' ? 'Бірлескен терминал сұрауы' : 'Shared Coding Request'}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  <span className="text-blue-400 font-bold">{terminalProposal.fromUserName}</span> {lang === 'ru' ? 'предлагает открыть терминал для кодинга' : lang === 'kz' ? 'код жазу терминалын ашуды ұсынады' : 'wants to open coding sandbox'}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 font-mono bg-white/[0.03] p-3 rounded-xl border border-white/[0.06] leading-relaxed">
              {lang === 'ru'
                ? 'Прямо внутри видеозвонка откроется живой терминал и редактор кода с поддержкой Python, JS/TS, Rust, C++, Go, Bash и SQL. Код и консоль выполнения синхронизируются в реальном времени.'
                : lang === 'kz'
                ? 'Бейнеқоңырау ішінде Python, JS/TS, Rust, C++, Go, Bash және SQL қолдайтын тірі терминал ашылады. Код пен нәтижелер екі жаққа да нақты уақытта көрінеді.'
                : 'A collaborative terminal supporting Python, JS/TS, Rust, C++, Go, Bash will open live.'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={handleDeclineTerminal}
                className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs font-mono font-medium transition-all"
              >
                {lang === 'ru' ? 'Отклонить' : lang === 'kz' ? 'Бас тарту' : 'Decline'}
              </button>
              <button
                onClick={handleAcceptTerminal}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{lang === 'ru' ? 'Согласиться и открыть' : lang === 'kz' ? 'Келісу және ашу' : 'Accept & Open'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notice: Terminal Request Waiting */}
      {terminalRequestSent && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-[#14141e] border border-blue-500/40 px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 text-xs font-mono text-zinc-200 animate-in fade-in slide-in-from-top-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <span>
            {lang === 'ru'
              ? 'Ожидание подтверждения собеседника на открытие терминала...'
              : lang === 'kz'
              ? 'Сұхбаттасыңыздың терминалды ашуға келісімі күтілуде...'
              : 'Waiting for peer approval to open terminal...'}
          </span>
          <button
            onClick={() => setTerminalRequestSent(false)}
            className="text-zinc-500 hover:text-white ml-1 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Toast Notice: Terminal Declined */}
      {terminalDeclinedNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-red-950/80 border border-red-500/40 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-mono text-red-200 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          <span>{terminalDeclinedNotice}</span>
        </div>
      )}

      {(media.error || connectionError || connectionStatus === 'reconnecting') && (
        <div role="status" className="px-4 py-2 text-xs text-amber-200 bg-amber-500/10">
          {media.error || connectionError || 'Восстанавливаем соединение…'}
        </div>
      )}

      {/* Main Video Viewport (Responsive: Full-width IDE with Floating PiP on Mobile, Docked 2-column on Desktop) */}
      <div className="flex-1 p-2 sm:p-3 md:p-6 flex flex-col md:flex-row gap-3 md:gap-4 overflow-hidden relative min-h-0">
        {/* If Terminal is Open: show collaborative IDE taking full space on mobile */}
        {isTerminalOpen && (
          <div className="flex-1 w-full h-full min-w-0 min-h-0 flex flex-col">
            <SharedCallTerminal
              roomId={roomId}
              socket={socket}
              currentUser={user}
              partnerName={remotePeerName || 'Собеседник'}
              isMentor={isLocalMentor}
              mySenderId={myPeerIdRef.current || user?.id}
              onClose={() => {
                setIsTerminalOpen(false);
              }}
            />
          </div>
        )}

        {/* Mobile-only Floating PiP Video when Terminal is Open */}
        <CallAudio stream={remoteStream} />
        {isTerminalOpen && (
          <div className="md:hidden fixed bottom-20 right-3 z-30 w-32 sm:w-36 aspect-video rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-[#121217] backdrop-blur-md">
            {isPeerConnected && remoteStream ? (
              <video
                ref={(el) => {
                  if (el && remoteStream && el.srcObject !== remoteStream) {
                    el.srcObject = remoteStream;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-zinc-900/90 text-center">
                <Identicon name={remotePeerName || 'peer'} size={24} />
                <span className="text-[9px] font-mono text-zinc-400 truncate max-w-[90%] mt-1">
                  {remotePeerName || 'Ожидание...'}
                </span>
              </div>
            )}
            <div className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-mono text-white flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isPeerConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="truncate max-w-[65px]">{remotePeerName || 'Peer'}</span>
            </div>
          </div>
        )}

        {/* Video Cards: full grid when terminal closed, docked vertical stack when terminal open (Desktop only) */}
        <div
          className={`h-full max-h-[calc(100vh-140px)] ${
            isTerminalOpen
              ? 'hidden md:flex md:w-60 lg:w-72 md:flex-col md:gap-3 md:shrink-0'
              : 'flex-1 relative md:grid md:grid-cols-2 gap-3 md:gap-4'
          }`}
        >
          {/* Peer 1: Local Stream (Floating selfie PiP on mobile, left column on desktop) */}
          <div
            className={`overflow-hidden bg-[#121217] flex items-center justify-center transition-all ${
              isTerminalOpen
                ? 'flex-1 min-h-0 relative rounded-2xl border border-white/[0.08]'
                : 'absolute bottom-4 right-4 w-28 h-36 sm:w-32 sm:h-44 md:relative md:w-auto md:h-full md:bottom-auto md:right-auto rounded-2xl border-2 border-white/20 md:border md:border-white/[0.08] shadow-2xl md:shadow-none z-20'
            }`}
          >
            <video
              ref={(el) => {
                localVideoRef.current = el;
                if (el && localPreview && el.srcObject !== localPreview) {
                  el.srcObject = localPreview;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCamOff && !isScreenSharing ? 'hidden' : ''}`}
            />

            {isCamOff && !isScreenSharing && (
              <div className="flex flex-col items-center justify-center gap-1 sm:gap-2 text-zinc-500 p-2 text-center">
                <Identicon name={effectiveUserName} size={isTerminalOpen ? 48 : 56} />
                <div className="text-[11px] font-mono text-zinc-400 truncate max-w-[90px]">{effectiveUserName}</div>
                <div className="text-[9px] font-mono text-zinc-600">Camera Off</div>
              </div>
            )}

            {/* Local Stream Overlay */}
            <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3 flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[10px] md:text-xs font-mono text-white">
              <span className="hidden sm:inline">{effectiveUserName} (Вы)</span>
              <span className="sm:hidden">Вы</span>
              {isLocalMentor ? (
                <span className="flex items-center gap-0.5 text-[9px] md:text-[10px] font-bold bg-blue-500/25 text-blue-300 border border-blue-500/40 px-1.5 py-0.5 rounded-full">
                  🎓 Ментор
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-[9px] md:text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-white/10 px-1.5 py-0.5 rounded-full">
                  🎧 Ученик
                </span>
              )}
              {isMicMuted && <MicOff className="w-3 h-3 text-red-400" />}
              {isScreenSharing && <Monitor className="w-3 h-3 text-blue-400" />}
            </div>
          </div>

          {/* Peer 2: Remote Friend Stream OR Authentic Waiting State (Full width on mobile, right column on desktop) */}
          <div
            className={`relative rounded-2xl overflow-hidden bg-[#121217] border border-white/[0.08] flex items-center justify-center ${
              isTerminalOpen ? 'flex-1 min-h-0' : 'w-full h-full'
            }`}
          >
            {isPeerConnected && remoteStream ? (
              <>
                <video
                  ref={(el) => {
                    remoteVideoRef.current = el;
                    if (el && remoteStream && el.srcObject !== remoteStream) {
                      el.srcObject = remoteStream;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-xs font-mono text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{remotePeerName || 'Собеседник'}</span>
                  {!isLocalMentor ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-500/25 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full">
                      🎓 Ментор
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-white/10 px-2 py-0.5 rounded-full">
                      🎧 Ученик
                    </span>
                  )}
                </div>
              </>
            ) : (
              /* Senior Peer Authentic Connecting Screen */
              <div className="p-4 md:p-6 text-center space-y-4 max-w-sm">
                <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mx-auto flex items-center justify-center text-blue-400">
                  <Radio className="w-7 h-7 animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs md:text-sm font-bold text-white font-mono flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span>
                      {lang === 'ru'
                        ? 'Вызов собеседника...'
                        : lang === 'kz'
                        ? 'Сұхбаттасты шақыру...'
                        : 'Calling peer...'}
                    </span>
                  </div>
                  <p className="text-[11px] md:text-xs font-mono text-zinc-400 leading-relaxed">
                    {lang === 'ru'
                      ? 'Ожидание подключения к видеоканалу. Собеседнику отправлен входящий звонок.'
                      : lang === 'kz'
                      ? 'Бейнеарнаға қосылу күтілуде. Сұхбаттасқа кіріс қоңырау жіберілді.'
                      : 'Waiting for peer to establish WebRTC connection.'}
                  </p>
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleLeaveCall}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-mono text-xs font-medium transition-all"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>{lang === 'ru' ? 'Отменить вызов' : 'Қоңырауды тоқтату'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* In-Call Real-Time Chat Drawer */}
        {showChat && (
          <aside className="w-80 h-full max-h-[calc(100vh-140px)] bg-[#101015] border border-white/[0.08] rounded-2xl flex flex-col justify-between shrink-0 shadow-2xl animate-in slide-in-from-right-4">
            <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono">
                {lang === 'ru' ? 'Чат созвона' : lang === 'kz' ? 'Қоңырау чаты' : 'Call Chat'}
              </span>
              <button
                onClick={() => setShowChat(false)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message List */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto font-mono text-xs">
              {callMessages.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-[11px]">
                  {lang === 'ru'
                    ? 'Сообщений пока нет. Здесь можно делиться ссылками и кодом.'
                    : lang === 'kz'
                    ? 'Хабарламалар жоқ. Мұнда сілтемелер мен код жіберуге болады.'
                    : 'No messages yet. Share code snippets and notes here.'}
                </div>
              ) : (
                callMessages.map((msg) => (
                  <div key={msg.id} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span className="font-bold text-zinc-300">{msg.sender}</span>
                      <span>{msg.time}</span>
                    </div>
                    <div className="p-2 rounded bg-white/[0.04] text-zinc-200 break-words">
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/[0.08] flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={lang === 'ru' ? 'Написать в чат...' : 'Хабарлама жазу...'}
                className="flex-1 bg-[#16161c] border border-white/[0.1] focus:border-blue-500 rounded px-2.5 py-1.5 text-xs text-white outline-none font-mono"
              />
              <button
                type="submit"
                className="p-2 rounded bg-blue-600 hover:bg-blue-500 text-white transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* Bottom Control Bar */}
      <footer className="h-16 border-t border-white/[0.08] px-4 md:px-8 bg-[#0c0c10] flex items-center justify-between shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-500">
          <span>Комната: <span className="text-zinc-300">{roomId}</span></span>
        </div>

        {/* Media Control Buttons */}
        <div className="flex items-center gap-3 mx-auto sm:mx-0">
          {/* Mute Mic */}
          <button
            onClick={toggleMic}
            className={`p-3 rounded-full transition-all ${
              isMicMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isMicMuted ? 'Включить микрофон' : 'Выключить микрофон'}
          >
            {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Toggle Video & Device Selector */}
          <div className="relative">
            <div className="flex items-center">
              <button
                onClick={toggleCam}
                className={`p-3 ${
                  videoDevices.length > 0 ? 'rounded-l-full' : 'rounded-full'
                } transition-all ${
                  isCamOff
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title={isCamOff ? 'Включить камеру' : 'Выключить камеру'}
              >
                {isCamOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
              </button>

              {videoDevices.length > 0 && (
                <button
                  onClick={() => setShowCameraMenu(!showCameraMenu)}
                  className={`p-3 pr-2.5 pl-1.5 rounded-r-full border-l border-white/10 transition-all ${
                    isCamOff
                      ? 'bg-red-500/20 text-red-400 border-r border-t border-b border-red-500/30'
                      : 'bg-white/10 hover:bg-white/20 text-zinc-300'
                  }`}
                  title="Выбрать физическую камеру / устройство"
                >
                  <ChevronUp className={`w-3.5 h-3.5 transition-transform ${showCameraMenu ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Camera Selection Popover */}
            {showCameraMenu && videoDevices.length > 0 && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-72 bg-[#121218] border border-white/15 rounded-xl shadow-2xl p-2 z-50 space-y-1 font-mono text-xs">
                <div className="px-2 py-1 text-[10px] text-zinc-400 uppercase font-bold border-b border-white/10 flex items-center justify-between">
                  <span>Выбор камеры</span>
                  <span className="text-zinc-500">{videoDevices.length} найдено</span>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 pt-1">
                  {videoDevices.map((dev, idx) => {
                    const isSelected = dev.deviceId === selectedCameraId;
                    const label = dev.label || `Камера ${idx + 1}`;
                    const isVirtual = label.toLowerCase().includes('vcam') || label.toLowerCase().includes('obs') || label.toLowerCase().includes('virtual');
                    return (
                      <button
                        key={dev.deviceId || idx}
                        onClick={() => handleSwitchCamera(dev.deviceId)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            : 'hover:bg-white/5 text-zinc-300'
                        }`}
                      >
                        <div className="truncate flex-1">
                          <span className="block truncate">{label}</span>
                          {isVirtual && (
                            <span className="text-[9px] text-amber-400 font-mono">Виртуальная камера</span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full transition-all ${
              isScreenSharing
                ? 'bg-blue-600 text-white border border-blue-400 shadow-md shadow-blue-500/20'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Демонстрация экрана"
          >
            <Monitor className="w-4 h-4" />
          </button>

          {/* Shared Coding Terminal Toggle (Mutual Consent) */}
          <button
            onClick={handleToggleTerminal}
            className={`p-3 rounded-full transition-all relative flex items-center justify-center ${
              isTerminalOpen
                ? 'bg-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={
              isTerminalOpen
                ? (lang === 'ru' ? 'Закрыть терминал' : lang === 'kz' ? 'Терминалды жабу' : 'Close Terminal')
                : (lang === 'ru' ? 'Совместный терминал кодинга (по согласию)' : lang === 'kz' ? 'Бірлескен код терминалы' : 'Shared Coding Terminal')
            }
          >
            <TerminalIcon className="w-4 h-4" />
          </button>

          {/* In-Call Chat Drawer Toggle */}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-3 rounded-full transition-all relative ${
              showChat
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Чат созвона"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* End Call Button */}
          <button
            onClick={handleLeaveCall}
            className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-red-600/30 flex items-center gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">
              {lang === 'ru' ? 'Завершить созвон' : lang === 'kz' ? 'Аяқтау' : 'Leave'}
            </span>
          </button>
        </div>

        <div className="hidden sm:block" />
      </footer>

      {/* 1-Hour Session Auto-End Completion Modal */}
      {isCallFinished && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none">
          <div className="bg-[#111116] border border-blue-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>1-часовая сессия завершена</span>
              </div>
              <h2 className="text-xl font-bold text-white font-mono tracking-tight">
                Время сессии истекло (60 минут)
              </h2>
              <p className="text-xs font-mono text-zinc-400 leading-relaxed">
                Вы успешно провели взаимный обмен знаниями: 30 минут обучения от первого ментора и 30 минут обратного менторства.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-zinc-300 space-y-2 text-left">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Длительность:</span>
                <span className="text-white font-bold">60 мин (3600с)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Формат:</span>
                <span className="text-blue-400 font-medium">30 мин + 30 мин взаимно</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Участники:</span>
                <span className="text-zinc-200 truncate max-w-[200px]">{effectiveUserName} & {remotePeerName || 'Собеседник'}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => router.push('/matches')}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-blue-600/30 tap-active"
              >
                Все пользователи
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold transition-all tap-active"
              >
                В кабинет
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
