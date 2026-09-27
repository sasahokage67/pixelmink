const http = require('http');
const next = require('next');
const { Server } = require('socket.io');
const { registerCallSignaling } = require('./server/call-signaling');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io/',
  });

  // Track online users: userId -> Set of socketIds
  const onlineUsers = new Map();
  // Track seminar participants: seminarId -> Map(socketId -> { userId, userName, role })
  const seminarRooms = new Map();
  // Keep the latest collaborative editor snapshot so refresh/reconnect can restore it.
  // Snapshots are intentionally process-local and expire to avoid unbounded memory use.
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

    // --- Presence ---
    socket.on('user:register', (userId) => {
      if (!userId) return;
      currentUserId = userId;
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);
      socket.join(`user_${userId}`);
      io.emit('presence:update', { userId, status: 'online' });
    });

    socket.on('presence:query', (userIds, callback) => {
      const result = {};
      if (Array.isArray(userIds)) {
        userIds.forEach(uid => {
          result[uid] = onlineUsers.has(uid) && onlineUsers.get(uid).size > 0;
        });
      }
      if (typeof callback === 'function') callback(result);
    });

    // --- Chat Realtime ---
    socket.on('chat:join', (conversationId) => {
      socket.join(`conv_${conversationId}`);
    });

    socket.on('chat:leave', (conversationId) => {
      socket.leave(`conv_${conversationId}`);
    });

    socket.on('chat:message', (data) => {
      // data: { conversationId, message }
      io.to(`conv_${data.conversationId}`).emit('chat:new_message', data.message);
      if (data.recipientIds && Array.isArray(data.recipientIds)) {
        data.recipientIds.forEach(recipientId => {
          io.to(`user_${recipientId}`).emit('notification:new_message', {
            conversationId: data.conversationId,
            message: data.message,
          });
        });
      }
    });

    socket.on('chat:typing', ({ conversationId, userId, userName, isTyping }) => {
      socket.to(`conv_${conversationId}`).emit('chat:typing_status', {
        conversationId,
        userId,
        userName,
        isTyping,
      });
    });

    socket.on('chat:reaction', (reaction) => {
      io.to(`conv_${reaction.conversationId}`).emit('chat:message_reaction', reaction);
    });

    // --- WebRTC 1:1 and Group Calls ---
    socket.on('call:initiate', (payload) => {
      if (payload.receiverId) {
        io.to(`user_${payload.receiverId}`).emit('call:incoming', payload);
      }
    });

    socket.on('call:accept', (payload) => {
      if (payload.callerId) {
        io.to(`user_${payload.callerId}`).emit('call:accepted', payload);
      }
    });

    socket.on('call:reject', (payload) => {
      if (payload.callerId) {
        io.to(`user_${payload.callerId}`).emit('call:rejected', payload);
      }
    });

    socket.on('call:screen_share', ({ roomId, isSharing, userId }) => {
      socket.to(`call_${roomId}`).emit('call:screen_share_status', { isSharing, userId });
    });

    socket.on('call:raise_hand', ({ roomId, userId, userName }) => {
      io.to(`call_${roomId}`).emit('call:hand_raised', { userId, userName });
    });

    socket.on('call:host_control', ({ roomId, targetUserId, action }) => {
      io.to(`call_${roomId}`).emit('call:moderated', { targetUserId, action });
    });

    socket.on('call:chat_message', ({ roomId, message }, callback) => {
      if (!inCall(roomId) || !message?.id) return;
      socket.to(`call_${roomId}`).emit('call:new_chat_message', { ...message, roomId });
      if (typeof callback === 'function') callback({ delivered: true, messageId: message.id });
    });

    socket.on('call:role_switch', ({ roomId, mentorRole }) => {
      if (!inCall(roomId) || !['local', 'remote'].includes(mentorRole)) return;
      socket.to(`call_${roomId}`).emit('call:role_switch', { roomId, mentorRole });
    });

    // --- Shared In-Call Terminal & Code IDE (Mutual Consent) ---
    socket.on('call:terminal_request', ({ roomId, fromUserId, fromUserName }) => {
      if (!inCall(roomId)) return;
      socket.to(`call_${roomId}`).emit('call:terminal_request', { roomId, fromUserId, fromUserName });
    });

    socket.on('call:terminal_response', ({ roomId, accepted, fromUserName }) => {
      if (!inCall(roomId)) return;
      if (accepted) {
        io.to(`call_${roomId}`).emit('call:terminal_opened', { roomId, byUserName: fromUserName });
      } else {
        socket.to(`call_${roomId}`).emit('call:terminal_declined', { roomId, byUserName: fromUserName });
      }
    });

    socket.on('call:terminal_opened', ({ roomId, byUserName }) => {
      if (!inCall(roomId)) return;
      io.to(`call_${roomId}`).emit('call:terminal_opened', { roomId, byUserName });
    });

    socket.on('call:terminal_get_state', ({ roomId }, callback) => {
      if (!inCall(roomId)) return;
      const state = getTerminalState(roomId);
      if (state) socket.emit('call:terminal_state', state);
      if (typeof callback === 'function') callback(state);
    });

    socket.on('call:terminal_sync', ({ roomId, code, language, byUserName, senderId }, callback) => {
      if (!inCall(roomId) || typeof code !== 'string' || code.length > 200000 || typeof language !== 'string') return;
      const previous = getTerminalState(roomId);
      const state = {
        roomId,
        code,
        language,
        byUserName,
        senderId,
        revision: (previous?.revision || 0) + 1,
        updatedAt: Date.now(),
      };
      callTerminalStates.set(roomId, state);
      socket.to(`call_${roomId}`).emit('call:terminal_sync', state);
      if (typeof callback === 'function') callback(state);
    });

    socket.on('call:terminal_executing', ({ roomId }) => {
      if (!inCall(roomId)) return;
      io.to(`call_${roomId}`).emit('call:terminal_executing', { roomId });
    });

    socket.on('call:terminal_output', ({ roomId, output }) => {
      if (!inCall(roomId)) return;
      io.to(`call_${roomId}`).emit('call:terminal_output', { ...output, roomId });
    });

    socket.on('call:terminal_close', ({ roomId }) => {
      if (!inCall(roomId)) return;
      io.to(`call_${roomId}`).emit('call:terminal_closed', { roomId });
    });

    // --- Massive Seminars (SFU / Broadcast Mode) ---
    socket.on('seminar:join', ({ seminarId, userId, userName, role }) => {
      socket.join(`seminar_${seminarId}`);
      if (!seminarRooms.has(seminarId)) {
        seminarRooms.set(seminarId, new Map());
      }
      seminarRooms.get(seminarId).set(socket.id, { userId, userName, role });
      const count = seminarRooms.get(seminarId).size;
      io.to(`seminar_${seminarId}`).emit('seminar:count_update', { count });
    });

    socket.on('seminar:message', (payload) => {
      io.to(`seminar_${payload.seminarId}`).emit('seminar:new_message', payload.message);
    });

    socket.on('seminar:question', (payload) => {
      io.to(`seminar_${payload.seminarId}`).emit('seminar:new_question', payload.question);
    });

    socket.on('seminar:question_upvote', ({ seminarId, questionId, upvotes }) => {
      io.to(`seminar_${seminarId}`).emit('seminar:question_upvoted', { questionId, upvotes });
    });

    socket.on('seminar:answering_now', ({ seminarId, questionId }) => {
      io.to(`seminar_${seminarId}`).emit('seminar:answering_status', { questionId });
    });

    socket.on('seminar:reaction', ({ seminarId, emoji, userName }) => {
      io.to(`seminar_${seminarId}`).emit('seminar:floating_reaction', { emoji, userName, id: Math.random().toString() });
    });

    socket.on('seminar:moderation', ({ seminarId, action, targetMessageId, targetUserId }) => {
      io.to(`seminar_${seminarId}`).emit('seminar:moderated', { action, targetMessageId, targetUserId });
    });

    socket.on('seminar:recording_toggle', ({ seminarId, isRecording }) => {
      io.to(`seminar_${seminarId}`).emit('seminar:recording_status', { isRecording });
    });

    socket.on('seminar:leave', ({ seminarId }) => {
      socket.leave(`seminar_${seminarId}`);
      if (seminarRooms.has(seminarId)) {
        seminarRooms.get(seminarId).delete(socket.id);
        const count = seminarRooms.get(seminarId).size;
        io.to(`seminar_${seminarId}`).emit('seminar:count_update', { count });
      }
    });

    // --- Disconnection Cleanup ---
    socket.on('disconnect', () => {
      if (currentUserId && onlineUsers.has(currentUserId)) {
        onlineUsers.get(currentUserId).delete(socket.id);
        if (onlineUsers.get(currentUserId).size === 0) {
          onlineUsers.delete(currentUserId);
          io.emit('presence:update', { userId: currentUserId, status: 'offline' });
        }
      }

      for (const [seminarId, participants] of seminarRooms.entries()) {
        if (participants.has(socket.id)) {
          participants.delete(socket.id);
          io.to(`seminar_${seminarId}`).emit('seminar:count_update', { count: participants.size });
        }
      }


    });
  });

  server.listen(port, () => {
    console.log(`> pixelmink Server ready on http://${hostname}:${port}`);
    console.log(`> Slogan: "Your skills for theirs. No money, just knowledge."`);
    console.log(`> Real-time Socket.IO and WebRTC Signaling active`);
  });
});
