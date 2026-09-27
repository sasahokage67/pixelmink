import type { RealtimeSocket } from '@/lib/realtime-socket';

export type CallStatus = 'waiting' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
type Peer = { socketId: string; sessionId: string; userName: string };
type Options = {
  socket: RealtimeSocket;
  roomId: string;
  userName: string;
  userId?: string;
  stream: MediaStream;
  configuration: RTCConfiguration;
  onRemoteStream: (stream: MediaStream | null) => void;
  onPeer: (peer: Peer | null) => void;
  onStatus: (status: CallStatus) => void;
  onError: (message: string) => void;
};

// Shared by the full-screen and compact calls. Each mount/reconnect has its own
// session; an old offer, ICE candidate or async continuation cannot revive it.
export class CallConnection {
  pc: RTCPeerConnection | null = null;
  private peer: Peer | null = null;
  private sessionId = '';
  private stopped = true;
  private queue: Promise<void> = Promise.resolve();
  private candidates: RTCIceCandidateInit[] = [];
  private ignoredUfrags = new Set<string>();
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private joinTimer: ReturnType<typeof setTimeout> | null = null;
  private restartAttempts = 0;
  private videoTrack: MediaStreamTrack | null;

  constructor(private readonly options: Options) {
    this.videoTrack = options.stream.getVideoTracks()[0] || null;
  }

  private current = (pc: RTCPeerConnection) => !this.stopped && this.pc === pc;
  private report = (err: unknown) => {
    this.options.onError(err instanceof Error ? err.message : String(err));
  };

  private serial(pc: RTCPeerConnection, operation: () => Promise<void>) {
    this.queue = this.queue.then(async () => {
      if (this.current(pc)) await operation();
    }).catch((err) => {
      if (this.current(pc)) this.report(err);
    });
    return this.queue;
  }

  private send(signal: object) {
    if (this.stopped || !this.peer || !this.options.socket.connected) return;
    this.options.socket.emit('webrtc:signal', {
      roomId: this.options.roomId,
      sessionId: this.sessionId,
      to: this.peer.socketId,
      targetSessionId: this.peer.sessionId,
      signal,
    });
  }

