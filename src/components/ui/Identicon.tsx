'use client';

import React from 'react';

interface IdenticonProps {
  name?: string;
  size?: number;
  className?: string;
}

// Deterministic simple hash
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// GitHub-style dark tech palette (hues with good contrast on dark backgrounds)
const PALETTES = [
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#eab308', // yellow
];

export default function Identicon({ name = 'peer', size = 36, className = '' }: IdenticonProps) {
  const hash = hashCode(name);
  const color = PALETTES[hash % PALETTES.length];

  // 5x5 grid with horizontal symmetry: columns 0, 1, 2 determine columns 4, 3
  const grid: boolean[][] = [];
  for (let r = 0; r < 5; r++) {
    grid[r] = [];
    for (let c = 0; c < 3; c++) {
      const bitIndex = r * 3 + c;
      const isFilled = ((hash >> bitIndex) & 1) === 1 || ((hash >> (bitIndex + 4)) & 1) === 1;
      grid[r][c] = isFilled;
      grid[r][4 - c] = isFilled; // mirror horizontally
    }
  }

  const cellSize = 14;
  const padding = 7;
  const viewBoxSize = 5 * cellSize + padding * 2; // 84

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      className={`shrink-0 rounded bg-[#16161c] border border-white/[0.1] ${className}`}
      shapeRendering="crispEdges"
      aria-label={name}
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill="#141418" />
      {grid.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={padding + c * cellSize}
              y={padding + r * cellSize}
              width={cellSize}
              height={cellSize}
              fill={color}
            />
          ) : null
        )
      )}
    </svg>
  );
}
