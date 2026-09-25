'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, Clock, Video, CheckCircle2, ChevronLeft, ChevronRight, Plus, MapPin } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function CalendarPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [seminars, setSeminars] = useState<any[]>([]);
  const [availability, setAvailability] = useState('Mon, Wed, Fri 18:00 - 21:00 CET');
  const [isEditingAvail, setIsEditingAvail] = useState(false);
  const [availInput, setAvailInput] = useState(availability);

  useEffect(() => {
    async function loadData() {
      try {
        const [sessRes, semRes] = await Promise.all([
          fetch('/api/sessions'),
          fetch('/api/seminars'),
        ]);
        if (sessRes.ok) {
          const s = await sessRes.json();
          setSessions(s.sessions || []);
        }
        if (semRes.ok) {
          const sem = await semRes.json();
          setSeminars(sem.seminars || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
    if (user?.profile?.availability) {
      setAvailability(user.profile.availability);
      setAvailInput(user.profile.availability);
    }
  }, [user]);

  const handleSaveAvailability = async () => {
    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: availInput }),
      });
      setAvailability(availInput);
      setIsEditingAvail(false);
    } catch (err) {
      console.error(err);
    }
  };

  const days = [
    { day: 'Mon', date: '28', hasEvents: true },
    { day: 'Tue', date: '29', hasEvents: false },
    { day: 'Wed', date: '30', hasEvents: true, isToday: true },
    { day: 'Thu', date: '01', hasEvents: false },
    { day: 'Fri', date: '02', hasEvents: true },
    { day: 'Sat', date: '03', hasEvents: false },
    { day: 'Sun', date: '04', hasEvents: true },
  ];

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs mb-2">
            <CalendarIcon className="w-3.5 h-3.5" />
            Exchange Schedule & Availability
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Schedule & Time Slots
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Confirmed peer sessions, public seminars, and your recurring teaching availability windows.
          </p>
        </div>

        {/* Availability Setting Box (Requirement 28) */}
        <div className="drinkit-card p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase">My Weekly Availability</div>
            <div className="text-xs font-mono text-white font-semibold">{availability}</div>
          </div>
          <button
            onClick={() => setIsEditingAvail(!isEditingAvail)}
            className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 hover:text-white font-mono text-xs"
          >
            {isEditingAvail ? 'Close' : 'Edit Slots'}
          </button>
        </div>
      </div>

      {isEditingAvail && (
        <div className="drinkit-card p-4 flex gap-3 items-center">
          <input
            type="text"
            value={availInput}
            onChange={(e) => setAvailInput(e.target.value)}
            placeholder="e.g. Monday 18:00–21:00, Tuesday 17:00–20:00"
            className="flex-1 bg-[#18181f] border border-white/[0.08] focus:border-blue-500 rounded-full px-4 py-2 text-xs text-white outline-none font-mono"
          />
          <button
            onClick={handleSaveAvailability}
            className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold"
          >
            Save Availability
          </button>
        </div>
      )}

      {/* Week Ribbon Bar */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => (
          <div
            key={d.day}
            className={`p-3 rounded-xl border text-center font-mono space-y-1 transition-all ${
              d.isToday
                ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                : 'bg-[#111114] border-white/[0.04] text-zinc-400'
            }`}
          >
            <div className="text-[10px] text-zinc-500">{d.day}</div>
            <div className="text-lg font-bold text-white">{d.date}</div>
            {d.hasEvents && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mx-auto block" />
            )}
          </div>
        ))}
      </div>

      {/* Schedule Items Timeline */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white tracking-tight">
          Upcoming Scheduled Engagements
        </h2>

        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="drinkit-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                    1-on-1 Session ({s.format})
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {s.duration} Minutes
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white tracking-tight">{s.title}</h3>

                <div className="text-xs font-mono text-zinc-400 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    {new Date(s.scheduledAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>•</span>
                  <span>Partner: {s.teacherId === user?.id ? s.student?.profile?.name : s.teacher?.profile?.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/calls/${s.meetingLink || 'room_default'}`}
                  className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium tap-active transition-all"
                >
                  Join Video Room
                </Link>
              </div>
            </div>
          ))}

          {seminars.slice(0, 2).map((sem) => (
            <div
              key={sem.id}
              className="drinkit-card p-5 border-purple-500/30 bg-purple-950/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                    Massive Public Seminar
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">{sem.category}</span>
                </div>

                <h3 className="text-sm font-semibold text-white tracking-tight">{sem.title}</h3>

                <div className="text-xs font-mono text-zinc-400 flex items-center gap-3">
                  <span>{sem.date} at {sem.time}</span>
                  <span>•</span>
                  <span>Host: {sem.host?.profile?.name}</span>
                  <span>•</span>
                  <span>{sem.participantCount} Attending</span>
                </div>
              </div>

              <Link
                href={`/seminars/${sem.id}/live`}
                className="px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-medium tap-active transition-all"
              >
                Go to Seminar Room
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
