const { randomUUID } = require('node:crypto');
const { registerVercelRealtime } = require('./vercel-realtime');

const HUB_KEY = Symbol.for('pixelmink.vercel-websocket-hub');
const MAX_FRAME_BYTES = 1024 * 1024;

class PeerSocket {
  constructor(hub, ws) {
    this.hub = hub;
    this.ws = ws;
    this.id = randomUUID();
    this.data = {};
    this.handlers = new Map();
    this.rooms = new Set([this.id]);
  }

  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(handler);
    return this;
  }

  emit(event, ...args) {
    this.send({ type: 'event', event, args });
    return this;
  }

  join(room) {
    if (typeof room !== 'string' || !room) return;
    this.rooms.add(room);
    this.hub.addToRoom(room, this.id);
  }

  leave(room) {
    this.rooms.delete(room);
    this.hub.removeFromRoom(room, this.id);
  }

  to(room) {
    return { emit: (event, ...args) => this.hub.emitToRoom(room, event, args, this.id) };
  }

  receive(frame) {
    if (!frame || frame.type !== 'event' || typeof frame.event !== 'string' ||
        !Array.isArray(frame.args) || frame.args.length > 10) return;
    const handlers = Array.from(this.handlers.get(frame.event) || []);
    const ack = typeof frame.ackId === 'string' ? (...args) => {
      this.send({ type: 'ack', ackId: frame.ackId, args });
    } : null;
    for (const handler of handlers) {
      try {
        handler(...frame.args, ...(ack ? [ack] : []));
      } catch (error) {
        console.error(`WebSocket event ${frame.event} failed:`, error);
      }
    }
  }

  disconnect() {
    for (const handler of Array.from(this.handlers.get('disconnect') || [])) {
      try { handler('transport close'); } catch (error) { console.error('WebSocket disconnect handler failed:', error); }
    }
  }

  send(frame) {
    if (this.ws.readyState !== 1) return;
    try { this.ws.send(JSON.stringify(frame)); } catch {}
  }
}

class VercelWebSocketHub {
  constructor() {
    this.peers = new Map();
    this.rooms = new Map();
    this.connectionHandlers = new Set();
    registerVercelRealtime(this);
  }

  on(event, handler) {
    if (event === 'connection') this.connectionHandlers.add(handler);
    return this;
  }

  emit(event, ...args) {
    for (const peer of this.peers.values()) peer.emit(event, ...args);
    return this;
  }

  to(room) {
    return { emit: (event, ...args) => this.emitToRoom(room, event, args) };
  }

  attach(ws) {
    const peer = new PeerSocket(this, ws);
    this.peers.set(peer.id, peer);
    this.addToRoom(peer.id, peer.id);
    for (const handler of this.connectionHandlers) handler(peer);
    peer.send({ type: 'hello', id: peer.id });

    ws.on('message', (raw) => {
      const size = typeof raw === 'string' ? Buffer.byteLength(raw) : raw.byteLength;
      if (size > MAX_FRAME_BYTES) {
        ws.close(1009, 'frame too large');
        return;
      }
      try {
        const text = typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8');
        peer.receive(JSON.parse(text));
      } catch {
        ws.close(1007, 'invalid frame');
      }
    });
    ws.on('close', () => this.detach(peer));
    ws.on('error', () => this.detach(peer));
  }

  detach(peer) {
    if (!this.peers.delete(peer.id)) return;
    peer.disconnect();
    for (const room of Array.from(peer.rooms)) this.removeFromRoom(room, peer.id);
  }

  addToRoom(room, peerId) {
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room).add(peerId);
  }

  removeFromRoom(room, peerId) {
    const members = this.rooms.get(room);
    members?.delete(peerId);
    if (!members?.size) this.rooms.delete(room);
  }

  emitToRoom(room, event, args, excludedPeerId) {
    for (const peerId of this.rooms.get(room) || []) {
      if (peerId !== excludedPeerId) this.peers.get(peerId)?.emit(event, ...args);
    }
  }
}

function getVercelWebSocketHub() {
  if (!globalThis[HUB_KEY]) globalThis[HUB_KEY] = new VercelWebSocketHub();
  return globalThis[HUB_KEY];
}

module.exports = { getVercelWebSocketHub };
