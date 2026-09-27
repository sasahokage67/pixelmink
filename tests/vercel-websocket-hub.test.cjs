const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { getVercelWebSocketHub } = require('../server/vercel-websocket-hub');

class FakeWebSocket extends EventEmitter {
  readyState = 1;
  frames = [];
  send(value) { this.frames.push(JSON.parse(value)); }
  close() { this.readyState = 3; this.emit('close'); }
  clientEmit(event, ...args) {
    this.emit('message', Buffer.from(JSON.stringify({ type: 'event', event, args })));
  }
  take(event) {
    const index = this.frames.findIndex((frame) => frame.type === 'event' && frame.event === event);
    assert.notEqual(index, -1, `missing ${event} frame`);
    return this.frames.splice(index, 1)[0].args[0];
  }
}

test('Vercel WebSocket hub preserves chat rooms and session-scoped WebRTC signaling', () => {
  const hub = getVercelWebSocketHub();
  const a = new FakeWebSocket();
  const b = new FakeWebSocket();
  hub.attach(a);
  hub.attach(b);
  const aId = a.frames.shift().id;
  const bId = b.frames.shift().id;

  a.clientEmit('chat:join', 'conversation-ws');
  b.clientEmit('chat:join', 'conversation-ws');
  a.clientEmit('chat:message', {
    conversationId: 'conversation-ws',
    message: { id: 'message-ws', conversationId: 'conversation-ws' },
  });
  assert.equal(b.take('chat:new_message').id, 'message-ws');

  a.clientEmit('call:join_room', { roomId: 'room-ws', sessionId: 'a-ws', userName: 'A' });
  b.clientEmit('call:join_room', { roomId: 'room-ws', sessionId: 'b-ws', userName: 'B' });
  assert.equal(b.take('call:existing_peers').peers[0].socketId, aId);
  a.clientEmit('webrtc:signal', {
    roomId: 'room-ws', sessionId: 'a-ws', to: bId, targetSessionId: 'b-ws',
    signal: { type: 'candidate', candidate: { candidate: 'ws-test' } },
  });
  assert.equal(b.take('webrtc:signal').from, aId);

  a.close();
  b.close();
});
