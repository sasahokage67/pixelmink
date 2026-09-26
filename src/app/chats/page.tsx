'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import Identicon from '@/components/ui/Identicon';
import {
  Search,
  Phone,
  Video,
  Send,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Reply,
  MoreVertical,
  Code,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  Ban,
  ShieldAlert,
  Lock,
  X,
} from 'lucide-react';
import InChatCall from '@/components/chat/InChatCall';

export default function ChatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramConvId = searchParams.get('convId');
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState<string | null>(null);

  // Block & Alert state
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [chatAlert, setChatAlert] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadBlockedUsers = async () => {
    try {
      const res = await fetch('/api/block');
      if (res.ok) {
        const data = await res.json();
        setBlockedUserIds(data.blockedUserIds || []);
      }
    } catch {}
  };

  useEffect(() => {
    loadBlockedUsers();
  }, [user]);

  const handleToggleBlock = async (targetUserId: string) => {
    if (!targetUserId) return;
    const isCurrentlyBlocked = blockedUserIds.includes(targetUserId);
    const action = isCurrentlyBlocked ? 'unblock' : 'block';
    try {
      const res = await fetch('/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action }),
      });
      if (res.ok) {
        if (isCurrentlyBlocked) {
          setBlockedUserIds((prev) => prev.filter((id) => id !== targetUserId));
          setChatAlert('Пользователь разблокирован.');
        } else {
          setBlockedUserIds((prev) => [...prev, targetUserId]);
          setChatAlert('Пользователь заблокирован. Звонки и сообщения отключены.');
        }
      }
    } catch {
      setChatAlert('Ошибка изменения статуса блокировки');
    }
  };

  // Fetch all conversations
  const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        const convList = data.conversations || [];
        setConversations(convList);

        if (paramConvId) {
          const match = convList.find((c: any) => c.id === paramConvId);
          if (match) setActiveConv(match);
        } else if (convList.length > 0 && !activeConv) {
          setActiveConv(convList[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [paramConvId, user]);

  // Load messages when activeConv changes
  useEffect(() => {
    if (!activeConv) return;

    async function loadMessages() {
      try {
        const res = await fetch(`/api/conversations/${activeConv.id}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadMessages();

    // Join Socket room
    if (socket) {
      socket.emit('chat:join', activeConv.id);
    }

    return () => {
      if (socket) {
        socket.emit('chat:leave', activeConv.id);
      }
    };
  }, [activeConv, socket]);

  // Real-time socket message and typing listener
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (activeConv && msg.conversationId === activeConv.id) {
        setMessages((prev) => [...prev, msg]);
      }
      loadConversations();
    };

    const handleTypingStatus = ({ conversationId, userName, isTyping }: any) => {
      if (activeConv && conversationId === activeConv.id) {
        setPeerTyping(isTyping ? userName : null);
      }
    };

    const handleReaction = (reaction: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === reaction.messageId
            ? { ...m, reactions: [...(m.reactions || []), reaction] }
            : m
        )
      );
    };

    socket.on('chat:new_message', handleNewMessage);
    socket.on('chat:typing_status', handleTypingStatus);
    socket.on('chat:message_reaction', handleReaction);

    return () => {
      socket.off('chat:new_message', handleNewMessage);
      socket.off('chat:typing_status', handleTypingStatus);
      socket.off('chat:message_reaction', handleReaction);
    };
  }, [socket, activeConv]);

  // Scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, peerTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (socket && activeConv) {
      if (!isTyping) {
        setIsTyping(true);
        socket.emit('chat:typing', {
          conversationId: activeConv.id,
          userId: user?.id,
          userName: user?.profile?.name || 'Peer',
          isTyping: true,
        });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit('chat:typing', {
          conversationId: activeConv.id,
          userId: user?.id,
          userName: user?.profile?.name || 'Peer',
          isTyping: false,
        });
      }, 1500);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv) return;

    const content = newMessage.trim();
    setNewMessage('');
    setReplyTo(null);

    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          replyToId: replyTo?.id || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Emit through socket for real-time broadcast
        if (socket) {
          const recipientIds = activeConv.members
            ?.map((m: any) => m.userId)
            .filter((uid: string) => uid !== user?.id);

          socket.emit('chat:message', {
            conversationId: activeConv.id,
            message: data.message,
            recipientIds,
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [inChatCallRoom, setInChatCallRoom] = useState<string | null>(null);
  const [inChatCallType, setInChatCallType] = useState<'AUDIO' | 'VIDEO'>('VIDEO');

  const handleStartInChatCall = async (type: 'AUDIO' | 'VIDEO') => {
    if (!activeConv) return;
    const recipient = activeConv.members?.find((m: any) => m.userId !== user?.id);
    if (!recipient) return;
    if (blockedUserIds.includes(recipient.userId)) {
      setChatAlert('Невозможно позвонить заблокированному пользователю.');
      return;
    }
    const roomId = `call_${activeConv.id}_${Date.now()}`;

    try {
      if (recipient?.userId) {
        await fetch('/api/calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverId: recipient.userId,
            roomId,
            type,
          }),
        });

        if (socket) {
          socket.emit('call:initiate', {
            callerId: user?.id,
            callerName: user?.profile?.name || user?.email?.split('@')[0] || 'Peer Developer',
            callerAvatar: user?.profile?.avatar,
            receiverId: recipient.userId,
            roomId,
            type,
          });
        }
      }
    } catch (err) {
      console.error(err);
    }

    setInChatCallType(type);
    setInChatCallRoom(roomId);
  };

  const handleInitiateCall = async (type: 'AUDIO' | 'VIDEO') => {
    if (!activeConv) return;
    const recipient = activeConv.members?.find((m: any) => m.userId !== user?.id);
    if (!recipient) return;
    if (blockedUserIds.includes(recipient.userId)) {
      setChatAlert('Невозможно позвонить заблокированному пользователю.');
      return;
    }
    const roomId = `call_${activeConv.id}_${Date.now()}`;

    try {
      await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: recipient?.userId,
          roomId,
          type,
        }),
      });

      // Cross-device cloud signaling for Vercel
      await fetch('/api/calls/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initiate',
          roomId,
          callerId: user?.id,
          callerName: user?.profile?.name || user?.email?.split('@')[0] || 'Инженер',
          callerAvatar: user?.profile?.avatar,
          receiverId: recipient?.userId,
          type,
        }),
      });

      if (socket) {
        socket.emit('call:initiate', {
          callerId: user?.id,
          callerName: user?.profile?.name || user?.email?.split('@')[0] || 'Инженер',
          callerAvatar: user?.profile?.avatar,
          receiverId: recipient?.userId,
          roomId,
          type,
        });
      }

      router.push(`/calls/${roomId}?type=${type}`);
    } catch (err) {
      console.error(err);
    }
  };

  const addReaction = (messageId: string, emoji: string) => {
    if (socket && activeConv) {
      socket.emit('chat:reaction', {
        conversationId: activeConv.id,
        messageId,
        userId: user?.id,
        emoji,
      });
    }
  };

  const otherMember = activeConv?.members?.find((m: any) => m.userId !== user?.id)?.user;
  const isPeerOnline = otherMember ? onlineUsers.has(otherMember.id) : false;

  const filteredConversations = conversations.filter((c) => {
    const peer = c.members?.find((m: any) => m.userId !== user?.id)?.user;
    const name = peer?.profile?.name || c.title || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-8.5rem)] flex rounded-2xl border border-white/[0.08] bg-[#0c0c10] overflow-hidden">
      {/* Left Pane: Conversations List */}
      <div className="w-80 md:w-96 border-r border-white/[0.08] flex flex-col shrink-0 bg-[#09090b]">
        {/* Header & Search */}
        <div className="p-4 border-b border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold text-white tracking-tight">Chats</span>
            <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              WebSocket Realtime
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#141418] border border-white/[0.08] focus:border-blue-500/50 rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none font-sans"
            />
          </div>
        </div>

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-zinc-500">
              No conversations found. Connect with peers from Discover or Matches to start exchanging!
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const peer = conv.members?.find((m: any) => m.userId !== user?.id)?.user;
              const isSelected = activeConv?.id === conv.id;
              const online = peer ? onlineUsers.has(peer.id) : false;
              const lastMsg = conv.messages?.[0];

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${
                    isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="relative shrink-0">
                    <Identicon name={peer?.profile?.name || conv.title || 'peer'} size={38} />
                    {online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#09090b]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-white tracking-tight truncate">
                        {peer?.profile?.name || conv.title || 'Tech Peer'}
                      </div>
                      {lastMsg && (
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-zinc-400 truncate mt-0.5 leading-snug">
                      {lastMsg ? lastMsg.content : 'Started an exchange conversation'}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Active Chat Room */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#0c0c10]">
          {/* Header */}
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#111114]">
            <Link
              href={otherMember ? `/profile?userId=${otherMember.id}` : '/profile'}
              className="flex items-center gap-3 min-w-0 group hover:opacity-90 transition-opacity"
              title="Перейти в личный кабинет собеседника"
            >
              <div className="relative">
                <Identicon name={otherMember?.profile?.name || 'peer'} size={36} />
                {isPeerOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#111114]" />
                )}
              </div>

              <div className="min-w-0">
                <div className="text-xs font-semibold text-white tracking-tight truncate group-hover:text-blue-400 transition-colors">
                  {otherMember?.profile?.name || otherMember?.email?.split('@')[0] || 'Tech Peer'}
                </div>
                <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1.5">
                  <span className={isPeerOnline ? 'text-emerald-400' : 'text-zinc-500'}>
                    {isPeerOnline ? 'Online now' : 'Offline'}
                  </span>
                  <span>•</span>
                  <span>{otherMember?.profile?.timezone || 'UTC+0'}</span>
                </div>
              </div>
            </Link>

            {/* Real WebRTC Call Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStartInChatCall('AUDIO')}
                title="Аудиосозвон прямо в чате"
                className="p-2 rounded-xl bg-[#18181f] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/[0.08] tap-active transition-all"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                onClick={() => handleStartInChatCall('VIDEO')}
                title="Видеосозвон и шеринг экрана прямо в чате"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold tap-active transition-all shadow-md shadow-blue-600/20"
              >
                <Video className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Созвон в чате</span>
              </button>

              <button
                onClick={() => handleInitiateCall('VIDEO')}
                title="Открыть в отдельной комнате на весь экран"
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] tap-active transition-all hidden sm:flex"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                onClick={() => otherMember?.id && handleToggleBlock(otherMember.id)}
                title={otherMember && blockedUserIds.includes(otherMember.id) ? "Разблокировать собеседника" : "Заблокировать собеседника"}
                className={`p-2 rounded-xl border transition-all ${
                  otherMember && blockedUserIds.includes(otherMember.id)
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-white/[0.04] hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border-white/[0.08]'
                }`}
              >
                <Ban className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Alert Banner */}
          {chatAlert && (
            <div className="p-3 bg-blue-500/10 border-b border-blue-500/20 flex items-center justify-between px-6 text-xs font-mono text-zinc-200">
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{chatAlert}</span>
              </span>
              <button onClick={() => setChatAlert(null)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Blocked Partner Banner */}
          {otherMember && blockedUserIds.includes(otherMember.id) && (
            <div className="p-3 bg-red-950/40 border-b border-red-500/30 flex items-center justify-between px-6 text-xs font-mono text-red-300">
              <span className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-400 shrink-0" />
                <span>Пользователь заблокирован. Звонки и отправка сообщений отключены.</span>
              </span>
              <button
                onClick={() => handleToggleBlock(otherMember.id)}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-[11px]"
              >
                Разблокировать
              </button>
            </div>
          )}

          {/* In-Chat WebRTC Call Window (Embedded directly above messages) */}
          {inChatCallRoom && (
            <InChatCall
              roomId={inChatCallRoom}
              activeConvId={activeConv.id}
              otherMember={otherMember}
              currentUser={user}
              socket={socket}
              initialType={inChatCallType}
              onClose={() => setInChatCallRoom(null)}
            />
          )}

          {/* Messages Timeline */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              const isMine = msg.senderId === user?.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-end gap-2 max-w-[85%] md:max-w-[70%]">
                    {!isMine && (
                      <Link href={`/profile?userId=${msg.senderId}`} title="Перейти в личный кабинет">
                        <Identicon name={msg.sender?.profile?.name || 'peer'} size={24} className="mb-1 hover:ring-1 hover:ring-blue-400 rounded-full transition-all" />
                      </Link>
                    )}

                    <div className="space-y-1">
                      {/* Message Content Bubble */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isMine
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-[#18181f] text-zinc-100 rounded-bl-xs border border-white/[0.08]'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Footer: Time & Reactions */}
                      <div className={`flex items-center gap-2 px-1 text-[10px] font-mono text-zinc-500 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMine && <CheckCheck className="w-3 h-3 text-blue-400" />}

                        {/* Reaction emojis button on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          {['👍', '🎯', '💡', '❤️'].map((em) => (
                            <button
                              key={em}
                              onClick={() => addReaction(msg.id, em)}
                              className="hover:scale-125 transition-transform text-xs"
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Attached Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex gap-1 pt-0.5">
                          {msg.reactions.map((r: any, rIdx: number) => (
                            <span
                              key={r.id || rIdx}
                              className="px-1.5 py-0.5 rounded-full bg-white/[0.08] text-[10px]"
                            >
                              {r.emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Peer Typing Indicator */}
            {peerTyping && (
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 italic animate-pulse">
                <span>{peerTyping} is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <div className="p-3 md:p-4 border-t border-white/[0.08] bg-[#111114]">
            {otherMember && blockedUserIds.includes(otherMember.id) ? (
              <div className="py-2.5 text-center text-xs font-mono text-zinc-500">
                Диалог заблокирован. Разблокируйте пользователя, чтобы возобновить отправку сообщений.
              </div>
            ) : (
              <>
                {replyTo && (
                  <div className="flex items-center justify-between pb-2 text-xs font-mono text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Reply className="w-3 h-3 text-blue-400" />
                      Replying to: {replyTo.content.substring(0, 30)}...
                    </span>
                    <button onClick={() => setReplyTo(null)} className="text-zinc-500 hover:text-white">
                      Cancel
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleInputChange}
                      placeholder={`Message ${otherMember?.profile?.name || 'peer'}...`}
                      className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-full pl-4 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 outline-none font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className={`p-2.5 rounded-full transition-all tap-active ${
                      newMessage.trim()
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-xs font-mono text-zinc-500">
          Select a conversation from the left to start real-time messaging.
        </div>
      )}
    </div>
  );
}
