'use client';

import { io } from 'socket.io-client';

type Listener = (...args: any[]) => void;

export interface RealtimeSocket {
  id?: string;
  connected: boolean;
  on(event: string, listener: Listener): RealtimeSocket;
  off(event: string, listener?: Listener): RealtimeSocket;
  emit(event: string, ...args: any[]): RealtimeSocket;
  connect(): RealtimeSocket;
  disconnect(): RealtimeSocket;
}

type ServerFrame =
  | { type: 'hello'; id: string }
  | { type: 'event'; event: string; args?: any[] }
  | { type: 'ack'; ackId: string; args?: any[] };

class VercelRealtimeSocket implements RealtimeSocket {
  id?: string;
  connected = false;
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private acknowledgements = new Map<string, Listener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private manuallyClosed = false;
  private nextAckId = 0;
  private callRelay: {
    roomId: string;
    sessionId: string;
    userId?: string;
    userName: string;
    source: EventSource;
  } | null = null;
  private callChunks = new Map<string, { parts: string[]; received: number; createdAt: number }>();
  private terminalState: any = null;
  private terminalRevision = 0;

  constructor(private readonly url: string) {
    this.connect();
  }

  on(event: string, listener: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return this;
  }

  off(event: string, listener?: Listener) {
    if (listener) this.listeners.get(event)?.delete(listener);
    else this.listeners.delete(event);
    return this;
  }

  emit(event: string, ...args: any[]) {
    if (!this.connected || this.ws?.readyState !== WebSocket.OPEN) return this;
    const callback = typeof args.at(-1) === 'function' ? args.pop() as Listener : null;
    if (this.emitCallRelay(event, args, callback)) return this;
    const ackId = callback ? `${this.id}:${++this.nextAckId}` : undefined;
    if (callback && ackId) this.acknowledgements.set(ackId, callback);
    this.ws.send(JSON.stringify({ type: 'event', event, args, ackId }));
    return this;
  }

