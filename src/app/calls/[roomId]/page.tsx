'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  PhoneOff,
  MessageSquare,
  Users,
  Hand,
  Settings,
  Star,
  CheckCircle2,
  Send,
  X,
  Shield,
  Volume2,
} from 'lucide-react';
import Identicon from '@/components/ui/Identicon';

export default function CallRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const searchParams = useSearchParams();
  const callType = searchParams.get('type') || 'VIDEO';
  const customTitle = searchParams.get('title');

  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();

  // Media states
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(callType === 'AUDIO');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [hasCamPermission, setHasCamPermission] = useState(true);

  // Call room & participants
  const [callDuration, setCallDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  // In-call chat
  const [callMessages, setCallMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Post-session review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [clarityScore, setClarityScore] = useState(5);
  const [understandScore, setUnderstandScore] = useState(5);
  const [wouldStudyAgain, setWouldStudyAgain] = useState(true);
  const [reviewComment, setReviewComment] = useState('');

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);

  // Setup Local Media Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initMedia() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: callType !== 'AUDIO',
            audio: true,
          });
          setMediaStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          const vTrack = stream.getVideoTracks()[0];
          if (vTrack) cameraTrackRef.current = vTrack;
        }
      } catch (err) {
        console.warn('Camera/Mic permission denied or not found; using mock peer stream:', err);
        setHasCamPermission(false);
      }
    }

    initMedia();

    // Call duration timer
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [callType]);

  // Socket signaling setup
  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('call:join_room', {
      roomId,
      userId: user?.id,
      userName: user?.profile?.name || 'Peer Developer',
    });

    // Populate initial demo participants
    setParticipants([
      { id: user?.id, name: `${user?.profile?.name || 'You'} (Host)`, role: 'HOST', isMuted: isMicMuted },
      { id: 'peer_partner', name: 'Amina Al-Mansoor', role: 'PEER', isMuted: false, avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop' },
    ]);

    socket.on('call:peer_joined', ({ userId, userName }: any) => {
      setParticipants((prev) => [
        ...prev.filter((p) => p.id !== userId),
        { id: userId, name: userName, role: 'PARTICIPANT', isMuted: false },
      ]);
    });

    socket.on('call:screen_share_status', ({ isSharing, userId }: any) => {
      // Screen shared by peer
    });

    socket.on('call:hand_raised', ({ userName }: any) => {
      setCallMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), sender: 'System', text: `✋ ${userName} raised their hand` },
      ]);
    });

    socket.on('call:moderated', ({ targetUserId, action }: any) => {
      if (targetUserId === user?.id) {
        if (action === 'mute') setIsMicMuted(true);
        if (action === 'disable-cam') setIsCamOff(true);
      }
    });

    return () => {
      socket.emit('call:leave', { roomId });
      socket.off('call:peer_joined');
      socket.off('call:screen_share_status');
      socket.off('call:hand_raised');
      socket.off('call:moderated');
    };
  }, [socket, roomId, user, isMicMuted]);

  // Toggle Microphone
  const toggleMic = () => {
    if (mediaStream) {
      const aTrack = mediaStream.getAudioTracks()[0];
      if (aTrack) {
        aTrack.enabled = !aTrack.enabled;
        setIsMicMuted(!aTrack.enabled);
      } else {
        setIsMicMuted(!isMicMuted);
      }
    } else {
      setIsMicMuted(!isMicMuted);
    }
  };

  // Toggle Camera
  const toggleCam = () => {
    if (mediaStream) {
      const vTrack = mediaStream.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = !vTrack.enabled;
        setIsCamOff(!vTrack.enabled);
      } else {
        setIsCamOff(!isCamOff);
      }
    } else {
      setIsCamOff(!isCamOff);
    }
  };

  // Real Screen Sharing (Requirement 13)
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share and revert to camera
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      if (cameraTrackRef.current && localVideoRef.current) {
        const camStream = new MediaStream([cameraTrackRef.current]);
        localVideoRef.current.srcObject = camStream;
      }
      setIsScreenSharing(false);
      socket?.emit('call:screen_share', { roomId, isSharing: false, userId: user?.id });
    } else {
      // Start screen capture
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const screenTrack = displayStream.getVideoTracks()[0];
          screenTrackRef.current = screenTrack;

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = displayStream;
          }

          screenTrack.onended = () => {
            setIsScreenSharing(false);
            if (cameraTrackRef.current && localVideoRef.current) {
              localVideoRef.current.srcObject = new MediaStream([cameraTrackRef.current]);
            }
            socket?.emit('call:screen_share', { roomId, isSharing: false, userId: user?.id });
          };

          setIsScreenSharing(true);
          socket?.emit('call:screen_share', { roomId, isSharing: true, userId: user?.id });
        } else {
          setIsScreenSharing(true);
        }
      } catch (err) {
        console.warn('Screen share cancelled or unsupported:', err);
      }
    }
  };

  const handleRaiseHand = () => {
    setHandRaised(!handRaised);
    socket?.emit('call:raise_hand', {
      roomId,
      userId: user?.id,
      userName: user?.profile?.name || 'Alex',
    });
  };

  const handleHostControl = (targetUserId: string, action: string) => {
    socket?.emit('call:host_control', { roomId, targetUserId, action });
    if (action === 'kick') {
      setParticipants((prev) => prev.filter((p) => p.id !== targetUserId));
    }
  };

  const handleSendInCallChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setCallMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: user?.profile?.name || 'You',
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatInput('');
  };

  const handleLeaveCall = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }
    setShowReviewModal(true);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: roomId,
          revieweeId: participants[1]?.id || 'peer_partner',
          rating,
          clarityScore,
          understandScore,
          wouldStudyAgain,
          comment: reviewComment,
        }),
      });
    } catch (err) {
      console.error(err);
    }
    router.push('/dashboard');
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col select-none">
      {/* Top Header Bar */}
      <div className="h-14 px-6 border-b border-white/[0.08] flex items-center justify-between bg-[#0e0e12]">
        <div className="flex items-center gap-3">
          <div className="font-mono text-sm font-bold text-white tracking-tight">
            {customTitle || 'Live WebRTC Call Session'}
          </div>
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Room: {roomId.substring(0, 14)}
          </span>
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {formatSeconds(callDuration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isScreenSharing && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse">
              Sharing Screen Active
            </span>
          )}
          <span className="text-xs font-mono text-zinc-400">
            {participants.length} Active Peers
          </span>
        </div>
      </div>

      {/* Main Video Arena & Side Drawer */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Main Stage Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
          {/* Peer 1: Local User Video */}
          <div className="relative rounded-2xl overflow-hidden bg-[#121217] border border-white/[0.08] flex items-center justify-center">
            {isCamOff ? (
              <div className="text-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-zinc-800 border border-white/10 mx-auto flex items-center justify-center font-mono text-2xl font-bold text-blue-400">
                  {user?.profile?.name?.charAt(0) || 'A'}
                </div>
                <div className="font-mono text-xs text-zinc-400">
                  {user?.profile?.name || 'You'} (Camera Off)
                </div>
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}

            {/* Video Label Overlay */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono text-white">
              <span>{user?.profile?.name || 'You'} (Local)</span>
              {isMicMuted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
              {isScreenSharing && <Monitor className="w-3.5 h-3.5 text-blue-400" />}
            </div>
          </div>

          {/* Peer 2: Remote Peer Video */}
          <div className="relative rounded-2xl overflow-hidden bg-[#121217] border border-white/[0.08] flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-[#121217]">
              <div className="text-center space-y-3">
                <div className="mx-auto flex justify-center">
                  <Identicon name="Amina Al-Mansoor" size={84} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Amina Al-Mansoor</div>
                  <div className="text-xs font-mono text-zinc-400">English & LLMs • Peer Stream</div>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce" />
                  <span className="w-1 h-5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-1 h-4 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono text-white">
              <span>Amina Al-Mansoor</span>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* In-Call Chat / Participants Drawer */}
        {(showChat || showParticipants) && (
          <div className="w-80 border border-white/[0.08] rounded-2xl bg-[#0e0e12] flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-white">
                {showChat ? 'In-Call Chat' : 'Participants'}
              </span>
              <button
                onClick={() => {
                  setShowChat(false);
                  setShowParticipants(false);
                }}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {showChat ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs font-mono">
                  {callMessages.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-[11px]">
                      Share code snippets, links and notes here during your call.
                    </div>
                  ) : (
                    callMessages.map((m) => (
                      <div key={m.id} className="p-2 rounded bg-white/[0.03]">
                        <div className="text-[10px] text-zinc-400 font-semibold">{m.sender}</div>
                        <div className="text-zinc-200 mt-0.5">{m.text}</div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendInCallChat} className="p-3 border-t border-white/[0.08] flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type code or message..."
                    className="flex-1 bg-[#18181f] border border-white/[0.08] rounded-full px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <button type="submit" className="p-2 rounded-full bg-blue-600 text-white">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs font-mono">
                {participants.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-lg bg-white/[0.02] flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">{p.name}</div>
                      <div className="text-[10px] text-zinc-500">{p.role}</div>
                    </div>
                    {p.id !== user?.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleHostControl(p.id, 'mute')}
                          title="Host Mute"
                          className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white"
                        >
                          <MicOff className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleHostControl(p.id, 'kick')}
                          title="Remove from room"
                          className="p-1 rounded bg-red-950/40 text-red-400 hover:bg-red-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Call Controls (Requirement 13: [🎤] [📹] [🖥 Share Screen] [💬 Chat] [🔴 Leave]) */}
      <div className="h-20 border-t border-white/[0.08] bg-[#0c0c10] px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`p-3 rounded-full border transition-all ${
              showParticipants
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-[#18181f] text-zinc-400 hover:text-white border-white/[0.08]'
            }`}
          >
            <Users className="w-4 h-4" />
          </button>

          <button
            onClick={handleRaiseHand}
            title="Raise Hand"
            className={`p-3 rounded-full border transition-all ${
              handRaised
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                : 'bg-[#18181f] text-zinc-400 hover:text-white border-white/[0.08]'
            }`}
          >
            <Hand className="w-4 h-4" />
          </button>
        </div>

        {/* Center Main WebRTC Actions */}
        <div className="flex items-center gap-3">
          {/* Mute Mic */}
          <button
            onClick={toggleMic}
            className={`p-3.5 rounded-full border tap-active transition-all ${
              isMicMuted
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-[#18181f] border-white/[0.1] text-white hover:bg-zinc-800'
            }`}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Camera */}
          <button
            onClick={toggleCam}
            className={`p-3.5 rounded-full border tap-active transition-all ${
              isCamOff
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-[#18181f] border-white/[0.1] text-white hover:bg-zinc-800'
            }`}
          >
            {isCamOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </button>

          {/* Share Screen (Requirement 13) */}
          <button
            onClick={toggleScreenShare}
            className={`flex items-center gap-2 px-5 py-3 rounded-full font-mono text-xs font-semibold tap-active transition-all border ${
              isScreenSharing
                ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/30'
                : 'bg-[#18181f] border-white/[0.1] text-zinc-200 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>{isScreenSharing ? 'Stop Demonstration' : 'Share Screen'}</span>
          </button>

          {/* In-Call Chat */}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-3.5 rounded-full border tap-active transition-all ${
              showChat
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-[#18181f] border-white/[0.1] text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* Leave Call (Red Button) */}
          <button
            onClick={handleLeaveCall}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-semibold tap-active transition-all shadow-lg shadow-red-600/30"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave Call</span>
          </button>
        </div>

        <div className="w-20" />
      </div>

      {/* Post-Session Review & Rating Modal (Requirement 30) */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121217] border border-white/[0.12] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Rate Knowledge Session
              </h3>
              <p className="text-xs font-mono text-zinc-400">
                How was your exchange session with Amina?
              </p>
            </div>

            <form onSubmit={submitReview} className="space-y-4">
              {/* Star Rating */}
              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1 text-2xl transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        s <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Requirement 30: Questions */}
              <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-white/[0.04] text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Was the explanation clear?</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setClarityScore(c)}
                        className={`w-6 h-6 rounded text-[11px] font-mono ${
                          clarityScore === c ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Did you understand the topic?</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnderstandScore(u)}
                        className={`w-6 h-6 rounded text-[11px] font-mono ${
                          understandScore === u ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-300">Would you study with this peer again?</span>
                  <div className="flex gap-2 font-mono text-[11px]">
                    <button
                      type="button"
                      onClick={() => setWouldStudyAgain(true)}
                      className={`px-2.5 py-1 rounded ${
                        wouldStudyAgain ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setWouldStudyAgain(false)}
                      className={`px-2.5 py-1 rounded ${
                        !wouldStudyAgain ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Leave public feedback for their profile..."
                  className="w-full bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-lg p-2.5 text-xs text-white outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold tap-active transition-all"
              >
                Submit Feedback & Return to Dashboard
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