  private resetPeer() {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = null;
    const pc = this.pc;
    this.pc = null;
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onnegotiationneeded = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
    }
    this.queue = Promise.resolve();
    this.candidates = [];
    this.ignoredUfrags.clear();
    this.restartAttempts = 0;
    this.peer = null;
    this.options.onRemoteStream(null);
    this.options.onPeer(null);
  }

  private ensurePeer(peer: Peer) {
    if (this.peer?.socketId === peer.socketId && this.peer?.sessionId === peer.sessionId && this.pc) {
      return this.pc;
    }
    this.resetPeer();
    this.peer = peer;
    this.options.onPeer(peer);
    this.options.onStatus('connecting');
    const pc = new RTCPeerConnection(this.options.configuration);
    this.pc = pc;
    const remote = new MediaStream();
    pc.ontrack = ({ track }) => {
      if (!this.current(pc)) return;
      if (!remote.getTracks().some((item) => item.id === track.id)) remote.addTrack(track);
      this.options.onRemoteStream(remote);
    };
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && this.current(pc)) this.send({ type: 'candidate', candidate: candidate.toJSON() });
    };
    pc.onnegotiationneeded = () => {
      void this.serial(pc, async () => {
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription();
        if (this.current(pc)) this.send({ type: 'description', description: pc.localDescription });
      });
    };
    const updateStatus = () => {
      if (!this.current(pc)) return;
      if (pc.connectionState === 'connected') {
        if (this.restartTimer) clearTimeout(this.restartTimer);
        this.restartTimer = null;
        this.restartAttempts = 0;
        this.options.onError('');
        this.options.onStatus('connected');
      } else if (pc.connectionState === 'failed' || pc.iceConnectionState === 'failed') {
        this.scheduleRestart(pc, 0);
      } else if (pc.connectionState === 'disconnected' || pc.iceConnectionState === 'disconnected') {
        this.options.onStatus('reconnecting');
        this.scheduleRestart(pc, 4000);
      }
    };
    pc.onconnectionstatechange = updateStatus;
    pc.oniceconnectionstatechange = updateStatus;

    // Fixed transceivers allow camera/screen changes even after joining audio-only.
    // Both sides negotiate; the polite side rolls back on simultaneous offers.
    const audio = this.options.stream.getAudioTracks()[0];
    pc.addTransceiver(audio || 'audio', { direction: 'sendrecv', streams: [this.options.stream] });
    pc.addTransceiver(this.videoTrack || 'video', { direction: 'sendrecv', streams: [this.options.stream] });
    this.scheduleRestart(pc, 15000);
    return pc;
  }

  private scheduleRestart(pc: RTCPeerConnection, delay: number) {
    if (this.restartTimer || !this.current(pc)) return;
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (!this.current(pc) || pc.connectionState === 'connected') return;
      if (this.restartAttempts >= 3) {
        this.options.onStatus('failed');
        this.options.onError('Не удалось установить медиасоединение. Проверьте сеть и настройку TURN.');
        return;
      }
      this.restartAttempts += 1;
      this.options.onStatus('reconnecting');
      pc.restartIce();
      this.scheduleRestart(pc, 12000);
    }, delay);
  }

  private ufrags(sdp = '') {
    return Array.from(sdp.matchAll(/a=ice-ufrag:([^\r\n]+)/g), (match) => match[1]);
  }

  private async flushCandidates(pc: RTCPeerConnection) {
    const remoteUfrags = this.ufrags(pc.remoteDescription?.sdp);
    const remaining: RTCIceCandidateInit[] = [];
    for (const candidate of this.candidates) {
      if (!this.current(pc)) return;
      const ufrag = candidate.usernameFragment;
      if (ufrag && this.ignoredUfrags.has(ufrag) && !remoteUfrags.includes(ufrag)) continue;
      if (!pc.remoteDescription || (ufrag && !remoteUfrags.includes(ufrag))) {
        remaining.push(candidate);
        continue;
      }
      await pc.addIceCandidate(candidate);
    }
    if (this.current(pc)) this.candidates = remaining.slice(-128);
  }

  private handleSignal = (payload: any) => {
    if (!this.matches(payload) || !this.peer || payload.from !== this.peer.socketId ||
        payload.fromSessionId !== this.peer.sessionId) return;
    const pc = this.pc;
    if (!pc) return;
    void this.serial(pc, async () => {
      const { signal } = payload;
      if (signal?.type === 'candidate' && signal.candidate) {
        this.candidates.push(signal.candidate);
        await this.flushCandidates(pc);
        return;
      }
      const description = signal?.description as RTCSessionDescriptionInit | undefined;
      if (!description || !['offer', 'answer'].includes(description.type)) return;
      const collision = description.type === 'offer' && pc.signalingState !== 'stable';
      const polite = this.options.socket.id! < this.peer!.socketId;
      if (collision && !polite) {
        this.ufrags(description.sdp).forEach((ufrag) => this.ignoredUfrags.add(ufrag));
        return;
      }
      if (description.type === 'answer' && pc.signalingState !== 'have-local-offer') return;
      // setRemoteDescription(offer) performs the polite peer's implicit rollback.
      await pc.setRemoteDescription(description);
      if (!this.current(pc)) return;
      await this.flushCandidates(pc);
      if (!this.current(pc)) return;
      if (description.type === 'offer') {
        await pc.setLocalDescription();
        if (this.current(pc)) this.send({ type: 'description', description: pc.localDescription });
      }
    });
  };

  private matches(payload: any) {
    return !this.stopped && payload?.roomId === this.options.roomId && payload.toSessionId === this.sessionId;
  }
  private handlePeers = (payload: any) => {
    if (!this.matches(payload)) return;
    if (this.joinTimer) clearTimeout(this.joinTimer);
    this.joinTimer = null;
    if (payload.peers?.[0]) this.ensurePeer(payload.peers[0]);
  };
  private handlePeerJoined = (payload: any) => {
    if (!this.matches(payload)) return;
    if (this.joinTimer) clearTimeout(this.joinTimer);
    this.joinTimer = null;
    this.ensurePeer(payload.peer);
  };
  private handlePeerLeft = (payload: any) => {
    if (!this.matches(payload) || this.peer?.sessionId !== payload.sessionId ||
        this.peer?.socketId !== payload.socketId) return;
    this.resetPeer();
    this.options.onStatus('waiting');
  };
  private handleJoinError = (payload: any) => {
    if (!this.matches(payload)) return;
    // A refreshed tab can arrive before the server detects its old transport's
    // disconnect. Keep the bounded join retry alive; never evict an active peer.
    this.options.onStatus('failed');
    this.options.onError(payload.message);
  };
  private handleDisconnect = () => {
    if (this.joinTimer) clearTimeout(this.joinTimer);
    this.joinTimer = null;
    this.resetPeer();
    this.options.onStatus('reconnecting');
  };
  private join = () => {
    this.resetPeer();
    this.sessionId = crypto.randomUUID();
    this.options.onStatus('waiting');
    this.options.onError('');
    if (this.joinTimer) clearTimeout(this.joinTimer);
    const joinPayload = {
      roomId: this.options.roomId, sessionId: this.sessionId,
      userId: this.options.userId, userName: this.options.userName,
    };
    let attempts = 0;
    const sendJoin = () => {
      if (this.stopped || !this.options.socket.connected) return;
      this.joinTimer = null;
      if (attempts++ >= 12) {
        this.options.onStatus('failed');
        this.options.onError('Не удалось войти в комнату. Проверьте сервер звонков или повторите вход.');
        return;
      }
      this.options.socket.emit('call:join_room', joinPayload);
      this.joinTimer = setTimeout(sendJoin, 5000);
    };
    sendJoin();
  };

  start() {
    this.stopped = false;
    const socket = this.options.socket;
    socket.on('connect', this.join);
    socket.on('disconnect', this.handleDisconnect);
    socket.on('call:existing_peers', this.handlePeers);
    socket.on('call:peer_joined', this.handlePeerJoined);
    socket.on('call:peer_left', this.handlePeerLeft);
    socket.on('call:join_error', this.handleJoinError);
    socket.on('webrtc:signal', this.handleSignal);
    if (socket.connected) this.join();
    else this.options.onStatus('reconnecting');
  }

  async replaceVideo(track: MediaStreamTrack | null) {
    this.videoTrack = track;
    const pc = this.pc;
    if (!pc) return;
    const sender = pc.getTransceivers().find((item) => item.receiver.track.kind === 'video')?.sender;
    if (sender) await sender.replaceTrack(track);
  }

  stop() {
    this.stopped = true;
    if (this.joinTimer) clearTimeout(this.joinTimer);
    this.joinTimer = null;
    const socket = this.options.socket;
    socket.off('connect', this.join);
    socket.off('disconnect', this.handleDisconnect);
    socket.off('call:existing_peers', this.handlePeers);
    socket.off('call:peer_joined', this.handlePeerJoined);
    socket.off('call:peer_left', this.handlePeerLeft);
    socket.off('call:join_error', this.handleJoinError);
    socket.off('webrtc:signal', this.handleSignal);
    if (socket.connected) socket.emit('call:leave', { roomId: this.options.roomId, sessionId: this.sessionId });
    this.resetPeer();
  }
}
