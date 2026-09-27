// Session-scoped 1:1 signaling. Existing chat, presence and seminar events stay
// on the same Socket.IO server. No SDP/ICE is stored or replayed across sessions.
function registerCallSignaling(io, onJoin = () => {}) {
  const rooms = new Map();
  io.on('connection', (socket) => {
    let membership = null;
    const leave = () => {
      if (!membership) return;
      const { roomId, sessionId } = membership;
      const peers = rooms.get(roomId);
      peers?.delete(socket.id);
      if (peers) {
        for (const peer of peers.values()) {
          io.to(peer.socketId).emit('call:peer_left', {
            roomId, socketId: socket.id, sessionId, toSessionId: peer.sessionId,
          });
        }
        if (!peers.size) rooms.delete(roomId);
      }
      socket.leave(`call_${roomId}`);
      membership = null;
      socket.data.callRoomId = null;
    };

    socket.on('call:join_room', (payload = {}) => {
      const { roomId, sessionId, userId, userName } = payload;
      if (typeof roomId !== 'string' || !roomId || roomId.length > 200 ||
          typeof sessionId !== 'string' || !sessionId || sessionId.length > 100) return;
      if (membership && (membership.roomId !== roomId || membership.sessionId !== sessionId)) leave();
      let peers = rooms.get(roomId);
      if (!peers) rooms.set(roomId, peers = new Map());
      if (!peers.has(socket.id) && peers.size >= 2) {
        socket.emit('call:join_error', { roomId, toSessionId: sessionId, message: 'В этой комнате уже два участника.' });
        return;
      }
      const isNew = !peers.has(socket.id);
      const peer = { socketId: socket.id, sessionId, userId, userName: String(userName || 'Peer').slice(0, 100) };
      membership = { roomId, sessionId };
      socket.data.callRoomId = roomId;
      socket.join(`call_${roomId}`);
      peers.set(socket.id, peer);
      // Deliver the roster first. Every client knows the other session before
      // any offer can be relayed, regardless of who wins the media permission race.
      socket.emit('call:existing_peers', {
        roomId, toSessionId: sessionId,
        peers: Array.from(peers.values()).filter((item) => item.socketId !== socket.id),
      });
      if (isNew) {
        for (const other of peers.values()) {
          if (other.socketId !== socket.id) {
            io.to(other.socketId).emit('call:peer_joined', { roomId, toSessionId: other.sessionId, peer });
          }
        }
      }
      onJoin(socket, roomId);
    });

    socket.on('webrtc:signal', (payload = {}) => {
      const { roomId, sessionId, to, targetSessionId, signal } = payload;
      if (!membership || membership.roomId !== roomId || membership.sessionId !== sessionId) return;
      const peer = rooms.get(roomId)?.get(to);
      if (!peer || peer.sessionId !== targetSessionId || to === socket.id || !signal) return;
      io.to(to).emit('webrtc:signal', {
        roomId, from: socket.id, fromSessionId: sessionId,
        toSessionId: targetSessionId, signal,
      });
    });
    socket.on('call:leave', (payload = {}) => {
      if (membership?.roomId === payload.roomId && membership.sessionId === payload.sessionId) leave();
    });
    socket.on('disconnect', leave);
  });
}

module.exports = { registerCallSignaling };
