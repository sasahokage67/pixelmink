'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  Maximize2,
  Minimize2,
  Radio,
  Volume2,
  Terminal as TerminalIcon,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import Identicon from '@/components/ui/Identicon';
import SharedCallTerminal from '@/components/call/SharedCallTerminal';
import CallAudio from '@/components/call/CallAudio';
import { useCallConnection } from '@/hooks/useCallConnection';
import { useCallMedia } from '@/hooks/useCallMedia';

interface InChatCallProps {
  roomId: string;
  activeConvId: string;
  otherMember: any;
  currentUser: any;
  socket: any;
  initialType?: 'AUDIO' | 'VIDEO';
  onClose: () => void;
}

export default function InChatCall({
  roomId,
  activeConvId,
  otherMember,
  currentUser,
  socket,
  initialType = 'VIDEO',
  onClose,
}: InChatCallProps) {
  const router = useRouter();

  const [durationSeconds, setDurationSeconds] = useState(0);

  // Shared Terminal States (Mutual Consent)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalProposal, setTerminalProposal] = useState<{ fromUserId: string; fromUserName: string } | null>(null);
  const [terminalRequestSent, setTerminalRequestSent] = useState(false);
  const [terminalDeclinedNotice, setTerminalDeclinedNotice] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const effectiveUserName = currentUser?.profile?.name || currentUser?.email?.split('@')[0] || 'Me';
  const media = useCallMedia(true, initialType === 'AUDIO');
  const {
    stream: localStream, preview: localPreview, micMuted: isMicMuted, camOff: isCamOff,
    sharing: isScreenSharing, toggleMic, toggleCam, toggleScreenShare,
  } = media;
  const { remoteStream, isPeerConnected, connectionError, replaceVideo, stopConnection } =
    useCallConnection(socket, roomId, localStream, true, effectiveUserName, currentUser?.id);
  media.replaceVideoRef.current = replaceVideo;

  useEffect(() => {
    const timer = setInterval(() => setDurationSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const request = (data: any) => { if (data.roomId === roomId) setTerminalProposal(data); };
    const opened = (data: any) => {
      if (data.roomId !== roomId) return;
      setIsTerminalOpen(true);
      setTerminalProposal(null);
      setTerminalRequestSent(false);
    };
    const declined = (data: any) => {
      if (data.roomId !== roomId) return;
      setTerminalRequestSent(false);
      setTerminalDeclinedNotice(`${data.byUserName || 'Собеседник'} отклонил(а) предложение открыть терминал`);
    };
    const closed = (data: any) => { if (data.roomId === roomId) setIsTerminalOpen(false); };
    socket.on('call:terminal_request', request);
    socket.on('call:terminal_opened', opened);
    socket.on('call:terminal_declined', declined);
    socket.on('call:terminal_closed', closed);
    return () => {
      socket.off('call:terminal_request', request);
      socket.off('call:terminal_opened', opened);
      socket.off('call:terminal_declined', declined);
      socket.off('call:terminal_closed', closed);
    };
  }, [socket, roomId]);

  const handleEndCall = () => {
    stopConnection();
    media.stop();
    onClose();
  };

  const handleOpenFullscreen = () => {
    router.push(`/calls/${roomId}?type=${initialType}`);
  };

  const handleToggleTerminal = () => {
    if (isTerminalOpen) {
      if (socket) socket.emit('call:terminal_close', { roomId });
      setIsTerminalOpen(false);
    } else {
      if (!socket) return;
      socket.emit('call:terminal_request', {
        roomId,
        fromUserId: currentUser?.id,
        fromUserName: effectiveUserName,
      });
      setTerminalRequestSent(true);
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

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border-b border-white/[0.08] bg-[#09090c] p-3 animate-in slide-in-from-top-4 transition-all">
      <CallAudio stream={remoteStream} />
      {(media.error || connectionError) && (
        <div role="status" className="px-3 py-2 text-xs text-amber-200">{media.error || connectionError}</div>
      )}
      {/* Mutual Consent Proposal Modal */}
      {terminalProposal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0e0e14] border border-blue-500/30 p-5 rounded-2xl max-w-sm w-full shadow-2xl space-y-3.5 animate-in zoom-in-95">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <TerminalIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white font-mono">Совместный терминал</h3>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {terminalProposal.fromUserName} предлагает открыть терминал
                </p>
              </div>
            </div>
            <p className="text-[11px] text-zinc-300 font-mono bg-white/[0.03] p-2.5 rounded-lg border border-white/[0.06] leading-relaxed">
              Откроется общий редактор кода и терминал (Python, JS, TS, Rust, C++, Go, Bash, SQL). Запуск синхронизируется в реальном времени.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleDeclineTerminal}
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs font-mono transition-all"
              >
                Отклонить
              </button>
              <button
                onClick={handleAcceptTerminal}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Открыть</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Waiting Toast */}
      {terminalRequestSent && (
        <div className="mb-2 bg-[#14141e] border border-blue-500/40 px-3 py-1.5 rounded-full shadow-lg flex items-center justify-between text-[11px] font-mono text-zinc-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>Ожидание согласия собеседника на открытие терминала...</span>
          </div>
          <button onClick={() => setTerminalRequestSent(false)} className="text-zinc-500 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Terminal Declined Toast */}
      {terminalDeclinedNotice && (
        <div className="mb-2 bg-red-950/80 border border-red-500/40 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-[11px] font-mono text-red-200 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          <span>{terminalDeclinedNotice}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Videos Container: Responsive Side-by-side or PiP */}
        <div className="grid grid-cols-2 gap-3 w-full md:w-auto flex-1 max-w-xl">
          {/* Peer's Stream */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-[#141419] border border-white/[0.08] flex items-center justify-center">
            {isPeerConnected && remoteStream ? (
              <video
                ref={(element) => {
                  remoteVideoRef.current = element;
                  if (element && element.srcObject !== remoteStream) {
                    element.srcObject = remoteStream;
                    element.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-3 text-center space-y-1">
                <div className="relative">
                  <span className="absolute -inset-1 rounded-full bg-blue-500/30 animate-ping" />
                  <Identicon name={otherMember?.profile?.name || 'peer'} size={38} />
                </div>
                <div className="text-[10px] font-mono text-zinc-400 mt-1">
                  Ожидание собеседника...
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-mono text-white">
              {otherMember?.profile?.name || 'Собеседник'}
            </div>
          </div>

          {/* Local User's Stream */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-[#141419] border border-white/[0.08] flex items-center justify-center">
            {localStream && (!isCamOff || isScreenSharing) ? (
              <video
                ref={(element) => {
                  localVideoRef.current = element;
                  if (element && element.srcObject !== localPreview) element.srcObject = localPreview;
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-3 text-center">
                <Identicon name={effectiveUserName} size={38} />
                <div className="text-[10px] font-mono text-zinc-500 mt-1">Камера выключена</div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-mono text-white flex items-center gap-1.5">
              <span>{effectiveUserName} (Вы)</span>
              {isMicMuted && <span className="text-red-400 text-[9px]">Mute</span>}
            </div>
          </div>
        </div>

        {/* Floating In-Chat Call Controls */}
        <div className="flex items-center gap-2 shrink-0 bg-[#141419] border border-white/[0.08] px-3 py-2 rounded-2xl">
          <div className="flex items-center gap-1.5 pr-2 border-r border-white/10 font-mono text-xs text-emerald-400 font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>{formatTimer(durationSeconds)}</span>
          </div>

          {/* Mute Mic */}
          <button
            onClick={toggleMic}
            title={isMicMuted ? 'Включить микрофон' : 'Заглушить микрофон'}
            className={`p-2 rounded-xl transition-all ${
              isMicMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Toggle Cam */}
          <button
            onClick={toggleCam}
            title={isCamOff ? 'Включить камеру' : 'Выключить камеру'}
            className={`p-2 rounded-xl transition-all ${
              isCamOff
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {isCamOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            title={isScreenSharing ? 'Остановить показ экрана' : 'Поделиться экраном'}
            className={`p-2 rounded-xl transition-all ${
              isScreenSharing
                ? 'bg-blue-600 text-white'
                : 'bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Monitor className="w-4 h-4" />
          </button>

          {/* Shared Coding Terminal Toggle */}
          <button
            onClick={handleToggleTerminal}
            title={isTerminalOpen ? 'Закрыть терминал' : 'Открыть совместный терминал (требуется согласие)'}
            className={`p-2 rounded-xl transition-all ${
              isTerminalOpen
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <TerminalIcon className="w-4 h-4" />
          </button>

          {/* Expand to Full Call Room */}
          <button
            onClick={handleOpenFullscreen}
            title="Открыть на весь экран в отдельной комнате"
            className="p-2 rounded-xl bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <Maximize2 className="w-4 h-4 text-blue-400" />
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            title="Завершить созвон"
            className="p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/30"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Embedded In-Chat Collaborative Coding Sandbox */}
      {isTerminalOpen && (
        <div className="mt-3 h-[420px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95">
          <SharedCallTerminal
            roomId={roomId}
            socket={socket}
            currentUser={currentUser}
            partnerName={otherMember?.profile?.name || 'Собеседник'}
            onClose={() => {
              setIsTerminalOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
