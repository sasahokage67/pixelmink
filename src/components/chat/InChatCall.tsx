'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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

interface InChatCallProps {
  roomId: string;
  activeConvId: string;
  otherMember: any;
  currentUser: any;
  socket: any;
  initialType?: 'AUDIO' | 'VIDEO';
  onClose: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

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

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(initialType === 'AUDIO');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Shared Terminal States (Mutual Consent)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalProposal, setTerminalProposal] = useState<{ fromUserId: string; fromUserName: string } | null>(null);
  const [terminalRequestSent, setTerminalRequestSent] = useState(false);
  const [terminalDeclinedNotice, setTerminalDeclinedNotice] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const effectiveUserName = currentUser?.profile?.name || currentUser?.email?.split('@')[0] || 'Me';

  // 1. Initialize Local Media Stream
  useEffect(() => {
    let streamInstance: MediaStream | null = null;

    async function initMedia() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          let preferredId = typeof window !== 'undefined' ? localStorage.getItem('pixelmink_preferred_cam_id') : null;
          if (!preferredId && navigator.mediaDevices.enumerateDevices) {
            try {
              const devices = await navigator.mediaDevices.enumerateDevices();
              const cams = devices.filter((d) => d.kind === 'videoinput');
              const physicalCam = cams.find((c) => {
                const lbl = (c.label || '').toLowerCase();
                return !lbl.includes('vcam') && !lbl.includes('virtual') && !lbl.includes('obs');
              });
              if (physicalCam) preferredId = physicalCam.deviceId;
            } catch {}
          }

          const videoConstraint: any = initialType === 'VIDEO'
            ? (preferredId ? { deviceId: { exact: preferredId } } : true)
            : false;

          const stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraint,
            audio: true,
          });
          streamInstance = stream;
          setLocalStream(stream);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          const vTrack = stream.getVideoTracks()[0];
          if (vTrack) {
            cameraTrackRef.current = vTrack;
            if (initialType === 'AUDIO') {
              vTrack.enabled = false;
            }
          }
        }
      } catch (err) {
        console.warn('In-chat video failed, fallback to audio:', err);
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamInstance = audioStream;
          setLocalStream(audioStream);
          setIsCamOff(true);
        } catch (audioErr) {
          console.error('All media devices blocked:', audioErr);
        }
      }
    }

    initMedia();

    // Call duration timer
    const timer = setInterval(() => {
      setDurationSeconds((s) => s + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      if (streamInstance) {
        streamInstance.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [initialType]);

  // PeerConnection creation & management
  const getOrCreatePeerConnection = useCallback((targetSocketId: string) => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:signal', {
          to: targetSocketId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      const incomingStream = event.streams[0];
      if (incomingStream) {
        setRemoteStream(incomingStream);
        setIsPeerConnected(true);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = incomingStream;
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setIsPeerConnected(true);
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        setIsPeerConnected(false);
        setRemoteStream(null);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [localStream, socket]);

  // 2. WebRTC Signaling via Socket.io
  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('call:join_room', {
      roomId,
      userId: currentUser?.id,
      userName: effectiveUserName,
    });

    socket.on('call:existing_peers', ({ peers }: { peers: string[] }) => {
      if (peers && peers.length > 0) {
        getOrCreatePeerConnection(peers[0]);
      }
    });

    socket.on('call:peer_joined', async ({ socketId, userName }: { socketId: string; userName: string }) => {
      const pc = getOrCreatePeerConnection(socketId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('webrtc:signal', {
          to: socketId,
          signal: { type: 'offer', sdp: offer, senderName: effectiveUserName },
        });
      } catch (err) {
        console.error('In-chat WebRTC offer creation error:', err);
      }
    });

    socket.on('webrtc:signal', async ({ signal, from }: { signal: any; from: string }) => {
      if (!from) return;
      const pc = getOrCreatePeerConnection(from);

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('webrtc:signal', {
            to: from,
            signal: { type: 'answer', sdp: answer },
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === 'candidate' && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('In-chat signaling handling error:', err);
      }
    });

    // Terminal events
    socket.on('call:terminal_request', (data: { fromUserId: string; fromUserName: string }) => {
      setTerminalProposal(data);
    });

    socket.on('call:terminal_opened', () => {
      setIsTerminalOpen(true);
      setTerminalProposal(null);
      setTerminalRequestSent(false);
    });

    socket.on('call:terminal_declined', ({ byUserName }: { byUserName?: string }) => {
      setTerminalRequestSent(false);
      const name = byUserName || otherMember?.profile?.name || 'Собеседник';
      setTerminalDeclinedNotice(`${name} отклонил(а) предложение открыть терминал`);
      setTimeout(() => setTerminalDeclinedNotice(null), 4000);
    });

    socket.on('call:terminal_closed', () => {
      setIsTerminalOpen(false);
    });

    return () => {
      socket.off('call:existing_peers');
      socket.off('call:peer_joined');
      socket.off('webrtc:signal');
      socket.off('call:terminal_request');
      socket.off('call:terminal_opened');
      socket.off('call:terminal_declined');
      socket.off('call:terminal_closed');
    };
  }, [socket, roomId, currentUser, effectiveUserName, getOrCreatePeerConnection, otherMember]);

  // Controls
  const toggleMic = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMicMuted((prev) => !prev);
  };

  const toggleCam = () => {
    if (!localStream) return;
    const vTrack = localStream.getVideoTracks()[0];
    if (vTrack) {
      vTrack.enabled = !vTrack.enabled;
      setIsCamOff(!vTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (cameraTrackRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([cameraTrackRef.current]);
      }
      if (peerConnectionRef.current && cameraTrackRef.current) {
        const videoSender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track?.kind === 'video');
        if (videoSender) videoSender.replaceTrack(cameraTrackRef.current);
      }
      setIsScreenSharing(false);
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const screenTrack = displayStream.getVideoTracks()[0];

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = displayStream;
          }

          if (peerConnectionRef.current) {
            const videoSender = peerConnectionRef.current
              .getSenders()
              .find((s) => s.track?.kind === 'video');
            if (videoSender) videoSender.replaceTrack(screenTrack);
          }

          screenTrack.onended = () => {
            setIsScreenSharing(false);
            if (cameraTrackRef.current && localVideoRef.current) {
              localVideoRef.current.srcObject = new MediaStream([cameraTrackRef.current]);
            }
            if (peerConnectionRef.current && cameraTrackRef.current) {
              const videoSender = peerConnectionRef.current
                .getSenders()
                .find((s) => s.track?.kind === 'video');
              if (videoSender) videoSender.replaceTrack(cameraTrackRef.current);
            }
          };

          setIsScreenSharing(true);
        }
      } catch (err) {
        console.warn('Screen share cancelled in chat:', err);
      }
    }
  };

  const handleEndCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    onClose();
  };

  const handleOpenFullscreen = () => {
    router.push(`/calls/${roomId}`);
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
                ref={remoteVideoRef}
                autoPlay
                playsInline
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
            {localStream && !isCamOff ? (
              <video
                ref={localVideoRef}
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
              if (socket) socket.emit('call:terminal_close', { roomId });
              setIsTerminalOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
