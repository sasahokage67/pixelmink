const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loadTypeScript(relativePath) {
  const filename = path.resolve(__dirname, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded._compile(compiled, filename);
  return loaded.exports;
}

class MockMediaStreamTrack {
  constructor(kind = 'video', id = 'track-' + Math.random()) {
    this.kind = kind;
    this.id = id;
    this.enabled = true;
  }
  stop() {}
}

class MockMediaStream {
  constructor(tracks = []) {
    this.tracks = [...tracks];
  }
  getTracks() { return this.tracks; }
  getVideoTracks() { return this.tracks.filter((t) => t.kind === 'video'); }
  getAudioTracks() { return this.tracks.filter((t) => t.kind === 'audio'); }
  addTrack(t) { this.tracks.push(t); }
}

class MockRTCPeerConnection {
  constructor(config) {
    this.config = config;
    this.signalingState = 'stable';
    this.connectionState = 'new';
    this.iceConnectionState = 'new';
    this.localDescription = null;
    this.remoteDescription = null;
    this.transceivers = [];
    this.addedIceCandidates = [];
    this.closed = false;
    this.restartIceCount = 0;

    this.ontrack = null;
    this.onicecandidate = null;
    this.onnegotiationneeded = null;
    this.onconnectionstatechange = null;
    this.oniceconnectionstatechange = null;
  }

  addTransceiver(trackOrKind) {
    const track = typeof trackOrKind === 'string' ? new MockMediaStreamTrack(trackOrKind) : trackOrKind;
    const transceiver = {
      sender: {
        track,
        replaceTrack: async (newTrack) => { transceiver.sender.track = newTrack; },
      },
      receiver: {
        track: new MockMediaStreamTrack(track?.kind || 'video'),
      },
    };
    this.transceivers.push(transceiver);
    return transceiver;
  }

  getTransceivers() {
    return this.transceivers;
  }

  async setLocalDescription(desc) {
    if (this.closed) throw new Error('Closed');
    if (!desc) {
      if (this.signalingState === 'stable') {
        this.localDescription = { type: 'offer', sdp: 'v=0\r\na=ice-ufrag:local-ufrag\r\n' };
        this.signalingState = 'have-local-offer';
      } else if (this.signalingState === 'have-remote-offer') {
        this.localDescription = { type: 'answer', sdp: 'v=0\r\na=ice-ufrag:local-ufrag\r\n' };
        this.signalingState = 'stable';
      }
    } else {
      this.localDescription = desc;
      if (desc.type === 'offer') this.signalingState = 'have-local-offer';
      else if (desc.type === 'answer') this.signalingState = 'stable';
    }
  }

  async setRemoteDescription(desc) {
    if (this.closed) throw new Error('Closed');
    if (desc.type === 'offer') {
      this.remoteDescription = desc;
      this.signalingState = 'have-remote-offer';
    } else if (desc.type === 'answer') {
      if (this.signalingState !== 'have-local-offer') {
        throw new Error(`Failed to execute 'setRemoteDescription': Called in wrong state: ${this.signalingState}`);
      }
      this.remoteDescription = desc;
      this.signalingState = 'stable';
    }
  }

  async addIceCandidate(candidate) {
    if (this.closed) throw new Error('Closed');
    this.addedIceCandidates.push(candidate);
  }

  restartIce() {
    this.restartIceCount++;
  }

  close() {
    this.closed = true;
    this.signalingState = 'closed';
    this.connectionState = 'closed';
  }
}

class MockSocket {
  constructor(id = 'socket-1') {
    this.id = id;
    this.connected = true;
    this.listeners = new Map();
    this.emitted = [];
  }
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }
  off(event, fn) {
    const list = this.listeners.get(event);
    if (!list) return;
    this.listeners.set(event, list.filter((cb) => cb !== fn));
  }
  emit(event, ...args) {
    this.emitted.push({ event, args });
  }
  trigger(event, data) {
    const list = this.listeners.get(event) || [];
    for (const fn of list) fn(data);
  }
}

