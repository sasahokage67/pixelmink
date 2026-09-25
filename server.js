const http = require('http');
const next = require('next');
const { Server } = require('socket.io');

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
  // Track call rooms: roomId -> Set(socketId)
  const callRooms = new Map();

  io.on('connection', (socket) => {
    let currentUserId = null;

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

    socket.on('call:join_room', ({ roomId, userId, userName }) => {
      socket.join(`call_${roomId}`);
      if (!callRooms.has(roomId)) {
        callRooms.set(roomId, new Set());
      }
      callRooms.get(roomId).add(socket.id);

      socket.to(`call_${roomId}`).emit('call:peer_joined', {
        socketId: socket.id,
        userId,
        userName,
      });

      const peers = Array.from(callRooms.get(roomId)).filter(id => id !== socket.id);
      socket.emit('call:existing_peers', { peers });
    });

    socket.on('webrtc:signal', ({ to, signal, from }) => {
      io.to(to).emit('webrtc:signal', {
        signal,
        from: from || socket.id,
      });
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

    socket.on('call:leave', ({ roomId }) => {
      socket.leave(`call_${roomId}`);
      if (callRooms.has(roomId)) {
        callRooms.get(roomId).delete(socket.id);
        if (callRooms.get(roomId).size === 0) callRooms.delete(roomId);
      }
      socket.to(`call_${roomId}`).emit('call:peer_left', { socketId: socket.id });
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

      for (const [roomId, peers] of callRooms.entries()) {
        if (peers.has(socket.id)) {
          peers.delete(socket.id);
          socket.to(`call_${roomId}`).emit('call:peer_left', { socketId: socket.id });
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
