import { CallConnection } from '/controller.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(predicate, description, timeout = 18000) {
  const start = Date.now();
  while (!await predicate()) {
    if (Date.now() - start > timeout) throw new Error(`Timed out: ${description}`);
    await sleep(50);
  }
}
function assert(value, message) { if (!value) throw new Error(message); }
const results = document.querySelector('#results');
const log = (line) => { results.textContent += line + '\n'; };
const errors = [];
const resources = [];

function source(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 160; canvas.height = 120;
  const context = canvas.getContext('2d');
  const draw = () => { context.fillStyle = color; context.fillRect(0, 0, 160, 120); context.fillStyle = 'white'; context.fillText(String(Date.now()), 10, 50); };
  draw();
  const timer = setInterval(draw, 100);
  const stream = canvas.captureStream(10);
  const audio = new AudioContext();
  const oscillator = audio.createOscillator();
  const destination = audio.createMediaStreamDestination();
  oscillator.connect(destination); oscillator.start();
  destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  resources.push(() => { clearInterval(timer); stream.getTracks().forEach((track) => track.stop()); oscillator.stop(); void audio.close(); });
  return stream;
}
function client(roomId, name, stream, delaySdp = false) {
  const socket = io({ forceNew: true, autoConnect: false, transports: ['polling', 'websocket'] });
  const originalEmit = socket.emit.bind(socket);
  if (delaySdp) socket.emit = (event, ...args) => {
    if (event === 'webrtc:signal' && args[0].signal.type === 'description') {
      setTimeout(() => originalEmit(event, ...args), 150);
      return socket;
    }
    return originalEmit(event, ...args);
  };
  const state = { socket, status: 'waiting', stream, connection: null, roomId, name };
  const mount = () => {
    state.connection = new CallConnection({ socket, roomId, userName: name, stream,
      configuration: { iceServers: [] },
      onStatus: (value) => { state.status = value; },
      onRemoteStream: (value) => { state.remote = value; },
      onPeer: (value) => { state.peer = value; },
      onError: (value) => { if (value) errors.push(`${name}: ${value}`); },
    });
    state.connection.start();
  };
  mount(); socket.connect();
  state.remount = () => { state.connection.stop(); mount(); };
  resources.push(() => { state.connection.stop(); socket.disconnect(); });
  return state;
}
const connected = (...peers) => waitFor(() => peers.every((p) => p.status === 'connected'), 'connected');
async function inbound(peer, kind) {
  const stats = await peer.connection.pc.getStats();
  return Array.from(stats.values()).filter((item) => item.type === 'inbound-rtp' && item.kind === kind)
    .reduce((sum, item) => sum + (kind === 'video' ? item.framesDecoded || 0 : item.bytesReceived || 0), 0);
}
async function receives(peer, kind = 'video') {
  const before = await inbound(peer, kind);
  await waitFor(async () => await inbound(peer, kind) > before, `${peer.name} receives ${kind}`);
}

document.querySelector('#run').onclick = async () => {
  const button = document.querySelector('#run'); button.disabled = true;
  document.querySelector('#status').textContent = 'Running';
  results.textContent = ''; errors.length = 0;
  try {
    const mediaA = source('#155');
    const mediaB = source('#515');
    const a = client('regression-' + crypto.randomUUID(), 'mentor', mediaA, true);
    // Delayed peer arrival models waiting for the second user's device permissions.
    await sleep(400);
    const b = client(a.roomId, 'student', new MediaStream(mediaB.getAudioTracks()), true);
    await connected(a, b);
    await Promise.all([receives(a, 'audio'), receives(b, 'audio'), receives(b)]);
    log('PASS audio/video, delayed join, simultaneous offers, ICE before SDP');

    await b.connection.replaceVideo(mediaB.getVideoTracks()[0]);
    await receives(a);
    log('PASS enable camera after audio-only join');

    const display = source('#a61');
    await a.connection.replaceVideo(display.getVideoTracks()[0]);
    await receives(b);
    await a.connection.replaceVideo(mediaA.getVideoTracks()[0]);
    await receives(b);
    log('PASS screen track replacement and restoration');

    const previousIce = a.connection.pc.localDescription.sdp.match(/a=ice-ufrag:([^\r\n]+)/)[1];
    a.connection.pc.restartIce(); b.connection.pc.restartIce();
    await waitFor(() => a.connection.pc.localDescription.sdp.match(/a=ice-ufrag:([^\r\n]+)/)[1] !== previousIce &&
      a.connection.pc.signalingState === 'stable' && b.connection.pc.signalingState === 'stable', 'ICE restart signaling');
    await Promise.all([receives(a), receives(b)]);
    log('PASS simultaneous ICE restart');

    const oldPc = b.connection.pc;
    b.socket.disconnect();
    await waitFor(() => a.status === 'waiting', 'peer-left');
    b.socket.connect();
    await connected(a, b);
    assert(oldPc.connectionState === 'closed', 'old connection was not closed');
    await receives(b);
    log('PASS network disconnect/reconnect with new socket ID');

    a.socket.disconnect(); b.socket.disconnect();
    a.socket.connect(); b.socket.connect();
    await connected(a, b); await receives(b);
    log('PASS simultaneous reconnect');

    for (let i = 0; i < 10; i++) {
      b.remount();
      await connected(a, b);
      await receives(b);
    }
    log('PASS 10 same-socket remounts, stale-session isolation and media recovery');

    const intruder = client(a.roomId, 'third', new MediaStream());
    await waitFor(() => intruder.status === 'failed', 'room full');
    assert(a.status === 'connected' && b.status === 'connected', 'third peer disturbed call');
    const expectedRejection = errors.findIndex((item) => item.startsWith('third:'));
    assert(expectedRejection >= 0, 'room-full rejection was not reported');
    errors.splice(expectedRejection, 1);
    log('PASS third peer cannot replace an active 1:1 connection');

    b.connection.stop(); b.socket.disconnect();
    await waitFor(() => a.status === 'waiting', 'refresh leaves room');
    await connected(a, intruder);
    await receives(intruder);
    log('PASS bounded retry joins after a stale room slot is released');
    log('PASS receive-only participant without microphone or camera');
    intruder.connection.stop(); intruder.socket.disconnect();
    await waitFor(() => a.status === 'waiting', 'receive-only peer leaves');
    const refreshed = client(a.roomId, 'student-refreshed', mediaB);
    await connected(a, refreshed); await Promise.all([receives(a), receives(refreshed)]);
    log('PASS full refresh: new client and connection, bidirectional video');
    assert(errors.length === 0, errors.join('\n'));
    document.querySelector('#status').textContent = 'ALL TESTS PASSED';
  } catch (err) {
    log('FAIL ' + err.stack + '\n' + errors.join('\n'));
    document.querySelector('#status').textContent = 'FAILED';
  } finally {
    resources.reverse().forEach((close) => close()); resources.length = 0;
    button.disabled = false;
  }
};
