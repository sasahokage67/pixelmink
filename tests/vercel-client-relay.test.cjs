const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loadRealtimeSocket() {
  const filename = path.resolve(__dirname, '../src/lib/realtime-socket.ts');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(compiled, filename);
  return loaded.exports;
}

test('Vercel client relays call discovery and WebRTC signals across Function instances', async () => {
  const original = { WebSocket: global.WebSocket, EventSource: global.EventSource, fetch: global.fetch };
  const requests = [];
  class FakeWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static last;
    readyState = 1;
    constructor(url) { this.url = url; FakeWebSocket.last = this; }
    send() {}
    close() { this.readyState = 3; }
  }
  class FakeEventSource {
    static last;
    constructor(url) { this.url = url; FakeEventSource.last = this; }
    close() {}
  }
  global.WebSocket = FakeWebSocket;
  global.EventSource = FakeEventSource;
  global.fetch = async (_url, options) => { requests.push(JSON.parse(options.body)); return { ok: true }; };
  try {
    const { createRealtimeSocket } = loadRealtimeSocket();
    const socket = createRealtimeSocket(undefined, 'https://pixelmink.example');
    FakeWebSocket.last.onmessage({ data: JSON.stringify({ type: 'hello', id: 'ws-a' }) });
    let joined;
    let signal;
    socket.on('call:peer_joined', (value) => { joined = value; });
    socket.on('webrtc:signal', (value) => { signal = value; });
    socket.emit('call:join_room', { roomId: 'room', sessionId: 'session-a', userName: 'A' });
    FakeEventSource.last.onopen();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(requests[0].signal.kind, 'peer_join');

    const publish = (roomSignal) => FakeEventSource.last.onmessage({
      data: JSON.stringify({ message: JSON.stringify(roomSignal) }),
    });
    publish({
      type: 'room_signal', fromPeerId: 'session-b',
      signal: { kind: 'peer_join', peer: { socketId: 'session-b', sessionId: 'session-b', userName: 'B' } },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(joined.peer.sessionId, 'session-b');
    assert.equal(requests.some((request) => request.signal.kind === 'peer_present'), true);

    publish({
      type: 'room_signal', fromPeerId: 'session-b', toPeerId: 'session-a',
      signal: { kind: 'webrtc', signal: { type: 'candidate', candidate: { candidate: 'test' } } },
    });
    assert.equal(signal.fromSessionId, 'session-b');
    assert.equal(signal.signal.candidate.candidate, 'test');
    socket.disconnect();
  } finally {
    global.WebSocket = original.WebSocket;
    global.EventSource = original.EventSource;
    global.fetch = original.fetch;
  }
});
