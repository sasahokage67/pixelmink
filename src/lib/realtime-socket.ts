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
}

export function createRealtimeSocket(endpoint: string | undefined, origin: string): RealtimeSocket {
  if (endpoint || new URL(origin).protocol !== 'https:') {
    return io(endpoint, { path: '/socket.io/', transports: ['polling', 'websocket'] }) as RealtimeSocket;
  }
  const url = new URL('/api/ws', origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return new VercelRealtimeSocket(url.toString());
}
