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

  const acceptCall = () => {
    if (!incomingCall) return;
    const { roomId, callerId } = incomingCall;
    socket?.emit('call:accept', { roomId, callerId });
    setIncomingCall(null);
    router.push(`/calls/${roomId}`);
  };

  const declineCall = () => {
    if (!incomingCall) return;
    socket?.emit('call:reject', { roomId: incomingCall.roomId, callerId: incomingCall.callerId });
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

      {/* Global Incoming Call Notification Modal */}
      {incomingCall && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121217] border border-blue-500/40 shadow-2xl rounded-2xl p-5 w-84 max-w-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center space-x-3 mb-4">
            <Identicon name={incomingCall.callerName || 'peer'} size={44} />
            <div>
              <div className="text-xs font-mono uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                Incoming {incomingCall.type} Call
              </div>
              <div className="text-sm font-semibold text-white tracking-tight">{incomingCall.callerName}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={declineCall}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-pill bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono tap-active transition-all"
            >
              <PhoneOff className="w-3.5 h-3.5 text-red-400" />
              Decline
            </button>
            <button
              onClick={acceptCall}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-pill bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium tap-active transition-all shadow-lg shadow-blue-600/30"
            >
              {incomingCall.type === 'VIDEO' ? (
                <Video className="w-3.5 h-3.5" />
              ) : (
                <Phone className="w-3.5 h-3.5" />
              )}
              Answer Call
            </button>
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
