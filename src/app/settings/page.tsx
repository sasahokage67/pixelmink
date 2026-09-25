'use client';

import React, { useState } from 'react';
import { Settings, Shield, Bell, Key, Monitor, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [incomingCallAudio, setIncomingCallAudio] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in py-2">
      <div className="pb-6 border-b border-white/[0.08]">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Platform Settings
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Configure notifications, media stream devices and security preferences.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Settings saved successfully
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Notifications */}
        <div className="drinkit-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white tracking-tight">
            <Bell className="w-4 h-4 text-blue-400" />
            <span>Real-time Notification Preferences</span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <label className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/[0.04] cursor-pointer">
              <span className="text-zinc-300">Play Ringtone on Incoming WebRTC Calls</span>
              <input
                type="checkbox"
                checked={incomingCallAudio}
                onChange={(e) => setIncomingCallAudio(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/[0.04] cursor-pointer">
              <span className="text-zinc-300">Email Notifications for New Session Requests</span>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
            </label>
          </div>
        </div>

        {/* Audio / Video Devices */}
        <div className="drinkit-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white tracking-tight">
            <Monitor className="w-4 h-4 text-blue-400" />
            <span>WebRTC Audio & Camera Defaults</span>
          </div>

          <div className="space-y-3 text-xs font-mono text-zinc-400">
            <div>
              <label className="block mb-1">Default Camera Resolution</label>
              <select className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg p-2.5 text-white outline-none">
                <option>1080p Full HD (60fps)</option>
                <option>720p HD (Adaptive Bitrate)</option>
                <option>480p Low Bandwidth</option>
              </select>
            </div>

            <div>
              <label className="block mb-1">Audio Processing</label>
              <select className="w-full bg-[#18181f] border border-white/[0.08] rounded-lg p-2.5 text-white outline-none">
                <option>Echo Cancellation + Noise Suppression (WebRTC Default)</option>
                <option>Raw Studio Audio (No Compression)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold tap-active transition-all"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
