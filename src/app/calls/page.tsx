'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Video, Phone, Users, Plus, ArrowRight, Shield, Mic, Monitor } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function CallsOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [customRoom, setCustomRoom] = useState('');

  const groupSessions = [
    {
      id: 'group_python_basics',
      title: 'Python Concurrency & AsyncIO Deep Dive',
      host: 'Alex Voronov',
      participants: 12,
      max: 20,
      status: 'ACTIVE',
      category: 'CODING',
    },
    {
      id: 'group_rust_wasm',
      title: 'Rust & WebAssembly Architecture Lab',
      host: 'Daniel Richter',
      participants: 8,
      max: 15,
      status: 'ACTIVE',
      category: 'SYSTEMS',
    },
    {
      id: 'group_davinci_color',
      title: 'Commercial Color Grading in DaVinci 19',
      host: 'Marcus Brody',
      participants: 14,
      max: 20,
      status: 'ACTIVE',
      category: 'VIDEO',
    },
  ];

  const handleStartInstantCall = () => {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    router.push(`/calls/${roomId}`);
  };

  const handleJoinCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customRoom.trim()) {
      router.push(`/calls/${customRoom.trim()}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs mb-2">
            <Video className="w-3.5 h-3.5" />
            WebRTC P2P & Group Media Rooms
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Audio / Video Calls & Screen Sharing
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Zero third-party redirect. Ultra low-latency WebRTC streams directly inside your browser.
          </p>
        </div>

        <button
          onClick={handleStartInstantCall}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold tap-active transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Call Room</span>
        </button>
      </div>

      {/* Quick Join By Room ID */}
      <div className="drinkit-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white">Have a Room ID or Meeting Link?</div>
          <div className="text-xs font-mono text-zinc-400 mt-0.5">
            Enter the room code to connect to your peer’s live video stream.
          </div>
        </div>

        <form onSubmit={handleJoinCustom} className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={customRoom}
            onChange={(e) => setCustomRoom(e.target.value)}
            placeholder="e.g. room_12345"
            className="bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-full px-4 py-2 text-xs text-white outline-none font-mono w-full sm:w-64"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-mono font-medium tap-active transition-all shrink-0"
          >
            Join Room
          </button>
        </form>
      </div>

      {/* Active Group Practice Rooms (Requirement 14) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Active Group Practice Rooms
            </h2>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Interactive Peer Labs
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {groupSessions.map((grp) => (
            <div
              key={grp.id}
              className="drinkit-card p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
                    {grp.category}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white tracking-tight">{grp.title}</h3>

                <div className="space-y-1.5 text-xs font-mono text-zinc-400 bg-black/40 p-3 rounded-lg border border-white/[0.04]">
                  <div>Host: <span className="text-zinc-200">{grp.host}</span></div>
                  <div>Participants: <span className="text-blue-400 font-bold">{grp.participants} / {grp.max}</span></div>
                  <div className="text-[10px] text-zinc-500">Screen share & live coding enabled</div>
                </div>
              </div>

              <Link
                href={`/calls/${grp.id}?type=GROUP&host=${encodeURIComponent(grp.host)}&title=${encodeURIComponent(grp.title)}`}
                className="w-full py-2 px-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium text-center tap-active transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <span>Join Session</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
