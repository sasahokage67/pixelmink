'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
} from 'lucide-react';
import Identicon from '@/components/ui/Identicon';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function CallRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { t, lang } = useLanguage();

  // Guest name state if friend opens without logging in
  const [guestName, setGuestName] = useState<string>('');
  const [hasEnteredName, setHasEnteredName] = useState<boolean>(false);

  // Local media states
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Remote peer state
  const [remotePeerSocketId, setRemotePeerSocketId] = useState<string | null>(null);
  const [remotePeerName, setRemotePeerName] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isPeerConnected, setIsPeerConnected] = useState(false);

  // UI & Call state
  const [callDuration, setCallDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [callMessages, setCallMessages] = useState<Array<{ id: string; sender: string; text: string; time: string }>>([]);
  const [chatInput, setChatInput] = useState('');

  // Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  // Effective username
  const effectiveUserName = user?.profile?.name || guestName || 'Peer';

  // Check if we need guest prompt
  useEffect(() => {
    if (user?.profile?.name) {
      setHasEnteredName(true);
    } else {
      const stored = localStorage.getItem('pixelmink_guest_name');
      if (stored) {
        setGuestName(stored);
        setHasEnteredName(true);
      }
    }
  }, [user]);

  // Copy full invite link
  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // 1. Initialize Local Media Stream
  useEffect(() => {
    if (!hasEnteredName) return;

    let activeStream: MediaStream | null = null;

    async function setupCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          activeStream = stream;
          setMediaStream(stream);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          const vTrack = stream.getVideoTracks()[0];
          if (vTrack) cameraTrackRef.current = vTrack;
        }
      } catch (err) {
        console.warn('Could not access camera/mic, trying audio-only:', err);
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          activeStream = audioStream;
          setMediaStream(audioStream);
          setIsCamOff(true);
        } catch (audioErr) {
          console.warn('Audio access also failed:', audioErr);
        }
      }
    }

    setupCamera();

    // Duration counter
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [hasEnteredName]);

  // Create or retrieve PeerConnection
  const getOrCreatePeerConnection = useCallback((targetSocketId: string) => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Add local tracks to WebRTC
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        pc.addTrack(track, mediaStream);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:signal', {
          to: targetSocketId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    // Remote Track handler
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
        setRemotePeerName(null);
        setRemotePeerSocketId(null);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [mediaStream, socket]);

  // 2. WebRTC Signaling over Socket.io
  useEffect(() => {
    if (!socket || !roomId || !hasEnteredName) return;

    // Join room on server
    socket.emit('call:join_room', {
      roomId,
      userId: user?.id || `guest_${Date.now()}`,
      userName: effectiveUserName,
    });

    // A: Existing peers already in the room when we joined
    socket.on('call:existing_peers', ({ peers }: { peers: string[] }) => {
      if (peers && peers.length > 0) {
        const firstPeer = peers[0];
        setRemotePeerSocketId(firstPeer);
      }
    });

    // B: New peer joins the room -> WE initiate WebRTC Offer
    socket.on('call:peer_joined', async ({ socketId, userName }: { socketId: string; userId: string; userName: string }) => {
      setRemotePeerSocketId(socketId);
      setRemotePeerName(userName);

      const pc = getOrCreatePeerConnection(socketId);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('webrtc:signal', {
          to: socketId,
          signal: { type: 'offer', sdp: offer, senderName: effectiveUserName },
        });
      } catch (err) {
        console.error('Error creating WebRTC offer:', err);
      }
    });

    // C: Receive WebRTC Signal (Offer / Answer / Candidate)
    socket.on('webrtc:signal', async ({ signal, from }: { signal: any; from: string }) => {
      if (!from) return;

      if (signal.senderName && !remotePeerName) {
        setRemotePeerName(signal.senderName);
      }
      setRemotePeerSocketId(from);

      const pc = getOrCreatePeerConnection(from);

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('webrtc:signal', {
            to: from,
            signal: { type: 'answer', sdp: answer, senderName: effectiveUserName },
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === 'candidate' && signal.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (iceErr) {
            console.warn('Error adding ICE candidate:', iceErr);
          }
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    });

    // D: In-call Chat Messages
    socket.on('call:new_chat_message', (msg: any) => {
      setCallMessages((prev) => [...prev, msg]);
    });

    // E: Peer Disconnected
    socket.on('call:peer_left', ({ socketId }: { socketId: string }) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      setRemotePeerSocketId(null);
      setRemotePeerName(null);
      setRemoteStream(null);
      setIsPeerConnected(false);
    });

    return () => {
      socket.emit('call:leave', { roomId });
      socket.off('call:existing_peers');
      socket.off('call:peer_joined');
      socket.off('webrtc:signal');
      socket.off('call:new_chat_message');
      socket.off('call:peer_left');

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [socket, roomId, hasEnteredName, effectiveUserName, getOrCreatePeerConnection, remotePeerName]);

  // Toggle Microphone
  const toggleMic = () => {
    if (mediaStream) {
      const aTrack = mediaStream.getAudioTracks()[0];
      if (aTrack) {
        aTrack.enabled = !aTrack.enabled;
        setIsMicMuted(!aTrack.enabled);
      } else {
        setIsMicMuted(!isMicMuted);
      }
    } else {
      setIsMicMuted(!isMicMuted);
    }
  };

  // Toggle Camera
  const toggleCam = () => {
    if (mediaStream) {
      const vTrack = mediaStream.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = !vTrack.enabled;
        setIsCamOff(!vTrack.enabled);
      } else {
        setIsCamOff(!isCamOff);
      }
    } else {
      setIsCamOff(!isCamOff);
    }
  };

  // Screen Sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to camera
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      if (cameraTrackRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([cameraTrackRef.current]);
      }
      if (peerConnectionRef.current && cameraTrackRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(cameraTrackRef.current);
        }
      }
      setIsScreenSharing(false);
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const screenTrack = displayStream.getVideoTracks()[0];
          screenTrackRef.current = screenTrack;

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = displayStream;
          }

          if (peerConnectionRef.current) {
            const senders = peerConnectionRef.current.getSenders();
            const videoSender = senders.find((s) => s.track?.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(screenTrack);
            }
          }

          screenTrack.onended = () => {
            setIsScreenSharing(false);
            if (cameraTrackRef.current && localVideoRef.current) {
              localVideoRef.current.srcObject = new MediaStream([cameraTrackRef.current]);
            }
            if (peerConnectionRef.current && cameraTrackRef.current) {
              const senders = peerConnectionRef.current.getSenders();
              const videoSender = senders.find((s) => s.track?.kind === 'video');
              if (videoSender) {
                videoSender.replaceTrack(cameraTrackRef.current);
              }
            }
          };

          setIsScreenSharing(true);
        }
      } catch (err) {
        console.warn('Screen share cancelled:', err);
      }
    }
  };

  // Send In-call Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;

    const newMsg = {
      id: Math.random().toString(36).substring(2, 9),
      sender: effectiveUserName,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    socket.emit('call:chat_message', { roomId, message: newMsg });
    setCallMessages((prev) => [...prev, newMsg]);
    setChatInput('');
  };

  // Leave Call
  const handleLeaveCall = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    router.push('/calls');
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
              {lang === 'ru' ? 'Вход в видеокомнату' : lang === 'kz' ? 'Бейнебөлмеге кіру' : 'Join Call Room'}
            </h2>
            <p className="text-xs font-mono text-zinc-400">
              {lang === 'ru'
                ? 'Введите ваше имя, чтобы ваш собеседник видел, кто подключился'
                : lang === 'kz'
                ? 'Сұхбаттасыңыз кім қосылғанын көруі үшін есіміңізді енгізіңіз'
                : 'Enter your name to connect directly via WebRTC'}
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

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col justify-between overflow-hidden select-none">
      {/* Top Bar */}
      <header className="h-14 border-b border-white/[0.08] px-4 md:px-6 flex items-center justify-between bg-[#0e0e13]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-bold text-white tracking-wider uppercase">
              {roomId}
            </span>
          </div>

          <span className="text-zinc-600">•</span>
          <span className="font-mono text-xs text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
            {formatDuration(callDuration)}
          </span>

          <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            P2P Direct WebRTC
          </span>
        </div>

        {/* Copy Invite Link for Friend Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              copiedLink
                ? 'bg-emerald-600 text-white border border-emerald-400 shadow-lg shadow-emerald-600/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 shadow-lg shadow-blue-600/20'
            }`}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>
              {copiedLink
                ? lang === 'ru'
                  ? 'Ссылка скопирована!'
                  : lang === 'kz'
                  ? 'Сілтеме көшірілді!'
                  : 'Link Copied!'
                : lang === 'ru'
                ? 'Скопировать ссылку для кента'
                : lang === 'kz'
                ? 'Досыңа сілтемені көшіру'
                : 'Copy Invite Link'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Video Viewport (2-Side P2P Grid) */}
      <div className="flex-1 p-3 md:p-6 flex gap-4 overflow-hidden relative">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 h-full max-h-[calc(100vh-140px)]">
          {/* Peer 1: Local Stream */}
          <div className="relative rounded-2xl overflow-hidden bg-[#121217] border border-white/[0.08] flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCamOff ? 'hidden' : ''}`}
            />

            {isCamOff && (
              <div className="flex flex-col items-center justify-center gap-3 text-zinc-500">
                <Identicon name={effectiveUserName} size={80} />
                <div className="text-xs font-mono text-zinc-400">{effectiveUserName}</div>
                <div className="text-[10px] font-mono text-zinc-600">Camera Off</div>
              </div>
            )}

            {/* Local Stream Overlay */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs font-mono text-white">
              <span>{effectiveUserName} (You)</span>
              {isMicMuted && <MicOff className="w-3 h-3 text-red-400" />}
              {isScreenSharing && <Monitor className="w-3 h-3 text-blue-400" />}
            </div>
          </div>

          {/* Peer 2: Remote Friend Stream OR Authentic Waiting State */}
          <div className="relative rounded-2xl overflow-hidden bg-[#121217] border border-white/[0.08] flex items-center justify-center">
            {isPeerConnected && remoteStream ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs font-mono text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{remotePeerName || 'Собеседник'}</span>
                </div>
              </>
            ) : (
              /* Authentic Waiting Screen (Zero Fake Users) */
              <div className="p-6 text-center space-y-4 max-w-sm">
                <div className="relative w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 mx-auto flex items-center justify-center text-blue-400">
                  <Radio className="w-7 h-7 animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                </div>

                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-white font-mono">
                    {lang === 'ru'
                      ? 'Ожидание подключения кента...'
                      : lang === 'kz'
                      ? 'Досыңның қосылуын күтуде...'
                      : 'Waiting for Peer to Join...'}
                  </div>
                  <p className="text-xs font-mono text-zinc-400 leading-relaxed">
                    {lang === 'ru'
                      ? 'Скиньте ссылку на эту комнату своему другу. Как только он перейдет по ней — вы сразу увидите и услышите друг друга.'
                      : lang === 'kz'
                      ? 'Осы бөлме сілтемесін досыңызға жіберіңіз. Ол кірген кезде бейнебайланыс бірден басталады.'
                      : 'Share the link with your friend. Connection will establish automatically over WebRTC.'}
                  </p>
                </div>

                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white font-mono text-xs font-medium transition-all"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>{copiedLink ? (lang === 'ru' ? 'Скопировано!' : 'Көшірілді!') : (lang === 'ru' ? 'Скопировать ссылку' : 'Сілтемені көшіру')}</span>
                </button>
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

          {/* Toggle Video */}
          <button
            onClick={toggleCam}
            className={`p-3 rounded-full transition-all ${
              isCamOff
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isCamOff ? 'Включить камеру' : 'Выключить камеру'}
          >
            {isCamOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
          </button>

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
    </div>
  );
}