// Setup global mocks for CallConnection test run
global.RTCPeerConnection = MockRTCPeerConnection;
global.MediaStream = MockMediaStream;
global.MediaStreamTrack = MockMediaStreamTrack;

const { CallConnection } = loadTypeScript('../src/lib/call-connection.ts');

function setupTestConnection(customOptions = {}) {
  const socket = new MockSocket(customOptions.socketId || 'sock-a');
  const stream = new MockMediaStream([
    new MockMediaStreamTrack('audio', 'audio-1'),
    new MockMediaStreamTrack('video', 'video-1'),
  ]);
  const statuses = [];
  const errors = [];
  const peers = [];
  const options = {
    socket,
    roomId: 'room-101',
    userName: 'Alice',
    userId: 'user-a',
    stream,
    configuration: { iceServers: [] },
    onRemoteStream: () => {},
    onPeer: (peer) => peers.push(peer),
    onStatus: (status) => statuses.push(status),
    onError: (err) => { if (err) errors.push(err); },
    ...customOptions,
  };
  const conn = new CallConnection(options);
  return { conn, socket, statuses, errors, peers, options };
}

test('deterministic polite peer computation produces opposite booleans', () => {
  const sessionA = 'session-001';
  const sessionB = 'session-002';
  const politeA = sessionA.localeCompare(sessionB) > 0;
  const politeB = sessionB.localeCompare(sessionA) > 0;
  assert.equal(politeA, false);
  assert.equal(politeB, true);
  assert.notEqual(politeA, politeB);
});

test('single authoritative transport: all WebRTC signals routed exclusively via socket webrtc:signal', async () => {
  const { conn, socket } = setupTestConnection();
  conn.start();
  // Join room
  const joinMsg = socket.emitted.find((e) => e.event === 'call:join_room');
  assert.ok(joinMsg, 'join_room emitted on socket');
  const mySessionId = joinMsg.args[0].sessionId;

  // Peer joins
  socket.trigger('call:existing_peers', {
    roomId: 'room-101',
    toSessionId: mySessionId,
    peers: [{ socketId: 'sock-b', sessionId: 'session-b', userName: 'Bob' }],
  });

  const pc = conn.pc;
  assert.ok(pc, 'RTCPeerConnection created');

  // Trigger negotiation needed
  pc.onnegotiationneeded();
  await new Promise((r) => setTimeout(r, 20));

  const signals = socket.emitted.filter((e) => e.event === 'webrtc:signal');
  assert.equal(signals.length, 1, 'Offer emitted exactly once to webrtc:signal');
  assert.equal(signals[0].args[0].signal.description.type, 'offer');
  assert.ok(signals[0].args[0].signal.negotiationId, 'Negotiation ID attached');
  assert.ok(signals[0].args[0].signal.signalId, 'Signal ID attached');

  conn.stop();
});

test('idempotent ensurePeer: repeated peer_join or peer_present with same sessionId does not reset PC or state', async () => {
  const { conn, socket } = setupTestConnection();
  conn.start();
  const mySessionId = socket.emitted.find((e) => e.event === 'call:join_room').args[0].sessionId;

  // First peer notification
  socket.trigger('call:existing_peers', {
    roomId: 'room-101',
    toSessionId: mySessionId,
    peers: [{ socketId: 'sock-b', sessionId: 'session-b', userName: 'Bob' }],
  });
  const initialPC = conn.pc;
  assert.ok(initialPC);

  // Set mock remoteDescription on the PC to verify it stays intact
  initialPC.remoteDescription = { type: 'offer', sdp: 'test' };

  // Repeated peer_joined with identical sessionId (even if socketId refreshed)
  socket.trigger('call:peer_joined', {
    roomId: 'room-101',
    toSessionId: mySessionId,
    peer: { socketId: 'sock-b-reconnected', sessionId: 'session-b', userName: 'Bob' },
  });

  assert.equal(conn.pc, initialPC, 'PC instance must be preserved');
  assert.ok(initialPC.remoteDescription, 'remoteDescription must not be cleared');
  assert.equal(initialPC.closed, false, 'PC must not be closed');

  conn.stop();
});

