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

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

// Shared by the full-screen and compact calls. Each mount/reconnect has its own
// session and generation; stale offers, ICE candidates, or async continuations cannot revive it.
export class CallConnection {
  pc: RTCPeerConnection | null = null;
  private peer: Peer | null = null;
  private sessionId = '';
  private generation = 0;
  private stopped = true;
  private queue: Promise<void> = Promise.resolve();
  private candidates: RTCIceCandidateInit[] = [];
  private ignoredUfrags = new Set<string>();
  private ignoredOfferNegotiationIds = new Set<string>();
  private processedSignalIds = new Set<string>();
  private appliedAnswerNegotiationIds = new Set<string>();
  private pendingNegotiationId: string | null = null;
  private makingOffer = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private joinTimer: ReturnType<typeof setTimeout> | null = null;
  private restartAttempts = 0;
  private videoTrack: MediaStreamTrack | null;

  constructor(private readonly options: Options) {
    this.videoTrack = options.stream.getVideoTracks()[0] || null;
  }

  // Generation guard: verifies that the peer connection, generation counter,
  // and peer session are still actively valid before executing async operations.
  private isAlive(pc: RTCPeerConnection, generation: number, peerSessionId?: string): boolean {
    if (this.stopped) return false;
    if (this.pc !== pc) return false;
    if (this.generation !== generation) return false;
    if (peerSessionId && this.peer?.sessionId !== peerSessionId) return false;
    return true;
  }

  private report = (err: unknown) => {
    this.options.onError(err instanceof Error ? err.message : String(err));
  };

  private serial(
    pc: RTCPeerConnection,
    generation: number,
    peerSessionId: string | undefined,
    operation: () => Promise<void>
  ) {
    this.queue = this.queue
      .then(async () => {
        if (this.isAlive(pc, generation, peerSessionId)) {
          await operation();
        }
      })
      .catch((err) => {
        if (this.isAlive(pc, generation, peerSessionId)) {
          this.report(err);
        }
      });
    return this.queue;
  }

