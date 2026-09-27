const { registerCallSignaling } = require('./call-signaling');

// Realtime handlers used by the Vercel Socket.IO function. Room state lives for
// the lifetime of the Fluid Compute instance; clients reconnect and rejoin with
// fresh session ids when Vercel rotates that instance.
function registerVercelRealtime(io) {
  const onlineUsers = new Map();
  const callTerminalStates = new Map();
  const TERMINAL_STATE_TTL_MS = 6 * 60 * 60 * 1000;
  const getTerminalState = (roomId) => {
    const state = callTerminalStates.get(roomId);
    if (!state) return null;
    if (Date.now() - state.updatedAt > TERMINAL_STATE_TTL_MS) {
      callTerminalStates.delete(roomId);
      return null;
    }
    return state;
  };

  registerCallSignaling(io, (socket, roomId) => {
    const state = getTerminalState(roomId);
    if (state) socket.emit('call:terminal_state', { roomId, ...state });
  });

  io.on('connection', (socket) => {
    let currentUserId = null;
    const inCall = (roomId) => socket.data.callRoomId === roomId;

    socket.on('user:register', (userId) => {
      if (typeof userId !== 'string' || !userId) return;
      currentUserId = userId;
      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId).add(socket.id);
      socket.join(`user_${userId}`);
      io.emit('presence:update', { userId, status: 'online' });
    });
    socket.on('presence:query', (userIds, callback) => {
      const result = {};
      if (Array.isArray(userIds)) {
        userIds.forEach((id) => { result[id] = Boolean(onlineUsers.get(id)?.size); });
      }
      if (typeof callback === 'function') callback(result);
    });

    socket.on('chat:join', (conversationId) => {
      if (typeof conversationId === 'string') socket.join(`conv_${conversationId}`);
    });
    socket.on('chat:leave', (conversationId) => {
      if (typeof conversationId === 'string') socket.leave(`conv_${conversationId}`);
    });
    socket.on('chat:message', (data = {}) => {
      if (!data.conversationId || !data.message?.id) return;
      io.to(`conv_${data.conversationId}`).emit('chat:new_message', data.message);
      if (Array.isArray(data.recipientIds)) {
        data.recipientIds.forEach((recipientId) => {
          io.to(`user_${recipientId}`).emit('notification:new_message', {
            conversationId: data.conversationId,
            message: data.message,
          });
        });
      }
    });
    socket.on('chat:typing', (data = {}) => {
      if (!data.conversationId) return;
      socket.to(`conv_${data.conversationId}`).emit('chat:typing_status', data);
    });
    socket.on('chat:reaction', (reaction = {}) => {
      if (reaction.conversationId) io.to(`conv_${reaction.conversationId}`).emit('chat:message_reaction', reaction);
    });

    socket.on('call:initiate', (payload = {}) => {
      if (payload.receiverId) io.to(`user_${payload.receiverId}`).emit('call:incoming', payload);
    });
    socket.on('call:accept', (payload = {}) => {
      if (payload.callerId) io.to(`user_${payload.callerId}`).emit('call:accepted', payload);
    });
    socket.on('call:reject', (payload = {}) => {
      if (payload.callerId) io.to(`user_${payload.callerId}`).emit('call:rejected', payload);
    });
    socket.on('call:chat_message', ({ roomId, message } = {}, callback) => {
      if (!inCall(roomId) || !message?.id) return;
      socket.to(`call_${roomId}`).emit('call:new_chat_message', { ...message, roomId });
      if (typeof callback === 'function') callback({ delivered: true, messageId: message.id });
    });
    socket.on('call:role_switch', ({ roomId, mentorRole } = {}) => {
      if (!inCall(roomId) || !['local', 'remote'].includes(mentorRole)) return;
      socket.to(`call_${roomId}`).emit('call:role_switch', { roomId, mentorRole });
    });
    socket.on('call:terminal_request', ({ roomId, fromUserId, fromUserName } = {}) => {
      if (inCall(roomId)) socket.to(`call_${roomId}`).emit('call:terminal_request', { roomId, fromUserId, fromUserName });
    });
    socket.on('call:terminal_response', ({ roomId, accepted, fromUserName } = {}) => {
      if (!inCall(roomId)) return;
      if (accepted) io.to(`call_${roomId}`).emit('call:terminal_opened', { roomId, byUserName: fromUserName });
      else socket.to(`call_${roomId}`).emit('call:terminal_declined', { roomId, byUserName: fromUserName });
    });
    socket.on('call:terminal_opened', ({ roomId, byUserName } = {}) => {
      if (inCall(roomId)) io.to(`call_${roomId}`).emit('call:terminal_opened', { roomId, byUserName });
    });
    socket.on('call:terminal_get_state', ({ roomId } = {}, callback) => {
      if (!inCall(roomId)) return;
      const state = getTerminalState(roomId);
      if (state) socket.emit('call:terminal_state', { roomId, ...state });
      if (typeof callback === 'function') callback(state);
    });
    socket.on('call:terminal_sync', ({ roomId, code, language, byUserName, senderId } = {}, callback) => {
      if (!inCall(roomId) || typeof code !== 'string' || code.length > 200000 || typeof language !== 'string') return;
      const previous = getTerminalState(roomId);
      const state = { roomId, code, language, byUserName, senderId,
        revision: (previous?.revision || 0) + 1, updatedAt: Date.now() };
      callTerminalStates.set(roomId, state);
      socket.to(`call_${roomId}`).emit('call:terminal_sync', state);
      if (typeof callback === 'function') callback(state);
    });
    socket.on('call:terminal_executing', ({ roomId } = {}) => {
      if (inCall(roomId)) io.to(`call_${roomId}`).emit('call:terminal_executing', { roomId });
    });
    socket.on('call:terminal_output', ({ roomId, output } = {}) => {
      if (inCall(roomId)) io.to(`call_${roomId}`).emit('call:terminal_output', { ...output, roomId });
    });
    socket.on('call:terminal_close', ({ roomId } = {}) => {
      if (inCall(roomId)) io.to(`call_${roomId}`).emit('call:terminal_closed', { roomId });
    });

    socket.on('disconnect', () => {
      if (!currentUserId) return;
      const connections = onlineUsers.get(currentUserId);
      connections?.delete(socket.id);
      if (!connections?.size) {
        onlineUsers.delete(currentUserId);
        io.emit('presence:update', { userId: currentUserId, status: 'offline' });
      }
    });
  });
}

module.exports = { registerVercelRealtime };