test('peer reconnection with new sessionId closes old PC, increments generation, and cleans state', async () => {
  const { conn, socket } = setupTestConnection();
  conn.start();
  const mySessionId = socket.emitted.find((e) => e.event === 'call:join_room').args[0].sessionId;

  socket.trigger('call:existing_peers', {
    roomId: 'room-101',
    toSessionId: mySessionId,
    peers: [{ socketId: 'sock-b', sessionId: 'session-b1', userName: 'Bob' }],
  });
  const pc1 = conn.pc;
  assert.ok(pc1);

  // New session arrives
  socket.trigger('call:peer_joined', {
    roomId: 'room-101',
    toSessionId: mySessionId,
    peer: { socketId: 'sock-b', sessionId: 'session-b2', userName: 'Bob' },
  });
  const pc2 = conn.pc;
  assert.ok(pc2);
  assert.notEqual(pc1, pc2, 'New PC created for new peer session');
  assert.equal(pc1.closed, true, 'Old PC was cleanly closed');

  conn.stop();
});

test('remote answer validation: normal offer -> answer exchange resolves to stable', async () => {
  const { conn, socket } = setupTestConnection();
  conn.start();
  const mySessionId = socket.emitted.find((e) => e.event === 'call:join_room').args[0].sessionId;

  socket.trigger('call:existing_peers', {
    roomId: 'room-101',
    toSessionId: mySessionId,
    peers: [{ socketId: 'sock-b', sessionId: 'session-b', userName: 'Bob' }],
  });
  const pc = conn.pc;

  pc.onnegotiationneeded();
  await new Promise((r) => setTimeout(r, 20));

  assert.equal(pc.signalingState, 'have-local-offer');
  const offerSignal = socket.emitted.find((e) => e.event === 'webrtc:signal').args[0].signal;
  const negotiationId = offerSignal.negotiationId;

  // Deliver matching answer
  socket.trigger('webrtc:signal', {
    roomId: 'room-101',
    from: 'sock-b',
    fromSessionId: 'session-b',
    toSessionId: mySessionId,
    signal: {
      type: 'description',
      signalId: 'ans-sig-1',
      negotiationId,
      description: { type: 'answer', sdp: 'v=0\r\na=ice-ufrag:remote-ufrag\r\n' },
    },
  });
  await new Promise((r) => setTimeout(r, 20));

  assert.equal(pc.signalingState, 'stable');
  assert.equal(pc.remoteDescription?.type, 'answer');

  conn.stop();
});