  // Single authoritative transport: Socket.IO webrtc:signal.
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
    this.generation += 1;
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
    this.ignoredOfferNegotiationIds.clear();
    this.processedSignalIds.clear();
    this.appliedAnswerNegotiationIds.clear();
    this.pendingNegotiationId = null;
    this.makingOffer = false;
    this.restartAttempts = 0;
    this.peer = null;
    this.options.onRemoteStream(null);
    this.options.onPeer(null);
  }

  private ensurePeer(peer: Peer) {
    // Idempotent join/present: repeated notification with the same sessionId
    // MUST NOT tear down RTCPeerConnection, clear remoteDescription, or reset negotiation.
    if (this.peer?.sessionId === peer.sessionId && this.pc) {
      this.peer.socketId = peer.socketId;
      return this.pc;
    }
    this.resetPeer();
    this.peer = peer;
    const generation = this.generation;
    const peerSessionId = peer.sessionId;
    this.options.onPeer(peer);
    this.options.onStatus('connecting');
    const pc = new RTCPeerConnection(this.options.configuration);
    this.pc = pc;
    const remote = new MediaStream();

    pc.ontrack = ({ track }) => {
      if (!this.isAlive(pc, generation, peerSessionId)) return;
      if (!remote.getTracks().some((item) => item.id === track.id)) remote.addTrack(track);
      this.options.onRemoteStream(remote);
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && this.isAlive(pc, generation, peerSessionId)) {
        this.send({
          type: 'candidate',
          signalId: createId(),
          negotiationId: this.pendingNegotiationId || undefined,
          candidate: candidate.toJSON(),
        });
      }
    };

    pc.onnegotiationneeded = () => {
      void this.serial(pc, generation, peerSessionId, async () => {
        try {
          this.makingOffer = true;
          if (!this.isAlive(pc, generation, peerSessionId)) return;
          if (pc.signalingState !== 'stable') return;
          const negotiationId = createId();
          const signalId = createId();
          this.pendingNegotiationId = negotiationId;
          await pc.setLocalDescription();
          if (!this.isAlive(pc, generation, peerSessionId)) return;
          this.send({
            type: 'description',
            signalId,
            negotiationId,
            description: pc.localDescription,
          });
        } finally {
          this.makingOffer = false;
        }
      });
    };

    const updateStatus = () => {
      if (!this.isAlive(pc, generation, peerSessionId)) return;
      if (pc.connectionState === 'connected') {
        if (this.restartTimer) clearTimeout(this.restartTimer);
        this.restartTimer = null;
        this.restartAttempts = 0;
        this.options.onError('');
        this.options.onStatus('connected');
      } else if (pc.connectionState === 'failed' || pc.iceConnectionState === 'failed') {
        this.scheduleRestart(pc, generation, peerSessionId, 0);
      } else if (pc.connectionState === 'disconnected' || pc.iceConnectionState === 'disconnected') {
        this.options.onStatus('reconnecting');
        this.scheduleRestart(pc, generation, peerSessionId, 4000);
      }
    };

    pc.onconnectionstatechange = updateStatus;
    pc.oniceconnectionstatechange = updateStatus;

    // Fixed transceivers allow camera/screen changes even after joining audio-only.
    // Both sides negotiate; the polite side rolls back on simultaneous offers.
    const audio = this.options.stream.getAudioTracks()[0];
    pc.addTransceiver(audio || 'audio', { direction: 'sendrecv', streams: [this.options.stream] });
    pc.addTransceiver(this.videoTrack || 'video', { direction: 'sendrecv', streams: [this.options.stream] });
    this.scheduleRestart(pc, generation, peerSessionId, 15000);
    return pc;
  }

  private scheduleRestart(
    pc: RTCPeerConnection,
    generation: number,
    peerSessionId: string,
    delay: number
  ) {
    if (this.restartTimer || !this.isAlive(pc, generation, peerSessionId)) return;
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (!this.isAlive(pc, generation, peerSessionId) || pc.connectionState === 'connected') return;

      // Do not trigger ICE restart while an offer is awaiting an answer
      if (this.pendingNegotiationId || this.makingOffer || pc.signalingState !== 'stable') {
        this.scheduleRestart(pc, generation, peerSessionId, 3000);
        return;
      }

      if (this.restartAttempts >= 3) {
        this.options.onStatus('failed');
        this.options.onError('Не удалось установить медиасоединение. Проверьте сеть и настройку TURN.');
        return;
      }
      this.restartAttempts += 1;
      this.options.onStatus('reconnecting');
      pc.restartIce();
      this.scheduleRestart(pc, generation, peerSessionId, 12000);
    }, delay);
  }

  private ufrags(sdp = '') {
    return Array.from(sdp.matchAll(/a=ice-ufrag:([^\r\n]+)/g), (match) => match[1]);
  }

  private async flushCandidates(pc: RTCPeerConnection, generation: number, peerSessionId: string) {
    const remoteUfrags = this.ufrags(pc.remoteDescription?.sdp);
    const remaining: RTCIceCandidateInit[] = [];
    for (const candidate of this.candidates) {
      if (!this.isAlive(pc, generation, peerSessionId)) return;
      const ufrag = candidate.usernameFragment;
      // Drop candidates belonging to an ignored offer SDP
      if (ufrag && this.ignoredUfrags.has(ufrag) && !remoteUfrags.includes(ufrag)) continue;
      if (!pc.remoteDescription || (ufrag && !remoteUfrags.includes(ufrag))) {
        remaining.push(candidate);
        continue;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // Safe to ignore candidate rejected by WebRTC state without killing connection
      }
    }
    if (this.isAlive(pc, generation, peerSessionId)) {
      this.candidates = remaining.slice(-128);
    }
  }

  private handleSignal = (payload: any) => {
    if (
      !this.matches(payload) ||
      !this.peer ||
      payload.from !== this.peer.socketId ||
      payload.fromSessionId !== this.peer.sessionId
    ) {
      return;
    }
    const pc = this.pc;
    if (!pc) return;
    const generation = this.generation;
    const peerSessionId = this.peer.sessionId;

    void this.serial(pc, generation, peerSessionId, async () => {
      const { signal } = payload;
      if (!signal) return;

      // Deduplicate packet by signalId
      if (signal.signalId && this.processedSignalIds.has(signal.signalId)) {
        return;
      }

      // Handle ICE candidates
      if (signal.type === 'candidate' && signal.candidate) {
        if (signal.signalId) this.processedSignalIds.add(signal.signalId);
        // Ignore candidate if it belongs to an ignored offer's negotiation round
        if (signal.negotiationId && this.ignoredOfferNegotiationIds.has(signal.negotiationId)) {
          return;
        }
        const ufrag = signal.candidate.usernameFragment;
        if (ufrag && this.ignoredUfrags.has(ufrag)) {
          const remoteUfrags = this.ufrags(pc.remoteDescription?.sdp);
          if (!remoteUfrags.includes(ufrag)) {
            return;
          }
        }
        this.candidates.push(signal.candidate);
        await this.flushCandidates(pc, generation, peerSessionId);
        return;
      }

      const description = signal.description as RTCSessionDescriptionInit | undefined;
      if (!description || !['offer', 'answer'].includes(description.type)) return;

      const isOffer = description.type === 'offer';
      const isAnswer = description.type === 'answer';

      if (isOffer) {
        // Offer collision detection:
        // Collision occurs when local is making an offer or state is not stable.
        const isCollision = this.makingOffer || pc.signalingState !== 'stable';
        // Deterministic polite calculation based on immutable session IDs:
        const polite = this.sessionId.localeCompare(peerSessionId) > 0;

        if (isCollision) {
          if (!polite) {
            // Impolite peer drops colliding offer and notes ignored SDP ufrags and negotiationId
            if (signal.negotiationId) {
              this.ignoredOfferNegotiationIds.add(signal.negotiationId);
            }
            this.ufrags(description.sdp).forEach((ufrag) => this.ignoredUfrags.add(ufrag));
            return;
          }
          // Polite peer: rolls back pending offer
          this.pendingNegotiationId = null;
        }

        if (signal.signalId) this.processedSignalIds.add(signal.signalId);

        // setRemoteDescription(offer) executes implicit rollback on the polite peer if needed.
        await pc.setRemoteDescription(description);
        if (!this.isAlive(pc, generation, peerSessionId)) return;

        await this.flushCandidates(pc, generation, peerSessionId);
        if (!this.isAlive(pc, generation, peerSessionId)) return;

        await pc.setLocalDescription();
        if (!this.isAlive(pc, generation, peerSessionId)) return;

        this.send({
          type: 'description',
          signalId: createId(),
          negotiationId: signal.negotiationId, // Correlate answer with incoming offer
          description: pc.localDescription,
        });
        return;
      }

      if (isAnswer) {
        // Remote answer validation:
        // 1. Answer never participates in offer collision handling.
        // 2. Local state must be 'have-local-offer'.
        // 3. pendingNegotiationId must match the answer's negotiationId.
        // 4. Must not have already applied an answer for this negotiationId.
        if (pc.signalingState !== 'have-local-offer') {
          return;
        }
        if (!this.pendingNegotiationId) {
          return;
        }
        if (signal.negotiationId && signal.negotiationId !== this.pendingNegotiationId) {
          return;
        }
        if (signal.negotiationId && this.appliedAnswerNegotiationIds.has(signal.negotiationId)) {
          return;
        }

        if (signal.signalId) this.processedSignalIds.add(signal.signalId);
        if (signal.negotiationId) this.appliedAnswerNegotiationIds.add(signal.negotiationId);
        this.pendingNegotiationId = null;

        await pc.setRemoteDescription(description);
        if (!this.isAlive(pc, generation, peerSessionId)) return;

        await this.flushCandidates(pc, generation, peerSessionId);
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
    if (payload.peer) this.ensurePeer(payload.peer);
  };

  private handlePeerLeft = (payload: any) => {
    if (
      !this.matches(payload) ||
      this.peer?.sessionId !== payload.sessionId ||
      this.peer?.socketId !== payload.socketId
    ) {
      return;
    }
    this.resetPeer();
    this.options.onStatus('waiting');
  };

  private handleJoinError = (payload: any) => {
    if (!this.matches(payload)) return;
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
    this.sessionId = createId();
    this.options.onStatus('waiting');
    this.options.onError('');
    if (this.joinTimer) clearTimeout(this.joinTimer);
    const joinPayload = {
      roomId: this.options.roomId,
      sessionId: this.sessionId,
      userId: this.options.userId,
      userName: this.options.userName,
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
