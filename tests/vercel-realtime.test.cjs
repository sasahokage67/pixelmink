const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { Server } = require('socket.io');
const { io: connect } = require('socket.io-client');
const { registerVercelRealtime } = require('../server/vercel-realtime');
const settle = () => new Promise((resolve) => setTimeout(resolve, 40));

test('Vercel realtime entrypoint relays presence, calls, chat and signaling', { timeout: 10000 }, async (t) => {
  const server = http.createServer();
  const io = new Server(server, { transports: ['websocket'] });
  registerVercelRealtime(io);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const a = connect(url, { forceNew: true, transports: ['websocket'] });
  const b = connect(url, { forceNew: true, transports: ['websocket'] });
  t.after(() => { a.disconnect(); b.disconnect(); io.close(); server.close(); });
  await Promise.all([once(a, 'connect'), once(b, 'connect')]);

  a.emit('user:register', 'mentor');
  b.emit('user:register', 'student');
  await settle();
  const incoming = once(b, 'call:incoming');
  a.emit('call:initiate', { receiverId: 'student', roomId: 'room', callerId: 'mentor' });
  assert.equal((await incoming)[0].roomId, 'room');

  a.emit('chat:join', 'conversation');
  b.emit('chat:join', 'conversation');
  await settle();
  const chat = once(b, 'chat:new_message');
  a.emit('chat:message', { conversationId: 'conversation', message: { id: 'message', conversationId: 'conversation' } });
  assert.equal((await chat)[0].id, 'message');

  const rosterA = once(a, 'call:existing_peers');
  a.emit('call:join_room', { roomId: 'room', sessionId: 'a', userName: 'A' });
  await rosterA;
  const rosterB = once(b, 'call:existing_peers');
  b.emit('call:join_room', { roomId: 'room', sessionId: 'b', userName: 'B' });
  assert.equal((await rosterB)[0].peers[0].sessionId, 'a');
  const signal = once(b, 'webrtc:signal');
  a.emit('webrtc:signal', { roomId: 'room', sessionId: 'a', to: b.id,
    targetSessionId: 'b', signal: { type: 'candidate', candidate: { candidate: 'test' } } });
  assert.equal((await signal)[0].fromSessionId, 'a');
});