test('remote answer validation: duplicate answer or mismatched negotiationId ignored gracefully without errors', async () => {
  const { conn, socket, errors } = setupTestConnection();
  conn.start();
  const mySessionId = socket.emitted.find((e) => e.event === 'call:join_room').args[0].sessionId;

  socket.trigger('call:existing_peers', {
    roomId: 'room-101',
    toSessionId: mySessionId,
    peers: [{ socketId: 'sock-b', sessionId: 'session-b', userName: 'Bob' }],
  });
  const pc = conn.pc;

  pc.onnegotiationneeded();
  await new Promise((r) => setTimeout(r, 20));
  const offerSignal = socket.emitted.find((e) => e.event === 'webrtc:signal').args[0].signal;
  const negotiationId = offerSignal.negotiationId;

  // 1. Send answer with mismatched negotiationId
  socket.trigger('webrtc:signal', {
    roomId: 'room-101',
    from: 'sock-b',
    fromSessionId: 'session-b',
    toSessionId: mySessionId,
    signal: {
      type: 'description',
      signalId: 'bad-ans-sig',
      negotiationId: 'mismatched-id',
      description: { type: 'answer', sdp: 'v=0\r\na=ice-ufrag:remote-ufrag\r\n' },
    },
  });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(pc.signalingState, 'have-local-offer', 'Mismatched answer must not change state');

  // 2. Deliver valid answer
  socket.trigger('webrtc:signal', {
    roomId: 'room-101',
    from: 'sock-b',
    fromSessionId: 'session-b',
    toSessionId: mySessionId,
    signal: {
      type: 'description',
      signalId: 'good-ans-sig',
      negotiationId,
      description: { type: 'answer', sdp: 'v=0\r\na=ice-ufrag:remote-ufrag\r\n' },
    },
  });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(pc.signalingState, 'stable');

  // 3. Deliver duplicate answer in stable state
  socket.trigger('webrtc:signal', {
    roomId: 'room-101',
    from: 'sock-b',
    fromSessionId: 'session-b',
    toSessionId: mySessionId,
    signal: {
      type: 'description',
      signalId: 'dup-ans-sig',
      negotiationId,
      description: { type: 'answer', sdp: 'v=0\r\na=ice-ufrag:remote-ufrag\r\n' },
    },
  });
  await new Promise((r) => setTimeout(r, 20));

  assert.equal(errors.length, 0, 'No errors reported to UI for duplicate answer');
  assert.equal(pc.signalingState, 'stable');

  conn.stop();
});

test('offer collision: impolite peer drops colliding offer and ignores its ICE candidates', async () => {
  const { conn, socket } = setupTestConnection();
  conn.start();
  const myJoin = socket.emitted.find((e) => e.event === 'call:join_room').args[0];
  // Force local to be impolite: localSessionId.localeCompare(remoteSessionId) < 0
  const localSession = 'session-aaa';
  const remoteSession = 'session-zzz';
  conn['sessionId'] = localSession;

  socket.trigger('call:existing_peers', {
    roomId: 'room-101',
    toSessionId: localSession,
    peers: [{ socketId: 'sock-b', sessionId: remoteSession, userName: 'Bob' }],
  });
  const pc = conn.pc;

  // Trigger local offer
  pc.onnegotiationneeded();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(pc.signalingState, 'have-local-offer');

  // Remote sends colliding offer
  socket.trigger('webrtc:signal', {
    roomId: 'room-101',
    from: 'sock-b',
    fromSessionId: remoteSession,
    toSessionId: localSession,
    signal: {
      type: 'description',
      signalId: 'colliding-offer-sig',
      negotiationId: 'colliding-neg-id',
      description: { type: 'offer', sdp: 'v=0\r\na=ice-ufrag:colliding-ufrag\r\n' },
    },
  });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(pc.signalingState, 'have-local-offer', 'Impolite peer preserves its have-local-offer state');

  // Remote sends ICE candidate from the ignored offer
  socket.trigger('webrtc:signal', {
    roomId: 'room-101',
    from: 'sock-b',
    fromSessionId: remoteSession,
    toSessionId: localSession,
    signal: {
      type: 'candidate',
      signalId: 'cand-ignored-1',
      negotiationId: 'colliding-neg-id',
      candidate: { candidate: 'candidate:1 1 UDP ...', usernameFragment: 'colliding-ufrag' },
    },
  });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(pc.addedIceCandidates.length, 0, 'Candidate from ignored offer must not be added');

  conn.stop();
});

