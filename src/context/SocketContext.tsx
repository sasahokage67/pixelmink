'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import { Phone, PhoneOff, Video } from 'lucide-react';
import Identicon from '@/components/ui/Identicon';

interface IncomingCallPayload {
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  roomId: string;
  type: 'AUDIO' | 'VIDEO';
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  incomingCall: IncomingCallPayload | null;
  acceptCall: () => void;
  declineCall: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const s = io({
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => {
      setIsConnected(true);
      if (user?.id) {
        s.emit('user:register', user.id);
      }
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('presence:update', ({ userId, status }: { userId: string; status: 'online' | 'offline' }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === 'online') next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    s.on('call:incoming', (payload: IncomingCallPayload) => {
      setIncomingCall(payload);
    });

    s.on('call:rejected', () => {
      setIncomingCall(null);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // When user changes, register with socket
  useEffect(() => {
    if (socket && isConnected && user?.id) {
      socket.emit('user:register', user.id);
    }
  }, [user, socket, isConnected]);

  // Audio ringtone playback during incoming call
  useEffect(() => {
    if (!incomingCall) return;

    let intervalId: any;
    const playChime = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch (e) {
        // audio policy fallback
      }
    };

    playChime();
    intervalId = setInterval(playChime, 2400);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [incomingCall]);

  // Cross-device cloud signaling poll for incoming calls (essential for Vercel serverless)
  const dismissedCallsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    const pollIncomingCalls = async () => {
      // Don't interrupt if already in call or modal is open
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/calls/')) {
        return;
      }
      if (incomingCall) return;

      try {
        const res = await fetch(`/api/calls/signal?action=check_incoming&userId=${encodeURIComponent(user.id)}`, {
          cache: 'no-store',
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.incomingCall && data.incomingCall.roomId) {
            if (!dismissedCallsRef.current.has(data.incomingCall.roomId)) {
              setIncomingCall(data.incomingCall);
            }
          }
        }
      } catch (err) {
        // silent catch for background polling
      }
    };

    pollIncomingCalls();
    const interval = setInterval(pollIncomingCalls, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id, incomingCall]);

  const acceptCall = async () => {
    if (!incomingCall) return;
    const { roomId, callerId } = incomingCall;

    try {
      await fetch('/api/calls/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          roomId,
          receiverId: user?.id,
        }),
      });
    } catch {}

    socket?.emit('call:accept', { roomId, callerId });
    setIncomingCall(null);
    router.push(`/calls/${roomId}`);
  };

  const declineCall = async () => {
    if (!incomingCall) return;
    const { roomId, callerId } = incomingCall;
    dismissedCallsRef.current.add(roomId);

    try {
      await fetch('/api/calls/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          roomId,
          receiverId: user?.id,
        }),
      });
    } catch {}

    socket?.emit('call:reject', { roomId, callerId });
    setIncomingCall(null);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        incomingCall,
        acceptCall,
        declineCall,
      }}
    >
      {children}

      {/* High-Visibility Center Screen Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in select-none">
          <div className="bg-[#111116] border border-blue-500/40 shadow-2xl rounded-3xl p-6 sm:p-8 w-full max-w-sm text-center space-y-5 animate-in zoom-in-95">
            {/* Pulsing Avatar */}
            <div className="relative mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-blue-500/10 border-2 border-blue-500/40">
              <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
              <Identicon name={incomingCall.callerName || 'peer'} size={60} />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase text-blue-400 tracking-wider font-bold flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Входящий {incomingCall.type === 'VIDEO' ? 'видеозвонок' : 'аудиозвонок'}</span>
              </div>
              <div className="text-xl font-bold text-white tracking-tight">
                {incomingCall.callerName}
              </div>
              <p className="text-xs font-mono text-zinc-400">
                вызывает вас на прямое P2P соединение
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={declineCall}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs font-bold transition-all tap-active"
              >
                <PhoneOff className="w-4 h-4 text-red-400" />
                <span>Отклонить</span>
              </button>
              <button
                onClick={acceptCall}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all tap-active shadow-lg shadow-emerald-600/30 animate-pulse"
              >
                {incomingCall.type === 'VIDEO' ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
                <span>Принять вызов</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
}
