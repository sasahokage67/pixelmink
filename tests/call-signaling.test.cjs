const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { Server } = require('socket.io');
const { io: connect } = require('socket.io-client');
const { registerCallSignaling } = require('../server/call-signaling');

test('room isolation, server-owned sender identity, stale-session rejection, idempotent joins', { timeout: 10000 }, async (t) => {
  const server = http.createServer();
  const io = new Server(server);
  registerCallSignaling(io);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const clients = [];
  t.after(() => { clients.forEach((client) => client.disconnect()); io.close(); server.close(); });
  const makeClient = async () => {
    const client = connect(`http://127.0.0.1:${server.address().port}`, { forceNew: true });
    clients.push(client); await once(client, 'connect'); return client;
  };
  const join = async (client, roomId, sessionId) => {
    const response = once(client, 'call:existing_peers');
    client.emit('call:join_room', { roomId, sessionId, userName: sessionId });
    return (await response)[0];
  };
  const a = await makeClient(); const b = await makeClient(); const c = await makeClient();
  await join(a, 'one', 'a1');
  const roster = await join(b, 'one', 'b1');
  assert.equal(roster.peers[0].socketId, a.id);
  assert.equal(roster.peers[0].sessionId, 'a1');
  await join(c, 'two', 'c1');
  let joinedCount = 0;
  a.on('call:peer_joined', () => joinedCount++);
  await join(b, 'one', 'b1');
  assert.equal(joinedCount, 0);

  const signal = { type: 'description', description: { type: 'offer', sdp: 'test' } };
  const received = [];
  b.on('webrtc:signal', (packet) => received.push(packet));
  const good = once(b, 'webrtc:signal');
  a.emit('webrtc:signal', { roomId: 'one', sessionId: 'a1', to: b.id, targetSessionId: 'b1', from: 'forged', signal });
  const delivered = (await good)[0];
  assert.equal(delivered.from, a.id);
  assert.equal(delivered.toSessionId, 'b1');

  c.emit('webrtc:signal', { roomId: 'one', sessionId: 'c1', to: b.id, targetSessionId: 'b1', signal });
  a.emit('webrtc:signal', { roomId: 'one', sessionId: 'stale', to: b.id, targetSessionId: 'b1', signal });
  a.emit('webrtc:signal', { roomId: 'one', sessionId: 'a1', to: b.id, targetSessionId: 'old-b', signal });
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(received.length, 1);

  await join(a, 'one', 'a2');
  a.emit('call:leave', { roomId: 'one', sessionId: 'a1' });
  const stillPresent = await join(b, 'one', 'b1');
  assert.equal(stillPresent.peers[0].sessionId, 'a2');

  const rejected = once(c, 'call:join_error');
  c.emit('call:join_room', { roomId: 'one', sessionId: 'c2' });
  assert.match((await rejected)[0].message, /два участника/);
  const left = once(b, 'call:peer_left');
  a.disconnect();
  assert.equal((await left)[0].sessionId, 'a2');
});