test('offer collision: polite peer rolls back pending offer and accepts colliding remote offer', async () => {
  const { conn, socket } = setupTestConnection();
  conn.start();
  // Force local to be polite: localSessionId.localeCompare(remoteSessionId) > 0
  const localSession = 'session-zzz';
  const remoteSession = 'session-aaa';
  conn['sessionId'] = localSession;

  socket.trigger('call:existing_peers', {
    roomId: 'room-101',
    toSessionId: localSession,
    peers: [{ socketId: 'sock-b', sessionId: remoteSession, userName: 'Bob' }],
  });
  const pc = conn.pc;

  // Local generates offer
  pc.onnegotiationneeded();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(pc.signalingState, 'have-local-offer');

  // Remote offer arrives
  socket.trigger('webrtc:signal', {
    roomId: 'room-101',
    from: 'sock-b',
    fromSessionId: remoteSession,
    toSessionId: localSession,
    signal: {
      type: 'description',
      signalId: 'remote-offer-sig',
      negotiationId: 'remote-neg-1',
      description: { type: 'offer', sdp: 'v=0\r\na=ice-ufrag:remote-ufrag\r\n' },
    },
  });
  await new Promise((r) => setTimeout(r, 30));

  // Polite peer rolled back, applied remote offer, generated local answer and transitioned to stable
  assert.equal(pc.signalingState, 'stable');
  const answerSignal = socket.emitted
    .filter((e) => e.event === 'webrtc:signal')
    .slice(-1)[0].args[0].signal;
  assert.equal(answerSignal.description.type, 'answer');
  assert.equal(answerSignal.negotiationId, 'remote-neg-1', 'Answer correlated to remote negotiationId');

  conn.stop();
});

test('early ICE candidate arriving before remoteDescription is queued and flushed upon answer', async () => {
  const { conn, socket } = setupTestConnection();
  conn.start();
  const mySessionId = socket.emitted.find((e) => e.event === 'call:join_room').args[0].sessionId;

  socket.trigger('call:existing_peers', {
    roomId: 'room-101',
    toSessionId: mySessionId,
    peers: [{ socketId: 'sock-b', sessionId: 'session-b', userName: 'Bob' }],
  });
  const pc = conn.pc;

  pc.onnegotiationneeded();
  await new Promise((r) => setTimeout(r, 20));
  const offerSignal = socket.emitted.find((e) => e.event === 'webrtc:signal').args[0].signal;

  // Early candidate arrives BEFORE remote answer
  socket.trigger('webrtc:signal', {
    roomId: 'room-101',
    from: 'sock-b',
    fromSessionId: 'session-b',
    toSessionId: mySessionId,
    signal: {
      type: 'candidate',
      signalId: 'early-cand-1',
      candidate: { candidate: 'candidate:1 1 UDP ...', usernameFragment: 'remote-ufrag' },
    },
  });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(pc.addedIceCandidates.length, 0, 'Early candidate queued, not yet added to PC');

  // Deliver answer with matching ufrag
  socket.trigger('webrtc:signal', {
    roomId: 'room-101',
    from: 'sock-b',
    fromSessionId: 'session-b',
    toSessionId: mySessionId,
    signal: {
      type: 'description',
      signalId: 'ans-sig',
      negotiationId: offerSignal.negotiationId,
      description: { type: 'answer', sdp: 'v=0\r\na=ice-ufrag:remote-ufrag\r\n' },
    },
  });
  await new Promise((r) => setTimeout(r, 30));

  assert.equal(pc.addedIceCandidates.length, 1, 'Early candidate flushed upon remoteDescription application');

  conn.stop();
});

test('ICE restart deferred while an offer is awaiting an answer', async () => {
  const { conn, socket } = setupTestConnection();
  conn.start();
  const mySessionId = socket.emitted.find((e) => e.event === 'call:join_room').args[0].sessionId;

  socket.trigger('call:existing_peers', {
    roomId: 'room-101',
    toSessionId: mySessionId,
    peers: [{ socketId: 'sock-b', sessionId: 'session-b', userName: 'Bob' }],
  });
  const pc = conn.pc;

  pc.onnegotiationneeded();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(pc.signalingState, 'have-local-offer');

  // Trigger restart timer check
  conn['scheduleRestart'](pc, conn['generation'], 'session-b', 10);
  await new Promise((r) => setTimeout(r, 30));

  assert.equal(pc.restartIceCount, 0, 'restartIce must not be called while awaiting answer');

  conn.stop();
});
