import React from 'react';

// x1, x2, y, thickness. Still gold lines that suggest warp speed. They do not move (A74).
const STREAKS: ReadonlyArray<readonly [number, number, number, number]> = [
  [80, 220, 120, 2], [1120, 1310, 90, 2.5], [250, 390, 310, 1.5], [980, 1160, 280, 2],
  [120, 290, 540, 2], [1060, 1280, 590, 2.5], [420, 610, 790, 1.8],
];

export const HyperdriveStreaks: React.FC = () => (
  <g stroke="#FFD66B" strokeOpacity="0.45" strokeLinecap="round">
    {STREAKS.map(([x1, x2, y, w]) => (
      <line key={`${x1}-${y}`} x1={x1} y1={y} x2={x2} y2={y} strokeWidth={w} />
    ))}
  </g>
);
