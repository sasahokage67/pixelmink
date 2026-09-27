'use client';

import { useEffect, useRef, useState } from 'react';

// Keep a single audio sink outside responsive video layouts. A hidden desktop
// video and a mobile PiP must not play the same participant twice.
export default function CallAudio({ stream }: { stream: MediaStream | null }) {
  const element = useRef<HTMLAudioElement>(null);
  const [needsGesture, setNeedsGesture] = useState(false);

  useEffect(() => {
    const audio = element.current;
    if (!audio) return;
    let active = true;
    audio.srcObject = stream;
    setNeedsGesture(false);
    if (stream) {
      void audio.play().catch((err) => {
        if (active && err.name === 'NotAllowedError') setNeedsGesture(true);
      });
    }
    return () => {
      active = false;
      audio.pause();
      audio.srcObject = null;
    };
  }, [stream]);

  return <>
    <audio ref={element} autoPlay />
    {needsGesture && <button type="button"
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow-lg"
      onClick={() => { void element.current?.play().then(() => setNeedsGesture(false)).catch(() => setNeedsGesture(true)); }}>
      Включить звук собеседника
    </button>}
  </>;
}