  connect() {
    this.manuallyClosed = false;
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) return this;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onmessage = (message) => {
      if (this.ws !== ws || typeof message.data !== 'string') return;
      try {
        const frame = JSON.parse(message.data) as ServerFrame;
        if (frame.type === 'hello' && typeof frame.id === 'string') {
          this.id = frame.id;
          this.connected = true;
          this.reconnectAttempts = 0;
          this.dispatch('connect');
        } else if (frame.type === 'event' && typeof frame.event === 'string') {
          this.dispatch(frame.event, ...(Array.isArray(frame.args) ? frame.args : []));
        } else if (frame.type === 'ack' && typeof frame.ackId === 'string') {
          const callback = this.acknowledgements.get(frame.ackId);
          if (callback) {
            this.acknowledgements.delete(frame.ackId);
            callback(...(Array.isArray(frame.args) ? frame.args : []));
          }
        }
      } catch {
        // Ignore malformed frames; reconnect only for transport failures.
      }
    };
    ws.onerror = () => {
      if (this.ws === ws && !this.manuallyClosed) {
        this.dispatch('connect_error', new Error('Realtime WebSocket connection failed'));
      }
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      const wasConnected = this.connected;
      this.ws = null;
      this.id = undefined;
      this.connected = false;
      this.acknowledgements.clear();
      if (wasConnected) this.dispatch('disconnect', 'transport close');
      if (!this.manuallyClosed) this.scheduleReconnect();
    };
    return this;
  }

  disconnect() {
    this.manuallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const wasConnected = this.connected;
    this.connected = false;
    this.id = undefined;
    this.acknowledgements.clear();
    this.stopCallRelay(false);
    const ws = this.ws;
    this.ws = null;
    ws?.close(1000, 'client disconnect');
    if (wasConnected) this.dispatch('disconnect', 'io client disconnect');
    return this;
  }

  private dispatch(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.manuallyClosed) return;
    const delay = Math.min(10_000, 500 * 2 ** Math.min(this.reconnectAttempts++, 5));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay + Math.floor(Math.random() * 250));
  }

  // Vercel can put two WebSockets into different Function instances. Calls use
  // the existing HTTP + ntfy room channel as the cross-instance relay while the
  // WebSocket remains responsible for presence and same-instance chat updates.
  private emitCallRelay(event: string, args: any[], callback: Listener | null) {
    const payload = args[0] || {};
    if (event === 'call:join_room') {
      this.startCallRelay(payload);
      return true;
    }
    if (!this.callRelay || payload.roomId !== this.callRelay.roomId) return false;
    if (event === 'call:leave') {
      void this.publishCallSignal({ kind: 'peer_left' });
      this.stopCallRelay(false);
      return true;
    }
    if (event === 'webrtc:signal') {
      void this.publishCallSignal({ kind: 'webrtc', signal: payload.signal }, payload.targetSessionId);
      return true;
    }
    if (event === 'call:terminal_get_state') {
      if (this.terminalState && callback) callback(this.terminalState);
      void this.publishCallSignal({ kind: 'terminal_state_request' });
      return true;
    }

    let deliveredEvent = event;
    let deliveredPayload = payload;
    if (event === 'call:chat_message') {
      deliveredEvent = 'call:new_chat_message';
      deliveredPayload = { ...payload.message, roomId: payload.roomId };
    } else if (event === 'call:terminal_response') {
      deliveredEvent = payload.accepted ? 'call:terminal_opened' : 'call:terminal_declined';
      deliveredPayload = { roomId: payload.roomId, byUserName: payload.fromUserName };
    } else if (event === 'call:terminal_close') {
      deliveredEvent = 'call:terminal_closed';
      deliveredPayload = { roomId: payload.roomId };
    } else if (event === 'call:terminal_output') {
      deliveredPayload = { ...payload.output, roomId: payload.roomId };
    } else if (event === 'call:screen_share') {
      deliveredEvent = 'call:screen_share_status';
      deliveredPayload = { isSharing: payload.isSharing, userId: payload.userId };
    } else if (event === 'call:raise_hand') {
      deliveredEvent = 'call:hand_raised';
      deliveredPayload = { userId: payload.userId, userName: payload.userName };
    } else if (event === 'call:host_control') {
      deliveredEvent = 'call:moderated';
      deliveredPayload = { targetUserId: payload.targetUserId, action: payload.action };
    }

    const relayedEvents = new Set([
      'call:chat_message', 'call:role_switch', 'call:terminal_request',
      'call:terminal_response', 'call:terminal_opened', 'call:terminal_sync',
      'call:terminal_executing', 'call:terminal_output', 'call:terminal_close',
      'call:screen_share', 'call:raise_hand', 'call:host_control',
    ]);
    if (!relayedEvents.has(event)) return false;

    if (event === 'call:terminal_sync') {
      this.terminalRevision = Math.max(this.terminalRevision + 1, Date.now());
      deliveredPayload = { ...payload, revision: this.terminalRevision, updatedAt: Date.now() };
      this.terminalState = deliveredPayload;
    }
    void this.publishCallSignal({ kind: 'event', event: deliveredEvent, payload: deliveredPayload })
      .then(() => callback?.(event === 'call:chat_message'
        ? { delivered: true, messageId: payload.message?.id }
        : deliveredPayload))
      .catch(() => {});
    return true;
  }

  private startCallRelay(payload: any) {
    if (!payload?.roomId || !payload?.sessionId) return;
    if (this.callRelay?.roomId === payload.roomId && this.callRelay.sessionId === payload.sessionId) return;
    this.stopCallRelay(false);
    const cleanRoomId = String(payload.roomId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const source = new EventSource(`https://ntfy.sh/pixelmink_call_${cleanRoomId}/sse`);
    this.callRelay = {
      roomId: payload.roomId,
      sessionId: payload.sessionId,
      userId: payload.userId,
      userName: String(payload.userName || 'Peer').slice(0, 100),
      source,
    };
    source.onopen = () => {
      void this.publishCallSignal({
        kind: 'peer_join',
        peer: {
          socketId: payload.sessionId,
          sessionId: payload.sessionId,
          userId: payload.userId,
          userName: String(payload.userName || 'Peer').slice(0, 100),
        },
      });
      void this.publishCallSignal({ kind: 'terminal_state_request' });
    };
    source.onmessage = (message) => { void this.handleCallRelayMessage(message.data); };
  }

  private stopCallRelay(notify = true) {
    if (!this.callRelay) return;
    if (notify) void this.publishCallSignal({ kind: 'peer_left' });
    this.callRelay.source.close();
    this.callRelay = null;
    this.callChunks.clear();
  }

  private async publishCallSignal(signal: any, toPeerId?: string) {
    const relay = this.callRelay;
    if (!relay) return;
    const response = await fetch('/api/calls/signal', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'room_send',
        roomId: relay.roomId,
        fromPeerId: relay.sessionId,
        toPeerId,
        signal,
      }),
    });
    if (!response.ok) throw new Error('Call relay failed');
  }

  private async handleCallRelayMessage(rawData: string) {
    let message: any;
    try {
      const envelope = JSON.parse(rawData);
      message = typeof envelope.message === 'string' ? JSON.parse(envelope.message) : envelope;
    } catch { return; }
    if (message?.type === 'room_signal_chunk') {
      const { chunkId, index, total, data } = message;
      if (typeof chunkId !== 'string' || !Number.isInteger(index) || !Number.isInteger(total) ||
          total < 1 || total > 256 || typeof data !== 'string') return;
      let pending = this.callChunks.get(chunkId);
      if (!pending) {
        pending = { parts: new Array(total), received: 0, createdAt: Date.now() };
        this.callChunks.set(chunkId, pending);
      }
      if (!pending.parts[index]) {
        pending.parts[index] = data;
        pending.received += 1;
      }
      this.callChunks.forEach((value, id) => {
        if (Date.now() - value.createdAt > 30_000) this.callChunks.delete(id);
      });
      if (pending.received !== total) return;
      this.callChunks.delete(chunkId);
      try {
        const binary = atob(pending.parts.join(''));
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        message = JSON.parse(new TextDecoder().decode(bytes));
      } catch { return; }
    }
    const relay = this.callRelay;
    if (!relay || message?.type !== 'room_signal' || message.fromPeerId === relay.sessionId ||
        (message.toPeerId && message.toPeerId !== relay.sessionId)) return;
    const signal = message.signal || {};
    const from = message.fromPeerId;
    if (signal.kind === 'peer_join' && signal.peer) {
      this.dispatch('call:peer_joined', {
        roomId: relay.roomId, toSessionId: relay.sessionId, peer: signal.peer,
      });
      void this.publishCallSignal({
        kind: 'peer_present',
        peer: {
          socketId: relay.sessionId,
          sessionId: relay.sessionId,
          userId: relay.userId,
          userName: relay.userName,
        },
      }, from);
      if (this.terminalState) void this.publishCallSignal({ kind: 'terminal_state', state: this.terminalState }, from);
    } else if (signal.kind === 'peer_present' && signal.peer) {
      this.dispatch('call:existing_peers', {
        roomId: relay.roomId, toSessionId: relay.sessionId, peers: [signal.peer],
      });
    } else if (signal.kind === 'peer_left') {
      this.dispatch('call:peer_left', {
        roomId: relay.roomId, socketId: from, sessionId: from, toSessionId: relay.sessionId,
      });
    } else if (signal.kind === 'webrtc' && signal.signal) {
      this.dispatch('webrtc:signal', {
        roomId: relay.roomId, from, fromSessionId: from,
        toSessionId: relay.sessionId, signal: signal.signal,
      });
    } else if (signal.kind === 'terminal_state_request' && this.terminalState) {
      void this.publishCallSignal({ kind: 'terminal_state', state: this.terminalState }, from);
    } else if (signal.kind === 'terminal_state' && signal.state) {
      this.terminalState = signal.state;
      this.terminalRevision = Math.max(this.terminalRevision, Number(signal.state.revision) || 0);
      this.dispatch('call:terminal_state', signal.state);
    } else if (signal.kind === 'event' && typeof signal.event === 'string') {
      if (signal.event === 'call:terminal_sync') {
        this.terminalState = signal.payload;
        this.terminalRevision = Math.max(this.terminalRevision, Number(signal.payload?.revision) || 0);
      }
      this.dispatch(signal.event, signal.payload);
    }
  }
}

export function createRealtimeSocket(endpoint: string | undefined, origin: string): RealtimeSocket {
  if (endpoint || new URL(origin).protocol !== 'https:') {
    return io(endpoint, { path: '/socket.io/', transports: ['polling', 'websocket'] }) as RealtimeSocket;
  }
  const url = new URL('/api/ws', origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return new VercelRealtimeSocket(url.toString());
}
