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
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:openrelay.metered.ca:80' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turns:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelay',
      credential: 'openrelay',
    },
  ],
  iceCandidatePoolSize: 10,
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

  // Refs & Media / ICE Buffers
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<{ [peerId: string]: RTCIceCandidateInit[] }>({});

  // Flush queued candidates once remote description is set
  const flushCandidates = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const queue = pendingCandidatesRef.current[peerId] || [];
    if (queue.length > 0) {
      for (const cand of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (err) {
          console.warn('Error flushing queued ICE candidate:', err);
        }
      }
      pendingCandidatesRef.current[peerId] = [];
    }
  }, []);

  // Effective username
  const effectiveUserName = user?.profile?.name || guestName || 'Peer';

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

  const cleanRoomId = (roomId || '').replace(/[^a-zA-Z0-9_-]/g, '_');

  // Dual signaling helper: Direct client ntfy broadcast (sub-40ms P2P) + Cloud REST relay for Vercel
  const sendRoomSignalHttp = useCallback(
    async (signal: any, toPeerId?: string | null) => {
      const now = Date.now();
      const payload = {
        action: 'room_send',
        roomId,
        fromPeerId: myPeerIdRef.current,
        toPeerId: toPeerId || undefined,
        signal,
        createdAt: now,
      };

      // 1. Direct browser publish to ntfy (sub-40ms latency, bypasses serverless lambdas)
      try {
        fetch(`https://ntfy.sh/pixelmink_call_${cleanRoomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'room_signal',
            fromPeerId: myPeerIdRef.current,
            toPeerId: toPeerId || undefined,
            signal,
            createdAt: now,
          }),
          mode: 'cors',
        }).catch(() => {});
      } catch {}

      // 2. Server API route for fallback & persistence
      try {
        await fetch('/api/calls/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {}
    },
    [roomId, cleanRoomId]
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
        video: { deviceId: { ideal: newDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
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

          const videoConstraints: MediaTrackConstraints = preferredId
            ? { deviceId: { ideal: preferredId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };

          let stream: MediaStream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: videoConstraints,
              audio: true,
            });
          } catch (camErr) {
            console.warn('Preferred camera constraint failed, retrying with basic video: true', camErr);
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
              });
            } catch (anyCamErr) {
              console.warn('All video attempts failed, falling back to audio only', anyCamErr);
              throw anyCamErr;
            }
          }
          activeStream = stream;
          mediaStreamRef.current = stream;
          setMediaStream(stream);

          // If peer connection was already created, attach/replace tracks immediately
          if (peerConnectionRef.current) {
            const pc = peerConnectionRef.current;
            const currentSenders = pc.getSenders();
            stream.getTracks().forEach((track) => {
              const existing = currentSenders.find((s) => s.track?.kind === track.kind);
              if (existing) {
                existing.replaceTrack(track).catch(() => {});
              } else {
                try {
                  pc.addTrack(track, stream);
                } catch {}
              }
            });
          }

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
          mediaStreamRef.current = audioStream;
          setMediaStream(audioStream);
          setIsCamOff(true);

          if (peerConnectionRef.current) {
            const pc = peerConnectionRef.current;
            const currentSenders = pc.getSenders();
            audioStream.getTracks().forEach((track) => {
              const existing = currentSenders.find((s) => s.track?.kind === track.kind);
              if (existing) {
                existing.replaceTrack(track).catch(() => {});
              } else {
                try {
                  pc.addTrack(track, audioStream);
                } catch {}
              }
            });
          }
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

  // Handle incoming candidate with queuing if remote description is not set yet
  const handleIncomingCandidate = useCallback(async (fromPeerId: string, candidate: RTCIceCandidateInit) => {
    if (!candidate) return;
    const pc = getOrCreatePeerConnection(fromPeerId);
    if (pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Error adding ICE candidate directly:', err);
      }
    } else {
      if (!pendingCandidatesRef.current[fromPeerId]) {
        pendingCandidatesRef.current[fromPeerId] = [];
      }
      pendingCandidatesRef.current[fromPeerId].push(candidate);
    }
  }, []);

  // Create or retrieve PeerConnection
  const getOrCreatePeerConnection = useCallback((targetSocketId: string) => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Add local tracks to WebRTC
    const curStream = mediaStreamRef.current || mediaStream;
    if (curStream) {
      curStream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, curStream);
        } catch {}
      });
    }

    // Ensure transceivers exist so SDP offer/answer always negotiates video & audio
    try {
      const currentSenders = pc.getSenders();
      if (!currentSenders.some((s) => s.track?.kind === 'video')) {
        pc.addTransceiver('video', { direction: 'sendrecv' });
      }
      if (!currentSenders.some((s) => s.track?.kind === 'audio')) {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      }
    } catch {}

    // ICE Candidate handler with robust JSON serialization
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candInit = event.candidate.toJSON ? event.candidate.toJSON() : {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment,
        };
        if (socket) {
          socket.emit('webrtc:signal', {
            to: targetSocketId,
            signal: { type: 'candidate', candidate: candInit },
          });
        }
        sendRoomSignalHttp({ type: 'candidate', candidate: candInit }, targetSocketId);
      }
    };

    // Remote Track handler
    pc.ontrack = (event) => {
      let incomingStream = event.streams && event.streams[0] ? event.streams[0] : null;
      if (!incomingStream) {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        if (!remoteStreamRef.current.getTracks().some((t) => t.id === event.track.id)) {
          remoteStreamRef.current.addTrack(event.track);
        }
        incomingStream = remoteStreamRef.current;
      }
      const freshStream = new MediaStream(incomingStream.getTracks());
      setRemoteStream(freshStream);
      setIsPeerConnected(true);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = freshStream;
        remoteVideoRef.current.play().catch(() => {});
      }
    };

    // Auto renegotiate when tracks are dynamically attached/changed
    pc.onnegotiationneeded = async () => {
      try {
        if (pc.signalingState === 'stable' && targetSocketId) {
          const isLeader = myPeerIdRef.current.localeCompare(targetSocketId) > 0;
          if (isLeader) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendRoomSignal({ type: 'offer', sdp: offer, senderName: effectiveUserName }, targetSocketId);
          }
        }
      } catch (err) {
        console.warn('Renegotiation warning:', err);
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
      }
    };

    peerConnectionRef.current = pc;
    return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure remote video auto-plays when remoteStream arrives
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

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
        if (pc.signalingState === 'stable') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          sendRoomSignal({ type: 'offer', sdp: offer, senderName: effectiveUserName }, socketId);
        }
      } catch (err) {
        console.error('Error creating WebRTC offer:', err);
      }
    });

    // C: Receive WebRTC Signal (Offer / Answer / Candidate)
    socket.on('webrtc:signal', async ({ signal, from }: { signal: any; from: string }) => {
      if (!from || !signal) return;

      if (signal.senderName && !remotePeerName) {
        setRemotePeerName(signal.senderName);
      }
      setRemotePeerSocketId(from);

      const pc = getOrCreatePeerConnection(from);

      try {
        if (signal.type === 'offer' && signal.sdp) {
          const isPolite = myPeerIdRef.current.localeCompare(from) > 0;
          if (pc.signalingState !== 'stable') {
            if (!isPolite) return;
            try {
              await pc.setLocalDescription({ type: 'rollback' });
            } catch {}
          }
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await flushCandidates(from, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          sendRoomSignal({ type: 'answer', sdp: answer, senderName: effectiveUserName }, from);
        } else if (signal.type === 'answer' && signal.sdp) {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            await flushCandidates(from, pc);
          }
        } else if ((signal.type === 'candidate' || signal.type === 'ice-candidate') && signal.candidate) {
          await handleIncomingCandidate(from, signal.candidate);
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

      if (isCallFinished && peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId, hasEnteredName, isCallFinished]);

  // 3. WebRTC Signaling over HTTP Cloud Relay + ntfy SSE (Vercel cross-device instant sync)
  useEffect(() => {
    if (!roomId || !hasEnteredName || isCallFinished) return;

    let isMounted = true;

    // Announce immediate entry into room
    sendRoomSignalHttp({
      type: 'peer_joined',
      userName: effectiveUserName,
      peerId: myPeerIdRef.current,
    });

    // Presence heartbeat: broadcasts every 2.5s until WebRTC peer connection is established
    const heartbeatTimer = setInterval(() => {
      if (!isPeerConnected) {
        sendRoomSignalHttp({
          type: 'presence',
          userName: effectiveUserName,
          peerId: myPeerIdRef.current,
        });
      }
    }, 2500);

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

            if (signal.type === 'peer_joined' || signal.type === 'presence') {
              setRemotePeerSocketId(fromPeerId);
              if (signal.userName) setRemotePeerName(signal.userName);

              const pc = getOrCreatePeerConnection(fromPeerId);
              const isLeader = myPeerIdRef.current.localeCompare(fromPeerId) > 0;
              if (isLeader && pc.signalingState === 'stable' && !remoteStream) {
                try {
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  sendRoomSignal({ type: 'offer', sdp: offer, senderName: effectiveUserName }, fromPeerId);
                } catch (e) {
                  console.warn('Poll offer error:', e);
                }
              }
            } else if (signal.type === 'offer' && signal.sdp) {
              const pc = getOrCreatePeerConnection(fromPeerId);
              const isPolite = myPeerIdRef.current.localeCompare(fromPeerId) > 0;
              if (pc.signalingState !== 'stable') {
                if (!isPolite) continue;
                try {
                  await pc.setLocalDescription({ type: 'rollback' });
                } catch {}
              }
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                await flushCandidates(fromPeerId, pc);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendRoomSignal({ type: 'answer', sdp: answer, senderName: effectiveUserName }, fromPeerId);
              } catch (e) {
                console.error(e);
              }
            } else if (signal.type === 'answer' && signal.sdp) {
              const pc = getOrCreatePeerConnection(fromPeerId);
              try {
                if (pc.signalingState === 'have-local-offer') {
                  await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                  await flushCandidates(fromPeerId, pc);
                }
              } catch (e) {
                console.error(e);
              }
            } else if ((signal.type === 'candidate' || signal.type === 'ice-candidate') && signal.candidate) {
              await handleIncomingCandidate(fromPeerId, signal.candidate);
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

    // Instant WebRTC signals over ntfy SSE with 10m historical replay
    let sseSource: EventSource | null = null;
    try {
      sseSource = new EventSource(`https://ntfy.sh/pixelmink_call_${cleanRoomId}/sse?since=10m`);
      sseSource.onmessage = async (event) => {
        try {
          const raw = JSON.parse(event.data);
          let item = raw;
          if (typeof raw.message === 'string') {
            try {
              item = JSON.parse(raw.message);
            } catch {
              item = raw.message;
            }
          } else if (raw.message && typeof raw.message === 'object') {
            item = raw.message;
          }

          if (!item) return;
          const fromPeerId = item.fromPeerId || item.peerId;
          if (!fromPeerId || fromPeerId === myPeerIdRef.current) return;
          if (item.toPeerId && item.toPeerId !== myPeerIdRef.current) return;

          const signal = item.signal || (item.type !== 'room_signal' ? item : null);
          if (!signal) return;

          if (signal.userName && !remotePeerName) setRemotePeerName(signal.userName);
          if (fromPeerId && !remotePeerSocketId) setRemotePeerSocketId(fromPeerId);

          if (signal.type === 'peer_joined' || signal.type === 'presence') {
            setRemotePeerSocketId(fromPeerId);
            if (signal.userName) setRemotePeerName(signal.userName);
            const pc = getOrCreatePeerConnection(fromPeerId);
            const isLeader = myPeerIdRef.current.localeCompare(fromPeerId) > 0;
            if (isLeader && pc.signalingState === 'stable' && !remoteStream) {
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendRoomSignal({ type: 'offer', sdp: offer, senderName: effectiveUserName }, fromPeerId);
              } catch (e) {
                console.warn('SSE offer error:', e);
              }
            }
          } else if (signal.type === 'offer' && signal.sdp) {
            const pc = getOrCreatePeerConnection(fromPeerId);
            const isPolite = myPeerIdRef.current.localeCompare(fromPeerId) > 0;
            if (pc.signalingState !== 'stable') {
              if (!isPolite) return;
              try {
                await pc.setLocalDescription({ type: 'rollback' });
              } catch {}
            }
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
              await flushCandidates(fromPeerId, pc);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendRoomSignal({ type: 'answer', sdp: answer, senderName: effectiveUserName }, fromPeerId);
            } catch (e) {}
          } else if (signal.type === 'answer' && signal.sdp) {
            const pc = getOrCreatePeerConnection(fromPeerId);
            try {
              if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                await flushCandidates(fromPeerId, pc);
              }
            } catch (e) {}
          } else if ((signal.type === 'candidate' || signal.type === 'ice-candidate') && signal.candidate) {
            await handleIncomingCandidate(fromPeerId, signal.candidate);
          } else if (signal.type === 'chat_message' && signal.message) {
            setCallMessages((prev) => {
              if (prev.some((m) => m.id === signal.message.id)) return prev;
              return [...prev, signal.message];
            });
          } else if (signal.type === 'role_switch' && signal.mentorRole) {
            setMentorRole(signal.mentorRole);
            playAlertChime('switch');
            setShowRoleSwitchBanner(true);
            setTimeout(() => setShowRoleSwitchBanner(false), 8000);
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
      clearInterval(heartbeatTimer);
      if (sseSource) sseSource.close();
    };
  }, [roomId, hasEnteredName, isCallFinished, cleanRoomId]);

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
  const toggleCam = async () => {
    if (mediaStream) {
      const vTrack = mediaStream.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = !vTrack.enabled;
        setIsCamOff(!vTrack.enabled);
        return;
      }
    }
    // If no video track exists, attempt to request physical camera
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: selectedCameraId ? { deviceId: { ideal: selectedCameraId } } : true,
        audio: false,
      });
      const newVTrack = newStream.getVideoTracks()[0];
      if (newVTrack) {
        cameraTrackRef.current = newVTrack;
        if (mediaStream) {
          mediaStream.addTrack(newVTrack);
        } else {
          setMediaStream(newStream);
          mediaStreamRef.current = newStream;
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream || newStream;
        }
        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(newVTrack);
          } else {
            peerConnectionRef.current.addTrack(newVTrack, mediaStream || newStream);
          }
        }
        setIsCamOff(false);
      }
    } catch (e) {
      console.warn('Failed to start camera on toggle:', e);
      setIsCamOff(true);
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
                if (socket) socket.emit('call:terminal_close', { roomId });
                sendRoomSignalHttp({ type: 'terminal_closed' });
                setIsTerminalOpen(false);
              }}
            />
          </div>
        )}

        {/* Mobile-only Floating PiP Video when Terminal is Open */}
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
                if (el && mediaStream && el.srcObject !== mediaStream) {
                  el.srcObject = mediaStream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCamOff ? 'hidden' : ''}`}
            />

            {isCamOff && (
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
