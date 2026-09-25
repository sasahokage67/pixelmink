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
} from 'lucide-react';
import Identicon from '@/components/ui/Identicon';

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
          const stream = await navigator.mediaDevices.getUserMedia({
            video: initialType === 'VIDEO',
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

    return () => {
      socket.off('call:existing_peers');
      socket.off('call:peer_joined');
      socket.off('webrtc:signal');
    };
  }, [socket, roomId, currentUser, effectiveUserName, getOrCreatePeerConnection]);

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

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border-b border-white/[0.08] bg-[#09090c] p-3 animate-in slide-in-from-top-4 transition-all">
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
    </div>
  );
}
