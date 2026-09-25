'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import {
  Users,
  MessageSquare,
  HelpCircle,
  ThumbsUp,
  Circle,
  Pin,
  Send,
  Sparkles,
  Award,
  Video,
  Mic,
  Monitor,
  CheckCircle2,
  X,
  Volume2,
} from 'lucide-react';

export default function SeminarLivePage() {
  const params = useParams();
  const seminarId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [seminar, setSeminar] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'qa'>('chat');
  const [attendeeCount, setAttendeeCount] = useState(347);
  const [attendanceMinutes, setAttendanceMinutes] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  // Live Chat
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [pinnedMessage, setPinnedMessage] = useState<any>(null);

  // Q&A
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestionInput, setNewQuestionInput] = useState('');

  // Floating reactions
  const [floatingReactions, setFloatingReactions] = useState<any[]>([]);

  // Host presentation controls
  const [isHostScreenSharing, setIsHostScreenSharing] = useState(false);
  const videoScreenRef = useRef<HTMLVideoElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isHost = seminar?.hostId === user?.id || user?.role === 'ADMIN';

  useEffect(() => {
    async function loadSeminarData() {
      try {
        const [semRes, msgRes, qRes] = await Promise.all([
          fetch(`/api/seminars/${seminarId}`),
          fetch(`/api/seminars/${seminarId}/messages`),
          fetch(`/api/seminars/${seminarId}/questions`),
        ]);

        if (semRes.ok) {
          const s = await semRes.json();
          setSeminar(s.seminar);
          setAttendeeCount(s.seminar?.participantCount || 347);
        }
        if (msgRes.ok) {
          const m = await msgRes.json();
          const msgs = m.messages || [];
          setMessages(msgs);
          const pinned = msgs.find((x: any) => x.isPinned);
          if (pinned) setPinnedMessage(pinned);
        }
        if (qRes.ok) {
          const q = await qRes.json();
          setQuestions(q.questions || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadSeminarData();

    // Attendance counter
    const attTimer = setInterval(() => {
      setAttendanceMinutes((prev) => {
        const next = prev + 1;
        if (next === 45) {
          setShowCertificate(true);
        }
        return next;
      });
    }, 1000 * 60);

    return () => clearInterval(attTimer);
  }, [seminarId, user]);

  // Socket Live Stage Integration
  useEffect(() => {
    if (!socket || !seminarId) return;

    socket.emit('seminar:join', {
      seminarId,
      userId: user?.id,
      userName: user?.profile?.name || 'Attendee',
      role: isHost ? 'HOST' : 'ATTENDEE',
    });

    socket.on('seminar:count_update', ({ count }: any) => {
      setAttendeeCount((prev) => Math.max(prev, count));
    });

    socket.on('seminar:new_message', (msg: any) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.isPinned) setPinnedMessage(msg);
    });

    socket.on('seminar:new_question', (q: any) => {
      setQuestions((prev) => [q, ...prev]);
    });

    socket.on('seminar:question_upvoted', ({ questionId, upvotes }: any) => {
      setQuestions((prev) =>
        prev
          .map((q) => (q.id === questionId ? { ...q, upvotes } : q))
          .sort((a, b) => (b.isAnsweringNow ? 1 : 0) - (a.isAnsweringNow ? 1 : 0) || b.upvotes - a.upvotes)
      );
    });

    socket.on('seminar:answering_status', ({ questionId }: any) => {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, isAnsweringNow: !q.isAnsweringNow } : q
        )
      );
    });

    socket.on('seminar:floating_reaction', (reaction: any) => {
      setFloatingReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 2500);
    });

    socket.on('seminar:recording_status', ({ isRecording }: any) => {
      setIsRecording(isRecording);
    });

    return () => {
      socket.emit('seminar:leave', { seminarId });
      socket.off('seminar:count_update');
      socket.off('seminar:new_message');
      socket.off('seminar:new_question');
      socket.off('seminar:question_upvoted');
      socket.off('seminar:answering_status');
      socket.off('seminar:floating_reaction');
      socket.off('seminar:recording_status');
    };
  }, [socket, seminarId, user, isHost]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const content = chatInput.trim();
    setChatInput('');

    try {
      const res = await fetch(`/api/seminars/${seminarId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          isModerator: isHost,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        socket?.emit('seminar:message', {
          seminarId,
          message: data.message,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionInput.trim()) return;

    const qText = newQuestionInput.trim();
    setNewQuestionInput('');

    try {
      const res = await fetch(`/api/seminars/${seminarId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: qText }),
      });

      if (res.ok) {
        const data = await res.json();
        socket?.emit('seminar:question', {
          seminarId,
          question: data.question,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpvoteQuestion = async (qId: string) => {
    try {
      const res = await fetch(`/api/seminars/${seminarId}/questions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: qId, action: 'upvote' }),
      });

      if (res.ok) {
        const data = await res.json();
        socket?.emit('seminar:question_upvote', {
          seminarId,
          questionId: qId,
          upvotes: data.question?.upvotes,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAnswering = async (qId: string) => {
    try {
      const res = await fetch(`/api/seminars/${seminarId}/questions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: qId, action: 'toggle_answering' }),
      });

      if (res.ok) {
        socket?.emit('seminar:answering_now', { seminarId, questionId: qId });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendReaction = (emoji: string) => {
    socket?.emit('seminar:reaction', {
      seminarId,
      emoji,
      userName: user?.profile?.name || 'Peer',
    });
  };

  const toggleRecording = () => {
    const next = !isRecording;
    setIsRecording(next);
    socket?.emit('seminar:recording_toggle', { seminarId, isRecording: next });
  };

  const toggleHostScreenShare = async () => {
    if (isHostScreenSharing) {
      setIsHostScreenSharing(false);
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          if (videoScreenRef.current) {
            videoScreenRef.current.srcObject = screenStream;
          }
          setIsHostScreenSharing(true);
          screenStream.getVideoTracks()[0].onended = () => {
            setIsHostScreenSharing(false);
          };
        } else {
          setIsHostScreenSharing(true);
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col select-none overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 px-6 border-b border-white/[0.08] flex items-center justify-between bg-[#0e0e12]">
        <div className="flex items-center gap-3">
          <div className="font-mono text-sm font-bold text-white tracking-tight truncate max-w-md">
            {seminar?.title || 'Technical Masterclass'}
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold animate-pulse flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            LIVE SFU STAGE
          </span>
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.08] flex items-center gap-1 shrink-0">
            <Users className="w-3 h-3" />
            {attendeeCount} Watching
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Attendance Tracker (Requirement 22) */}
          <div className="font-mono text-xs text-zinc-400 flex items-center gap-1.5">
            <span>Attendance:</span>
            <span className="text-emerald-400 font-semibold">{attendanceMinutes} min</span>
            {attendanceMinutes >= 45 && (
              <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                🏆 Completed
              </span>
            )}
          </div>

          {/* Recording Toggle (Requirement 20) */}
          {isHost && (
            <button
              onClick={toggleRecording}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-medium border transition-all ${
                isRecording
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                  : 'bg-zinc-800 text-zinc-300 hover:text-white border-white/[0.08]'
              }`}
            >
              <Circle className="w-3 h-3 fill-current" />
              <span>{isRecording ? 'Recording to S3...' : 'Start Recording'}</span>
            </button>
          )}

          <button
            onClick={() => router.push('/seminars')}
            className="px-3.5 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs tap-active transition-all"
          >
            Leave Stage
          </button>
        </div>
      </div>

      {/* Main Broadcast Stage Arena + Right Interaction Panel */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left: Stage Stream Display */}
        <div className="flex-1 rounded-2xl bg-[#0e0e12] border border-white/[0.08] flex flex-col relative overflow-hidden">
          {/* Main Stage Video */}
          <div className="flex-1 relative flex items-center justify-center bg-black/60">
            {isHostScreenSharing ? (
              <video
                ref={videoScreenRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-gradient-to-b from-[#14141a] to-[#09090b]">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500/40 shadow-xl shadow-blue-500/20">
                  <img
                    src={seminar?.host?.profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop'}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-bold text-white tracking-tight">
                    {seminar?.host?.profile?.name || 'Alex Voronov'}
                  </div>
                  <div className="text-xs font-mono text-blue-400">
                    Host Presenter • Live Broadcast Feed
                  </div>
                </div>
                <div className="max-w-md text-xs text-zinc-400 leading-relaxed font-mono bg-black/40 p-3 rounded-xl border border-white/[0.04]">
                  Broadcasting live slide presentation & code demonstrations via LiveKit SFU.
                </div>
              </div>
            )}

            {/* Floating Reactions Overlay (Requirement 17: reactions) */}
            <div className="absolute bottom-8 right-8 pointer-events-none flex flex-col gap-2">
              {floatingReactions.map((r) => (
                <div
                  key={r.id}
                  className="text-3xl animate-in fade-in slide-in-from-bottom-8 duration-700 font-bold"
                >
                  {r.emoji}
                </div>
              ))}
            </div>

            {/* Host Presentation Controls */}
            {isHost && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 backdrop-blur-md p-1.5 rounded-full border border-white/10 text-xs font-mono">
                <button
                  onClick={toggleHostScreenShare}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
                    isHostScreenSharing ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>{isHostScreenSharing ? 'Stop Screen Stream' : 'Share Presentation Screen'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Floating Bar of Emojis for Audience */}
          <div className="h-14 border-t border-white/[0.08] px-6 flex items-center justify-between bg-[#111114]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500 mr-2">React Live:</span>
              {['🔥', '👏', '🚀', '💡', '❤️'].map((em) => (
                <button
                  key={em}
                  onClick={() => sendReaction(em)}
                  className="px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-sm tap-active transition-transform hover:scale-125"
                >
                  {em}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
              <span>Bitrate: 3400 kbps</span>
              <span>•</span>
              <span className="text-emerald-400">Latency: 28ms</span>
            </div>
          </div>
        </div>

        {/* Right: Live Chat & Q&A Panel (Requirement 18 & 19) */}
        <div className="w-96 rounded-2xl bg-[#0e0e12] border border-white/[0.08] flex flex-col shrink-0 overflow-hidden">
          {/* Panel Tab Switcher */}
          <div className="flex border-b border-white/[0.08] bg-[#111114]">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-xs font-mono font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-400 bg-white/[0.02]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('qa')}
              className={`flex-1 py-3 text-xs font-mono font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                activeTab === 'qa'
                  ? 'border-blue-500 text-blue-400 bg-white/[0.02]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Q&A ({questions.length})</span>
            </button>
          </div>

          {/* Tab 1: Live Chat */}
          {activeTab === 'chat' ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Pinned Moderator Message Banner (Requirement 18) */}
              {pinnedMessage && (
                <div className="p-3 bg-blue-950/30 border-b border-blue-500/20 text-xs font-mono flex items-start gap-2 text-blue-200">
                  <Pin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <span className="font-bold text-blue-400">Pinned: </span>
                    {pinnedMessage.content}
                  </div>
                </div>
              )}

              {/* Messages Timeline */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="text-xs font-mono space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-200">
                        {m.user?.profile?.name || 'Peer'}
                      </span>
                      {m.isModerator && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Host
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-600">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-zinc-300 leading-relaxed font-sans">{m.content}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-white/[0.08] flex gap-2 bg-[#111114]">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Send message to room..."
                  className="flex-1 bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-full px-4 py-2 text-xs text-white outline-none font-sans"
                />
                <button type="submit" className="p-2 rounded-full bg-blue-600 text-white tap-active">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          ) : (
            /* Tab 2: Q&A Panel (Requirement 19) */
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className={`p-3 rounded-xl border space-y-2 transition-all ${
                      q.isAnsweringNow
                        ? 'bg-blue-950/30 border-blue-500/40 ring-1 ring-blue-500/20'
                        : 'bg-[#141418] border-white/[0.06]'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400 font-semibold">{q.user?.profile?.name || 'Attendee'}</span>
                      {q.isAnsweringNow ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500 text-white font-bold animate-pulse">
                          Answering now 🎙️
                        </span>
                      ) : q.isAnswered ? (
                        <span className="text-[10px] text-emerald-400">Answered ✓</span>
                      ) : null}
                    </div>

                    <div className="text-xs text-zinc-200 leading-relaxed font-sans">{q.question}</div>

                    {/* Upvote & Host Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-xs font-mono">
                      <button
                        onClick={() => handleUpvoteQuestion(q.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 tap-active transition-all"
                      >
                        <ThumbsUp className="w-3 h-3 text-blue-400" />
                        <span>{q.upvotes}</span>
                      </button>

                      {isHost && (
                        <button
                          onClick={() => handleToggleAnswering(q.id)}
                          className="text-[10px] text-blue-400 hover:underline"
                        >
                          {q.isAnsweringNow ? 'Stop Answering' : 'Answer Now'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ask Question Form */}
              <form onSubmit={handlePostQuestion} className="p-3 border-t border-white/[0.08] flex gap-2 bg-[#111114]">
                <input
                  type="text"
                  value={newQuestionInput}
                  onChange={(e) => setNewQuestionInput(e.target.value)}
                  placeholder="Ask a question for the host..."
                  className="flex-1 bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-full px-4 py-2 text-xs text-white outline-none font-sans"
                />
                <button type="submit" className="px-3 py-1.5 rounded-full bg-blue-600 text-white font-mono text-xs">
                  Ask
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Attendance & Completion Certificate Modal (Requirement 22) */}
      {showCertificate && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121217] border border-blue-500/40 rounded-2xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/40 mx-auto flex items-center justify-center">
              <Award className="w-8 h-8 text-blue-400" />
            </div>

            <div className="space-y-1">
              <div className="font-mono text-xs uppercase tracking-widest text-blue-400">
                🏆 Seminar Attendance Completed
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Certificate of Completion
              </h3>
              <p className="text-xs text-zinc-400">
                You attended over 45 minutes of &quot;{seminar?.title}&quot;.
              </p>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/[0.06] text-xs font-mono text-zinc-300 space-y-1 text-left">
              <div>Recipient: {user?.profile?.name || 'Alex Voronov'}</div>
              <div>Duration: {attendanceMinutes} Minutes Verified</div>
              <div>Host: {seminar?.host?.profile?.name || 'Senior Lead'}</div>
              <div>Credential ID: XCH-CERT-{seminarId.substring(0, 8).toUpperCase()}</div>
            </div>

            <button
              onClick={() => setShowCertificate(false)}
              className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold tap-active transition-all"
            >
              Add to Profile Achievements
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
