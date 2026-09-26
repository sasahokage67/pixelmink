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

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const MAX_CALL_SECONDS = 3600; // 1 hour hard cap
const PHASE_1_SECONDS = 1800; // 30 minutes for Phase 1
const WARNING_SECONDS = 3480; // 58 minutes (2 min warning)

function playAlertChime(type: 'switch' | 'warning' | 'finish') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
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
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
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

  // Camera devices
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  // Remote peer state
  const [remotePeerSocketId, setRemotePeerSocketId] = useState<string | null>(null);
  const [remotePeerName, setRemotePeerName] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isPeerConnected, setIsPeerConnected] = useState(false);

  // UI & 1-Hour Call Reciprocal Mentoring state (30 min + 30 min)
  const [callDuration, setCallDuration] = useState(0);
  const [mentorRole, setMentorRole] = useState<'local' | 'remote'>('local');
  const [showRoleSwitchBanner, setShowRoleSwitchBanner] = useState(false);
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const [isCallFinished, setIsCallFinished] = useState(false);

  // Cloud signaling refs (cross-laptop P2P relay on Vercel)
  const myPeerIdRef = useRef<string>('');
  const lastSignalPollTimeRef = useRef<number>(0);
  const handledSignalIdsRef = useRef<Set<string>>(new Set());

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

  // Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  // Effective username
  const effectiveUserName = user?.profile?.name || guestName || 'Peer';

  // Initialize unique peer ID on mount
  useEffect(() => {
    if (!myPeerIdRef.current) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('pixelmink_client_peer_id') : null;
      if (stored) {
        myPeerIdRef.current = stored;
      } else {
        const generated = (user?.id ? `${user.id}_` : 'peer_') + Math.random().toString(36).substring(2, 9);
        myPeerIdRef.current = generated;
        if (typeof window !== 'undefined') {
          localStorage.setItem('pixelmink_client_peer_id', generated);
        }
      }
    }
  }, [user]);

  // Dual signaling helper (Socket.IO + Cloud REST relay for cross-laptop Vercel communication)
  const sendRoomSignalHttp = useCallback(
    async (signal: any, toPeerId?: string | null) => {
      try {
        await fetch('/api/calls/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'room_send',
            roomId,
            fromPeerId: myPeerIdRef.current,
            toPeerId: toPeerId || undefined,
            signal,
          }),
        });
      } catch {}
    },
    [roomId]
  );

  const sendRoomSignal = useCallback(
    async (signal: any, toPeerId?: string | null) => {
      if (socket) {
        socket.emit('webrtc:signal', {
          to: toPeerId || remotePeerSocketId,
          signal,
        });
      }
      await sendRoomSignalHttp(signal, toPeerId || remotePeerSocketId);
    },
    [socket, remotePeerSocketId, sendRoomSignalHttp]
  );

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

  // Switch camera device dynamically
  const handleSwitchCamera = async (newDeviceId: string) => {
    try {
      setShowCameraMenu(false);
      setSelectedCameraId(newDeviceId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('pixelmink_preferred_cam_id', newDeviceId);
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: newDeviceId } },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      if (cameraTrackRef.current) {
        cameraTrackRef.current.stop();
      }
      cameraTrackRef.current = newVideoTrack;

      if (mediaStream) {
        const oldTrack = mediaStream.getVideoTracks()[0];
        if (oldTrack) mediaStream.removeTrack(oldTrack);
        mediaStream.addTrack(newVideoTrack);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }
      }

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      setIsCamOff(false);
    } catch (err) {
      console.error('Failed to switch camera:', err);
    }
  };

  // 1. Initialize Local Media Stream
  useEffect(() => {
    if (!hasEnteredName) return;

    let activeStream: MediaStream | null = null;

    async function setupCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          // Discover video devices
          let cams: MediaDeviceInfo[] = [];
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            cams = devices.filter((d) => d.kind === 'videoinput');
            setVideoDevices(cams);
          } catch {}

          let preferredId = typeof window !== 'undefined' ? localStorage.getItem('pixelmink_preferred_cam_id') : null;

          // If no stored preference or stored device is missing, avoid virtual cam (VCam, OBS) if physical exists
          if (!preferredId || !cams.some((c) => c.deviceId === preferredId)) {
            const physicalCam = cams.find((c) => {
              const lbl = (c.label || '').toLowerCase();
              return !lbl.includes('vcam') && !lbl.includes('virtual') && !lbl.includes('obs');
            });
            preferredId = physicalCam?.deviceId || cams[0]?.deviceId || '';
          }

          if (preferredId) {
            setSelectedCameraId(preferredId);
          }

          const videoConstraints: any = preferredId ? { deviceId: { exact: preferredId } } : true;

          const stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: true,
          });
          activeStream = stream;
          setMediaStream(stream);

          // Re-enumerate to get labeled devices if first enumerate was unlabeled
          try {
            const updatedDevices = await navigator.mediaDevices.enumerateDevices();
            const updatedCams = updatedDevices.filter((d) => d.kind === 'videoinput');
            setVideoDevices(updatedCams);
          } catch {}

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

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [hasEnteredName]);

  // 1-Hour Call Reciprocal Timer (30m Mentor 1 + 30m Mentor 2)
  useEffect(() => {
    if (!hasEnteredName || isCallFinished) return;

    const timer = setInterval(() => {
      setCallDuration((prev) => {
        const next = prev + 1;

        // Auto role switch at 30 minutes (1800s)
        if (next === PHASE_1_SECONDS) {
          playAlertChime('switch');
          setMentorRole((r) => (r === 'local' ? 'remote' : 'local'));
          setShowRoleSwitchBanner(true);
          setTimeout(() => setShowRoleSwitchBanner(false), 9000);
        }

        // 2-minute warning at 58 minutes (3480s)
        if (next === WARNING_SECONDS) {
          playAlertChime('warning');
          setShowWarningBanner(true);
        }

        // 1-hour hard cap at 60 minutes (3600s)
        if (next >= MAX_CALL_SECONDS) {
          playAlertChime('finish');
          setIsCallFinished(true);
          if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
          }
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }
          clearInterval(timer);
          return MAX_CALL_SECONDS;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasEnteredName, isCallFinished, mediaStream]);

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
      if (event.candidate) {
        if (socket) {
          socket.emit('webrtc:signal', {
            to: targetSocketId,
            signal: { type: 'candidate', candidate: event.candidate },
          });
        }
        sendRoomSignalHttp({ type: 'candidate', candidate: event.candidate }, targetSocketId);
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

        sendRoomSignal({ type: 'offer', sdp: offer, senderName: effectiveUserName }, socketId);
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

          sendRoomSignal({ type: 'answer', sdp: answer, senderName: effectiveUserName }, from);
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

    // Role switch event over socket
    socket.on('call:role_switch', ({ mentorRole: newRole }: any) => {
      if (newRole) {
        setMentorRole(newRole);
        playAlertChime('switch');
        setShowRoleSwitchBanner(true);
        setTimeout(() => setShowRoleSwitchBanner(false), 8000);
      }
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

    // F: Shared Coding Terminal Events (Mutual Consent)
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
      const name = byUserName || 'Собеседник';
      setTerminalDeclinedNotice(`${name} отклонил(а) предложение открыть терминал`);
      setTimeout(() => setTerminalDeclinedNotice(null), 4000);
    });

    socket.on('call:terminal_closed', () => {
      setIsTerminalOpen(false);
    });

    return () => {
      socket.emit('call:leave', { roomId });
      socket.off('call:existing_peers');
      socket.off('call:peer_joined');
      socket.off('webrtc:signal');
      socket.off('call:new_chat_message');
      socket.off('call:role_switch');
      socket.off('call:peer_left');
      socket.off('call:terminal_request');
      socket.off('call:terminal_opened');
      socket.off('call:terminal_declined');
      socket.off('call:terminal_closed');

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [socket, roomId, hasEnteredName, effectiveUserName, getOrCreatePeerConnection, remotePeerName, sendRoomSignal]);

  // 3. WebRTC Signaling over HTTP Cloud Relay (Vercel cross-device fallback)
  useEffect(() => {
    if (!roomId || !hasEnteredName || isCallFinished) return;

    let isMounted = true;

    // Announce presence in room
    sendRoomSignalHttp({
      type: 'peer_joined',
      userName: effectiveUserName,
      peerId: myPeerIdRef.current,
    });

    const pollSignals = async () => {
      try {
        const res = await fetch(
          `/api/calls/signal?action=room_poll&roomId=${encodeURIComponent(roomId)}&peerId=${encodeURIComponent(myPeerIdRef.current)}&since=${lastSignalPollTimeRef.current}`,
          { cache: 'no-store' }
        );
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.timestamp) lastSignalPollTimeRef.current = data.timestamp;
          const signals = data.signals || [];

          for (const item of signals) {
            if (handledSignalIdsRef.current.has(item.id)) continue;
            handledSignalIdsRef.current.add(item.id);

            const { fromPeerId, signal } = item;
            if (!signal) continue;

            if (signal.userName && !remotePeerName) {
              setRemotePeerName(signal.userName);
            }
            if (fromPeerId && !remotePeerSocketId) {
              setRemotePeerSocketId(fromPeerId);
            }

            if (signal.type === 'peer_joined') {
              setRemotePeerSocketId(fromPeerId);
              if (signal.userName) setRemotePeerName(signal.userName);

              const pc = getOrCreatePeerConnection(fromPeerId);
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendRoomSignal({ type: 'offer', sdp: offer, senderName: effectiveUserName }, fromPeerId);
              } catch (e) {
                console.error(e);
              }
            } else if (signal.type === 'offer') {
              const pc = getOrCreatePeerConnection(fromPeerId);
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendRoomSignal({ type: 'answer', sdp: answer, senderName: effectiveUserName }, fromPeerId);
              } catch (e) {
                console.error(e);
              }
            } else if (signal.type === 'answer') {
              const pc = getOrCreatePeerConnection(fromPeerId);
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
              } catch (e) {
                console.error(e);
              }
            } else if (signal.type === 'candidate' && signal.candidate) {
              const pc = getOrCreatePeerConnection(fromPeerId);
              try {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
              } catch (e) {
                console.warn(e);
              }
            } else if (signal.type === 'chat_message') {
              setCallMessages((prev) => {
                if (prev.some((m) => m.id === signal.message.id)) return prev;
                return [...prev, signal.message];
              });
            } else if (signal.type === 'role_switch') {
              if (signal.mentorRole) {
                setMentorRole(signal.mentorRole);
                playAlertChime('switch');
                setShowRoleSwitchBanner(true);
                setTimeout(() => setShowRoleSwitchBanner(false), 8000);
              }
            } else if (signal.type === 'terminal_request') {
              setTerminalProposal({ fromUserId: fromPeerId, fromUserName: signal.fromUserName || 'Собеседник' });
            } else if (signal.type === 'terminal_opened') {
              setIsTerminalOpen(true);
              setTerminalProposal(null);
              setTerminalRequestSent(false);
            } else if (signal.type === 'terminal_declined') {
              setTerminalRequestSent(false);
              setTerminalDeclinedNotice(`${signal.byUserName || 'Собеседник'} отклонил(а) предложение открыть терминал`);
              setTimeout(() => setTerminalDeclinedNotice(null), 4000);
            } else if (signal.type === 'terminal_closed') {
              setIsTerminalOpen(false);
            }
          }
        }
      } catch {}
    };

    // Instant WebRTC signals over ntfy SSE
    let sseSource: EventSource | null = null;
    const cleanRoomId = roomId.replace(/[^a-zA-Z0-9_-]/g, '_');
    try {
      sseSource = new EventSource(`https://ntfy.sh/pixelmink_call_${cleanRoomId}/sse`);
      sseSource.onmessage = async (event) => {
        try {
          const raw = JSON.parse(event.data);
          const item = typeof raw.message === 'string' ? JSON.parse(raw.message) : raw;
          if (!item || !item.signal) return;
          if (item.fromPeerId === myPeerIdRef.current) return;
          if (item.toPeerId && item.toPeerId !== myPeerIdRef.current) return;

          const signal = item.signal;
          if (signal.userName && !remotePeerName) setRemotePeerName(signal.userName);
          if (item.fromPeerId && !remotePeerSocketId) setRemotePeerSocketId(item.fromPeerId);

          if (signal.type === 'peer_joined') {
            setRemotePeerSocketId(item.fromPeerId);
            if (signal.userName) setRemotePeerName(signal.userName);
            const pc = getOrCreatePeerConnection(item.fromPeerId);
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              sendRoomSignal({ type: 'offer', sdp: offer, senderName: effectiveUserName }, item.fromPeerId);
            } catch (e) {}
          } else if (signal.type === 'offer') {
            const pc = getOrCreatePeerConnection(item.fromPeerId);
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendRoomSignal({ type: 'answer', sdp: answer, senderName: effectiveUserName }, item.fromPeerId);
            } catch (e) {}
          } else if (signal.type === 'answer') {
            const pc = getOrCreatePeerConnection(item.fromPeerId);
            try {
              if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
              }
            } catch (e) {}
          } else if (signal.type === 'ice-candidate') {
            const pc = getOrCreatePeerConnection(item.fromPeerId);
            try {
              if (signal.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
              }
            } catch (e) {}
          } else if (signal.type === 'terminal_opened') {
            setIsTerminalOpen(true);
            setTerminalProposal(null);
            setTerminalRequestSent(false);
          } else if (signal.type === 'terminal_closed') {
            setIsTerminalOpen(false);
          }
        } catch {}
      };
    } catch {}

    const interval = setInterval(pollSignals, 1800);
    return () => {
      isMounted = false;
      clearInterval(interval);
      if (sseSource) sseSource.close();
    };
  }, [roomId, hasEnteredName, isCallFinished, effectiveUserName, sendRoomSignal, sendRoomSignalHttp, getOrCreatePeerConnection, remotePeerName, remotePeerSocketId]);

  // Manual role swap handler
  const handleManualRoleSwitch = () => {
    const nextRole = mentorRole === 'local' ? 'remote' : 'local';
    setMentorRole(nextRole);
    playAlertChime('switch');
    setShowRoleSwitchBanner(true);
    setTimeout(() => setShowRoleSwitchBanner(false), 8000);

    sendRoomSignal({
      type: 'role_switch',
      mentorRole: nextRole === 'local' ? 'remote' : 'local',
      byUserName: effectiveUserName,
    });
  };

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
    if (!chatInput.trim()) return;

    const newMsg = {
      id: Math.random().toString(36).substring(2, 9),
      sender: effectiveUserName,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (socket) {
      socket.emit('call:chat_message', { roomId, message: newMsg });
    }
    sendRoomSignalHttp({ type: 'chat_message', message: newMsg });

    setCallMessages((prev) => [...prev, newMsg]);
    setChatInput('');
  };

  // Terminal Handlers (Instant Real-time Toggle)
  const handleToggleTerminal = () => {
    if (isTerminalOpen) {
      if (socket) {
        socket.emit('call:terminal_close', { roomId });
      }
      sendRoomSignalHttp({ type: 'terminal_closed' });
      setIsTerminalOpen(false);
    } else {
      if (socket) {
        socket.emit('call:terminal_opened', { byUserName: effectiveUserName });
      }
      sendRoomSignalHttp({
        type: 'terminal_opened',
        accepted: true,
        fromUserName: effectiveUserName,
      });
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
    sendRoomSignalHttp({
      type: 'terminal_opened',
      accepted: true,
      fromUserName: effectiveUserName,
    });
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
    sendRoomSignalHttp({
      type: 'terminal_declined',
      byUserName: effectiveUserName,
    });
    setTerminalProposal(null);
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
  const isLocalMentor = isPhase1 ? mentorRole === 'local' : mentorRole !== 'local';
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
            className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono border transition-all ${
              isPhase1
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isPhase1 ? 'bg-blue-400' : 'bg-purple-400'} animate-pulse`} />
            <span className="font-bold whitespace-nowrap">
              {isPhase1 ? 'Фаза 1/2 (30 мин)' : 'Фаза 2/2 (30 мин)'}:
            </span>
            <span className="text-white hidden sm:inline">
              Ментор: <b className="text-blue-300">@{currentMentorName}</b>
            </span>
            <span className="text-zinc-500 hidden lg:inline">→</span>
            <span className="text-zinc-400 hidden lg:inline">
              Ученик: @{currentStudentName}
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-200 font-bold whitespace-nowrap">
              {isPhase1 ? 'До смены:' : 'До конца:'} {formatCountdown(phaseRemaining)}
            </span>
          </div>

          <span className="font-mono text-xs text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 hidden xl:inline">
            Всего: {formatDuration(callDuration)} / 60:00
          </span>
        </div>

        {/* Right Actions: Manual Role Swap & Copy Invite */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleManualRoleSwitch}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#181820] hover:bg-[#20202a] text-zinc-200 border border-white/10 text-xs font-mono font-medium transition-all tap-active"
            title="Поменяться ролями (ментор / ученик)"
          >
            <Repeat className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Сменить роли</span>
          </button>

          <button
            onClick={handleToggleTerminal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-md ${
              isTerminalOpen
                ? 'bg-emerald-600 text-white border border-emerald-400 shadow-emerald-600/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 shadow-blue-600/20'
            }`}
            title="Открыть совместный редактор и компилятор кода (Python, C++, JS, Rust, Go)"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{isTerminalOpen ? 'Закрыть компилятор' : 'Компилятор кода'}</span>
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

      {/* Main Video Viewport (2-Side P2P Grid OR Terminal + Docked Videos) */}
      <div className="flex-1 p-3 md:p-6 flex gap-4 overflow-hidden relative">
        {/* If Terminal is Open: show collaborative IDE on the main side */}
        {isTerminalOpen && (
          <div className="flex-1 h-full min-w-0 flex flex-col">
            <SharedCallTerminal
              roomId={roomId}
              socket={socket}
              currentUser={user}
              partnerName={remotePeerName || 'Собеседник'}
              onClose={() => {
                if (socket) socket.emit('call:terminal_close', { roomId });
                setIsTerminalOpen(false);
              }}
            />
          </div>
        )}

        {/* Video Cards: full grid when terminal closed, docked vertical stack when terminal open */}
        <div
          className={`h-full max-h-[calc(100vh-140px)] ${
            isTerminalOpen
              ? 'w-60 lg:w-72 flex flex-col gap-3 shrink-0'
              : 'flex-1 grid grid-cols-1 md:grid-cols-2 gap-4'
          }`}
        >
          {/* Peer 1: Local Stream */}
          <div className={`relative rounded-2xl overflow-hidden bg-[#121217] border border-white/[0.08] flex items-center justify-center ${isTerminalOpen ? 'flex-1 min-h-0' : ''}`}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCamOff ? 'hidden' : ''}`}
            />

            {isCamOff && (
              <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                <Identicon name={effectiveUserName} size={isTerminalOpen ? 48 : 80} />
                <div className="text-xs font-mono text-zinc-400">{effectiveUserName}</div>
                <div className="text-[10px] font-mono text-zinc-600">Camera Off</div>
              </div>
            )}

            {/* Local Stream Overlay */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-xs font-mono text-white">
              <span>{effectiveUserName} (Вы)</span>
              {isLocalMentor ? (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-500/25 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full">
                  🎓 Ментор
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-white/10 px-2 py-0.5 rounded-full">
                  🎧 Ученик
                </span>
              )}
              {isMicMuted && <MicOff className="w-3 h-3 text-red-400" />}
              {isScreenSharing && <Monitor className="w-3 h-3 text-blue-400" />}
            </div>
          </div>

          {/* Peer 2: Remote Friend Stream OR Authentic Waiting State */}
          <div className={`relative rounded-2xl overflow-hidden bg-[#121217] border border-white/[0.08] flex items-center justify-center ${isTerminalOpen ? 'flex-1 min-h-0' : ''}`}>
            {isPeerConnected && remoteStream ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
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
