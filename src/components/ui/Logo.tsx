'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = 'w-7 h-7', size = 28 }: LogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-lg overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/logo.png"
        alt="pixelmink"
        className="w-full h-full object-contain invert brightness-100 contrast-150 transition-transform group-hover:scale-105"
      />
    </div>
  );
}
